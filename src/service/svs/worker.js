const { parentPort, workerData } = require('worker_threads');
const { spawn } = require('child_process');
const { logger } = require('../../config/logger');

async function processSlide() {
    try {
        const { inputFile, outputDir, id } = workerData;
        
        // Запускаем vips напрямую через spawn
        const vips = spawn('vips', ['dzsave', inputFile, outputDir, 
                                    '--suffix', '.webp', 
                                    '--tile-size', '512', 
                                    '--overlap', '0']);
        
        // Не накапливаем stdout/stderr в памяти
        vips.stdout.on('data', () => {});
        vips.stderr.on('data', (data) => {
            // Логируем только критические ошибки, не храним весь вывод
            if (data.toString().includes('ERROR')) {
                logger.error(`VIPS error: ${data.toString().substring(0, 200)}`);
            }
        });
        
        // Простая обработка результата
        return new Promise((resolve, reject) => {
            vips.on('close', (code) => {
                if (code === 0) {
                    parentPort.postMessage({ status: 'success', id });
                    resolve();
                } else {
                    parentPort.postMessage({ 
                        status: 'error', 
                        error: `VIPS process exited with code ${code}` 
                    });
                    reject(new Error(`VIPS process exited with code ${code}`));
                }
            });
            
            vips.on('error', (err) => {
                parentPort.postMessage({ status: 'error', error: err.message });
                reject(err);
            });
        });
    } catch (error) {
        parentPort.postMessage({ status: 'error', error: error.message });
    }
}

processSlide();