const { parentPort, workerData } = require('worker_threads');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Импортируем необходимые модули
const spawnPromise = require('./spawnPromise');
const { logger } = require('../../config/logger');

// Функция для освобождения памяти
function forceGC() {
    if (global.gc) {
        global.gc();
        return true;
    }
    return false;
}

async function processSlide() {
    try {
        const { inputFile, outputDir, id } = workerData;
        
        logger.info(`Worker started processing slide ID=${id}`);
        
        // Вывод информации о доступной памяти
        const memInfo = process.memoryUsage();
        logger.info(`Worker memory usage before conversion: RSS=${Math.round(memInfo.rss / 1024 / 1024)}MB, Heap=${Math.round(memInfo.heapUsed / 1024 / 1024)}/${Math.round(memInfo.heapTotal / 1024 / 1024)}MB`);
        
        // Используем потоковую обработку для экономии памяти
        await spawnPromise('vips', 
            ['dzsave', inputFile, outputDir, '--suffix', '.webp', '--tile-size', '512', '--overlap', '0'], 
            { 
                ignoreStdout: true,
                // Для крупных выходных данных используем файловое хранилище
                useFileBuffer: false
            }
        );
        
        // Попытка освободить память после обработки
        if (forceGC()) {
            logger.info(`Forced garbage collection after processing slide ID=${id}`);
        }
        
        const memInfoAfter = process.memoryUsage();
        logger.info(`Worker memory usage after conversion: RSS=${Math.round(memInfoAfter.rss / 1024 / 1024)}MB, Heap=${Math.round(memInfoAfter.heapUsed / 1024 / 1024)}/${Math.round(memInfoAfter.heapTotal / 1024 / 1024)}MB`);
        
        logger.info(`Worker finished processing slide ID=${id}`);
        parentPort.postMessage({ status: 'success', id });
    } catch (error) {
        logger.error(`Worker error processing slide: ${error.message}`);
        parentPort.postMessage({ status: 'error', error: error.message });
    }
}

processSlide();