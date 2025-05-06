const { spawn } = require("child_process");
const { logger, colorText } = require("../../config/logger");

function spawnPromise(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        // Опции для ограничения потребления памяти
        const maxBuffer = options.maxBuffer || 10 * 1024 * 1024; // 10MB по умолчанию
        const childOptions = {
            // Ограничение максимального размера буфера
            maxBuffer: maxBuffer
        };

        const process = spawn(command, args, childOptions);
        let stdout = '';
        let stderr = '';
        let stdoutSize = 0;
        let stderrSize = 0;
        let killed = false;

        // Более эффективная обработка stdout
        if (!options.ignoreStdout) {
            process.stdout.on('data', (data) => {
                // Отслеживаем размер вывода
                stdoutSize += data.length;
                if (stdoutSize > maxBuffer) {
                    killed = true;
                    process.kill();
                    reject(new Error(`Command ${command} exceeded stdout buffer limit of ${maxBuffer} bytes`));
                    return;
                }
                stdout += data.toString();
            });
        } else {
            // Просто игнорируем вывод без его накопления
            process.stdout.resume(); // Это предотвращает блокировку потока вывода
        }

        // Более эффективная обработка stderr
        process.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            stderrSize += data.length;
            
            // Проверяем размер накопленных ошибок
            if (stderrSize > maxBuffer) {
                killed = true;
                process.kill();
                reject(new Error(`Command ${command} exceeded stderr buffer limit of ${maxBuffer} bytes`));
                return;
            }

            if (errorOutput.includes('WARNING')) {
                logger.warn(`${command} warning: ${colorText(errorOutput.substring(0, 200) + (errorOutput.length > 200 ? '...' : ''), 'yellow')}`);
            } else {
                stderr += errorOutput;
            }
        });

        process.on('error', (err) => {
            if (!killed) {
                reject(err);
            }
        });

        process.on('close', (code) => {
            if (!killed) {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    // Ограничиваем размер сообщения об ошибке
                    const errorMsg = stderr.length > 1000 ? stderr.substring(0, 1000) + '...' : stderr;
                    reject(new Error(`Command failed with code ${code}: ${errorMsg}`));
                }
            }
        });
    });
}

module.exports = spawnPromise;