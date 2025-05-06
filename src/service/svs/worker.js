const { parentPort, workerData } = require('worker_threads');
const { spawn } = require('child_process');
const path = require('path');

// Импортируем spawnPromise из существующего файла
const spawnPromise = require('./spawnPromise');
const { logger } = require('../../config/logger');

async function processSlide() {
    try {
        const { inputFile, outputDir, id } = workerData;
        
        logger.info(`Worker started processing slide ID=${id} from ${inputFile} to ${outputDir}`);
        
        // Конвертация в тайлы (без захвата stdout для экономии памяти)
        await spawnPromise('vips', 
            ['dzsave', inputFile, outputDir, '--suffix', '.webp', '--tile-size', '512', '--overlap', '0'], 
            { ignoreStdout: true }
        );
        
        logger.info(`Worker finished processing slide ID=${id}`);
        parentPort.postMessage({ status: 'success', id });
    } catch (error) {
        logger.error(`Worker error processing slide: ${error.message}`);
        parentPort.postMessage({ status: 'error', error: error.message });
    }
}

processSlide();