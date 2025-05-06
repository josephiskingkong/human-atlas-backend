const multer = require('multer');
const path = require('path');
const transliterate = require('transliteration').slugify;
const fs = require('fs').promises;
const express = require('express');
const { Worker } = require('worker_threads');
const { OrganModel } = require('../../db/models/OrganModel');
const app = require('../../config/express');
const { logger, colorText } = require('../../config/logger');
const { getSvsMetadata } = require('../../service/svs/svs');
const { authenticateToken } = require('../users/auth');

// Ограничение на количество одновременных конвертаций
const MAX_CONCURRENT_CONVERSIONS = 2;
let currentConversions = 0;
const conversionQueue = [];

// Функция для запуска воркера
function runTileConversion(inputFile, outputDir, organId) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, '../../service/svs/worker.js'), {
      workerData: { inputFile, outputDir, id: organId }
    });

    worker.on('message', (message) => {
      if (message.status === 'success') {
        resolve();
      } else {
        reject(new Error(message.error));
      }
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
      
      // Запускаем следующий воркер из очереди после завершения текущего
      currentConversions--;
      processQueue();
    });
  });
}

// Функция для обработки очереди конвертаций
function processQueue() {
  if (conversionQueue.length === 0 || currentConversions >= MAX_CONCURRENT_CONVERSIONS) {
    return;
  }
  
  const nextTask = conversionQueue.shift();
  currentConversions++;
  
  runTileConversion(nextTask.inputFile, nextTask.outputDir, nextTask.organId)
    .then(() => {
      nextTask.resolve();
    })
    .catch((err) => {
      nextTask.reject(err);
    });
}

// Функция для добавления задания в очередь
function queueTileConversion(inputFile, outputDir, organId) {
  return new Promise((resolve, reject) => {
    conversionQueue.push({ inputFile, outputDir, organId, resolve, reject });
    processQueue();
  });
}

const upload = multer({
  dest: '../../public/organs',
  limits: { fileSize: 4 * 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.svs') {
      cb(null, true);
    } else {
      cb(new Error('Only .svs files are allowed'), false);
    }
  }
});

app.post(
  "/v1/organs/add",
  authenticateToken,
  upload.single('file'),
  async (req, res) => {
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
      
      // Проверка существования файла более корректно обрабатывается
      try {
        await fs.access(targetPath);
        logger.warn(`File already exists at ${targetPath}. Consider a different name or handling duplicates.`);
      } catch (error) {
        // Файл не существует, это нормально
      }

      await fs.mkdir(targetDir, { recursive: true });
      await fs.rename(file.path, targetPath);

      const organ = await OrganModel.create({ name, categoryid, synonym, status: 'PROCESSING' });

      res.status(201).json({ message: "success", organ_id: organ.id, name: organ.name, status: organ.status });

      // Асинхронная обработка файла
      (async () => {
        try {
          logger.info(`Organ ${colorText('processing', 'yellow')}: ID=${organ.id}, name="${name}"`);
          
          // Получение метаданных - небольшая операция, можно оставить в основном потоке
          const metadata = await getSvsMetadata(targetPath);

          await OrganModel.update(
            { mpp_x: metadata.mppX, mpp_y: metadata.mppY, width: metadata.width, height: metadata.height },
            { where: { id: organ.id } }
          );

          const organTilesDir = `/var/www/human-atlas-tiles/tiles/${organ.id}`;
          await fs.mkdir(organTilesDir, { recursive: true });

          // Запускаем конвертацию в отдельном воркере
          await queueTileConversion(targetPath, `${organTilesDir}/${organ.id}`, organ.id);

          await OrganModel.update({ status: 'DONE' }, { where: { id: organ.id } });

          // Используем промисы вместо колбэка для удаления файла
          try {
            await fs.unlink(targetPath);
          } catch (err) {
            logger.warn(`Failed to delete the file: ${targetPath} - ${err.message}`);
          }
          
          logger.info(`Organ ${colorText('processed', 'green')}: ID=${organ.id}, name="${name}"`);
        } catch (error) {
          logger.error(`Error processing organ ID=${organ.id}: ${colorText(error.message, 'red')}`);
          await OrganModel.update({ status: 'ERROR' }, { where: { id: organ.id } });
        }
      })();
    } catch (e) {
      logger.error(`Server error: ${colorText(e.message, 'red')}`);
      return res.status(500).send({ error: "An internal server error occurred" });
    }
  }
);