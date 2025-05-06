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

// Добавляем глобальную обработку необработанных исключений
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}\nStack: ${err.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled promise rejection: ${reason}\nPromise: ${JSON.stringify(promise)}`);
});

// Ограничение на количество одновременных конвертаций
const MAX_CONCURRENT_CONVERSIONS = 1; // Снижаем до 1, чтобы уменьшить нагрузку на память
let currentConversions = 0;
const conversionQueue = [];

// Функция для запуска воркера
function runTileConversion(inputFile, outputDir, organId) {
  return new Promise((resolve, reject) => {
    try {
      logger.info(`Starting worker for organ ID=${organId}`);
      
      const worker = new Worker(path.join(__dirname, '../../service/svs/worker.js'), {
        workerData: { inputFile, outputDir, id: organId }
      });

      worker.on('message', (message) => {
        try {
          logger.info(`Worker message for organ ID=${organId}: ${JSON.stringify(message)}`);
          if (message.status === 'success') {
            resolve();
          } else {
            reject(new Error(message.error || 'Unknown worker error'));
          }
        } catch (err) {
          logger.error(`Error handling worker message for organ ID=${organId}: ${err.message}`);
          reject(err);
        }
      });

      worker.on('error', (err) => {
        logger.error(`Worker error for organ ID=${organId}: ${err.message}`);
        reject(err);
      });

      worker.on('exit', (code) => {
        logger.info(`Worker exited with code ${code} for organ ID=${organId}`);
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
        
        // Запускаем следующий воркер из очереди после завершения текущего
        currentConversions--;
        processQueue();
      });
    } catch (err) {
      logger.error(`Error creating worker for organ ID=${organId}: ${err.message}`);
      reject(err);
    }
  });
}

// Функция для обработки очереди конвертаций
function processQueue() {
  try {
    if (conversionQueue.length === 0 || currentConversions >= MAX_CONCURRENT_CONVERSIONS) {
      return;
    }
    
    const nextTask = conversionQueue.shift();
    currentConversions++;
    
    logger.info(`Processing next task from queue: organ ID=${nextTask.organId}, queue size=${conversionQueue.length}`);
    
    runTileConversion(nextTask.inputFile, nextTask.outputDir, nextTask.organId)
      .then(() => {
        nextTask.resolve();
      })
      .catch((err) => {
        logger.error(`Task failed for organ ID=${nextTask.organId}: ${err.message}`);
        nextTask.reject(err);
      });
  } catch (err) {
    logger.error(`Error in processQueue: ${err.message}`);
  }
}

// Функция для добавления задания в очередь
function queueTileConversion(inputFile, outputDir, organId) {
  return new Promise((resolve, reject) => {
    logger.info(`Adding task to queue: organ ID=${organId}, current queue size=${conversionQueue.length}`);
    conversionQueue.push({ inputFile, outputDir, organId, resolve, reject });
    processQueue();
  });
}

// Настройка multer с лучшей обработкой ошибок
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../public/organs');
    // Убедиться, что директория существует
    fs.mkdir(dir, { recursive: true })
      .then(() => cb(null, dir))
      .catch(err => cb(err));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
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
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        logger.error(`File upload error: ${err.message}`);
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    let targetPath = null;
    try {
      const { name, categoryid } = req.body;
      const file = req.file;

      if (!name || !categoryid || !file) {
        logger.warn("Missing required fields: name, categoryid, or file");
        return res.status(400).send({ error: "Missing required fields: name, categoryid, or file" });
      }

      const synonym = transliterate(name, { lowercase: true, separator: '_' }).replace(/[^a-z0-9_]/g, '');
      const targetDir = path.join(__dirname, '../../public/organs');
      targetPath = path.join(targetDir, `${synonym}.svs`);
      
      logger.info(`Processing file: ${file.path} -> ${targetPath}`);
      
      // Проверка существования файла более корректно обрабатывается
      try {
        await fs.access(targetPath);
        logger.warn(`File already exists at ${targetPath}. Consider a different name or handling duplicates.`);
      } catch (error) {
        // Файл не существует, это нормально
        logger.info(`Target file ${targetPath} does not exist yet, which is expected`);
      }

      await fs.mkdir(targetDir, { recursive: true });
      await fs.rename(file.path, targetPath);
      logger.info(`File renamed from ${file.path} to ${targetPath}`);

      const organ = await OrganModel.create({ name, categoryid, synonym, status: 'PROCESSING' });
      logger.info(`Organ record created in database, ID=${organ.id}`);

      res.status(201).json({ message: "success", organ_id: organ.id, name: organ.name, status: organ.status });

      // Асинхронная обработка файла
      // Вызываем processOrgan как отдельную функцию вместо анонимной
      processOrgan(organ, name, targetPath).catch(err => {
        logger.error(`Critical error in processing organ: ${err.message}\nStack: ${err.stack}`);
      });
    } catch (e) {
      logger.error(`Server error: ${colorText(e.message, 'red')}\nStack: ${e.stack}`);
      // В случае ошибки попытаться удалить временные файлы
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkErr) {
          logger.warn(`Failed to delete temporary file: ${unlinkErr.message}`);
        }
      }
      return res.status(500).send({ error: "An internal server error occurred" });
    }
  }
);

// Выносим обработку органа в отдельную функцию для лучшей структуры кода
async function processOrgan(organ, name, targetPath) {
  try {
    logger.info(`Starting asynchronous organ processing: ID=${organ.id}, name="${name}"`);
    logger.info(`Organ ${colorText('processing', 'yellow')}: ID=${organ.id}, name="${name}"`);
    
    // Получение метаданных - небольшая операция, можно оставить в основном потоке
    const metadata = await getSvsMetadata(targetPath);
    logger.info(`Metadata extracted for organ ID=${organ.id}: ${JSON.stringify(metadata)}`);

    await OrganModel.update(
      { mpp_x: metadata.mppX, mpp_y: metadata.mppY, width: metadata.width, height: metadata.height },
      { where: { id: organ.id } }
    );
    logger.info(`Metadata updated in database for organ ID=${organ.id}`);

    const organTilesDir = `/var/www/human-atlas-tiles/tiles/${organ.id}`;
    await fs.mkdir(organTilesDir, { recursive: true });
    logger.info(`Directory created at ${organTilesDir}`);

    // Запускаем конвертацию в отдельном воркере
    logger.info(`Queuing tile conversion for organ ID=${organ.id}`);
    await queueTileConversion(targetPath, `${organTilesDir}/${organ.id}`, organ.id);
    logger.info(`Tile conversion completed for organ ID=${organ.id}`);

    await OrganModel.update({ status: 'DONE' }, { where: { id: organ.id } });
    logger.info(`Status updated to DONE for organ ID=${organ.id}`);

    // Используем промисы вместо колбэка для удаления файла
    try {
      await fs.unlink(targetPath);
      logger.info(`Original file ${targetPath} deleted successfully`);
    } catch (err) {
      logger.warn(`Failed to delete the file: ${targetPath} - ${err.message}`);
    }
    
    logger.info(`Organ ${colorText('processed', 'green')}: ID=${organ.id}, name="${name}"`);
  } catch (error) {
    logger.error(`Error processing organ ID=${organ.id}: ${colorText(error.message, 'red')}\nStack: ${error.stack}`);
    // В случае ошибки в обработке, установить статус в ERROR
    try {
      await OrganModel.update({ status: 'ERROR' }, { where: { id: organ.id } });
      logger.info(`Status updated to ERROR for organ ID=${organ.id}`);
    } catch (updateError) {
      logger.error(`Failed to update status to ERROR: ${updateError.message}`);
    }
  }
}

module.exports = { queueTileConversion }; // Экспортируем для возможного использования в других модулях