const multer = require('multer');
const path = require('path');
const transliterate = require('transliteration').slugify;
const { OrganModel } = require('../../db/models/OrganModel');
const app = require('../../config/express');
const authRequest = require('../../middlewares/auth');
const { logger, colorText } = require('../../config/logger');
const { getSvsMetadata } = require('../../service/svs/svs');
const cors = require('cors');
const { Worker } = require('worker_threads');
const fs = require('fs').promises;

const upload = multer({
    dest: path.join(__dirname, '../../public/organs/temp'),
    limits: {
        fileSize: 4 * 1024 * 1024 * 1024 // 4GB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/openslide' || ['.png', '.jpeg', '.jpg', '.svs'].includes(path.extname(file.originalname).toLowerCase())) {
            cb(null, true);
        } else {
            cb(new Error('Only .svs, .png, .jpeg, .jpg files are allowed'));
        }
    }
});

const processingQueue = [];
let isProcessing = false;

// Функция для обработки очереди
async function processNextInQueue() {
    if (isProcessing || processingQueue.length === 0) {
        return;
    }
    
    isProcessing = true;
    const task = processingQueue.shift();
    
    try {
        await processOrgan(task.organ, task.name, task.targetPath);
    } catch (error) {
        logger.error(`Error processing queue item: ${error.message}`);
    } finally {
        isProcessing = false;
        // Проверяем следующую задачу в очереди
        if (processingQueue.length > 0) {
            processNextInQueue();
        }
    }
}

// Обработка органа
async function processOrgan(organ, name, targetPath) {
    try {
        logger.info(`Organ ${colorText('processing', 'yellow')}: ID=${organ.id}, name="${name}"`);
        const metadata = await getSvsMetadata(targetPath);
        
        await OrganModel.update(
            { mpp_x: metadata.mppX, mpp_y: metadata.mppY, width: metadata.width, height: metadata.height },
            { where: { id: organ.id } }
        );
        
        const organTilesDir = `/var/www/human-atlas-tiles/tiles/${organ.id}`;
        await fs.mkdir(organTilesDir, { recursive: true });
        
        // Используем отдельный процесс для конвертации
        await convertSvsToTilesExternal(targetPath, `${organTilesDir}/${organ.id}`, organ.id);
        
        await OrganModel.update({ status: 'DONE' }, { where: { id: organ.id } });
        
        try {
            await fs.unlink(targetPath);
        } catch (err) {
            logger.warn(`Failed to delete the file: ${targetPath} - ${err.message}`);
        }
        
        logger.info(`Organ ${colorText('processed', 'green')}: ID=${organ.id}, name="${name}"`);
        
        // Явный вызов сборщика мусора если возможно
        if (global.gc) {
            global.gc();
        }
    } catch (error) {
        logger.error(`Error processing organ ID=${organ.id}: ${colorText(error.message, 'red')}`);
        await OrganModel.update({ status: 'ERROR' }, { where: { id: organ.id } });
        throw error;
    }
}

// Конвертация SVS файлов во внешнем процессе
function convertSvsToTilesExternal(inputFile, outputDir, organId) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(`
            const { spawn } = require('child_process');
            const { parentPort, workerData } = require('worker_threads');
            
            const process = spawn('vips', ['dzsave', workerData.inputFile, workerData.outputDir, 
                '--suffix', '.webp', '--tile-size', '512', '--overlap', '0']);
                
            // Не накапливаем stdout данные
            process.stdout.on('data', () => {});
            
            process.stderr.on('data', (data) => {
                parentPort.postMessage({ type: 'log', level: 'warn', message: data.toString() });
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    parentPort.postMessage({ type: 'success' });
                } else {
                    parentPort.postMessage({ type: 'error', message: \`Process exited with code \${code}\` });
                }
            });
            
            process.on('error', (err) => {
                parentPort.postMessage({ type: 'error', message: err.message });
            });
        `, { eval: true, workerData: { inputFile, outputDir } });
        
        worker.on('message', (message) => {
            if (message.type === 'log') {
                logger[message.level](`Worker for organ ID=${organId}: ${message.message}`);
            } else if (message.type === 'success') {
                resolve();
            } else if (message.type === 'error') {
                reject(new Error(message.message));
            }
        });
        
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                reject(new Error(`Worker exited with code ${code}`));
            }
        });
    });
}

// Используем явную обработку каждого вида запроса отдельно
app.post("/v1/organs/add", cors(), authRequest, (req, res) => {
    // Явно вызываем multer.single для обработки файлов
    upload.single('file')(req, res, async (err) => {
        if (err) {
            logger.error(`Upload error: ${err.message}`);
            return res.status(400).send({ error: err.message });
        }
        
        try {
            const { name, categoryid } = req.body;
            const file = req.file;

            if (!name || !categoryid || !file) {
                logger.warn("Missing required fields: name, categoryid, or file");
                return res.status(400).send({ error: "Missing required fields: name, categoryid, or file" });
            }

            const synonym = transliterate(name, { lowercase: true, separator: '_' }).replace(/[^a-z0-9_]/g, '');
            const targetDir = path.join(__dirname, '../../public/organs');
            const targetPath = path.join(targetDir, `${synonym}.svs`);
            
            await fs.mkdir(targetDir, { recursive: true });
            await fs.rename(file.path, targetPath);

            const organ = await OrganModel.create({ name, categoryid, synonym, status: 'PROCESSING' });

            res.status(201).json({ message: "success", organ_id: organ.id });

            processingQueue.push({ organ, name, targetPath });
            processNextInQueue();
        } catch (e) {
            logger.error(`Server error: ${colorText(e.message, 'red')}`);
            return res.status(500).send({ error: "An internal server error occurred" });
        }
    });
});