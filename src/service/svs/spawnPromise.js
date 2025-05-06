const { spawn } = require("child_process");
const { logger, colorText } = require("../../config/logger");
const stream = require('stream');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Создает функцию для выполнения команды и обработки её вывода
 * @param {string} command - Команда для выполнения
 * @param {string[]} args - Аргументы командной строки
 * @param {Object} options - Дополнительные опции
 * @returns {Promise<string>} - Промис с результатом выполнения команды
 */
function spawnPromise(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const maxBuffer = options.maxBuffer || 10 * 1024 * 1024; // 10MB по умолчанию
        const childOptions = {};
        let stdout = '';
        let stderr = '';
        let stdoutFile = null;
        let stdoutStream = null;
        let killed = false;
        
        // Если ожидается большой вывод и его нужно сохранить, используем файл для временного хранения
        if (options.useFileBuffer) {
            stdoutFile = path.join(os.tmpdir(), `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.tmp`);
            stdoutStream = fs.createWriteStream(stdoutFile);
        }

        const proc = spawn(command, args, childOptions);

        // Обработка stdout
        if (!options.ignoreStdout) {
            if (stdoutStream) {
                // Используем поток для записи в файл
                proc.stdout.pipe(stdoutStream);
            } else {
                // Сохраняем данные в памяти с ограничением
                let stdoutSize = 0;
                proc.stdout.on('data', (data) => {
                    stdoutSize += data.length;
                    if (stdoutSize > maxBuffer) {
                        if (!killed) {
                            killed = true;
                            proc.kill();
                            reject(new Error(`Command ${command} exceeded stdout buffer limit of ${maxBuffer} bytes`));
                        }
                        return;
                    }
                    stdout += data.toString();
                });
            }
        } else {
            // Просто потребляем данные без хранения
            proc.stdout.resume();
        }

        // Обработка stderr с ограничением размера
        let stderrSize = 0;
        proc.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            stderrSize += data.length;
            
            if (stderrSize > maxBuffer) {
                if (!killed) {
                    killed = true;
                    proc.kill();
                    reject(new Error(`Command ${command} exceeded stderr buffer limit of ${maxBuffer} bytes`));
                }
                return;
            }

            if (errorOutput.includes('WARNING')) {
                logger.warn(`${command} warning: ${colorText(errorOutput.substring(0, 200) + (errorOutput.length > 200 ? '...' : ''), 'yellow')}`);
            } else {
                stderr += errorOutput;
            }
        });

        proc.on('error', (err) => {
            if (!killed) {
                cleanupAndReject(err);
            }
        });

        proc.on('close', (code) => {
            if (killed) return;

            if (code === 0) {
                if (stdoutStream) {
                    // Закрываем поток записи и читаем из файла если нужно
                    stdoutStream.end(() => {
                        if (options.returnOutput) {
                            fs.readFile(stdoutFile, 'utf8', (err, data) => {
                                if (err) {
                                    cleanupAndReject(err);
                                } else {
                                    cleanupAndResolve(data);
                                }
                            });
                        } else {
                            cleanupAndResolve(stdoutFile);
                        }
                    });
                } else {
                    cleanupAndResolve(stdout);
                }
            } else {
                // Ограничиваем размер сообщения об ошибке
                const errorMsg = stderr.length > 1000 ? stderr.substring(0, 1000) + '...' : stderr;
                cleanupAndReject(new Error(`Command failed with code ${code}: ${errorMsg}`));
            }
        });

        // Функция очистки и разрешения промиса
        function cleanupAndResolve(result) {
            if (stdoutFile && !options.returnOutput) {
                // Если нам нужно только имя файла, возвращаем его
                resolve(result);
            } else if (stdoutFile) {
                // Иначе удаляем временный файл
                fs.unlink(stdoutFile, (err) => {
                    if (err) logger.warn(`Failed to remove temp file ${stdoutFile}: ${err.message}`);
                    resolve(result);
                });
            } else {
                resolve(result);
            }
        }

        // Функция очистки и отклонения промиса
        function cleanupAndReject(error) {
            if (stdoutFile) {
                fs.unlink(stdoutFile, (err) => {
                    if (err) logger.warn(`Failed to remove temp file ${stdoutFile}: ${err.message}`);
                    reject(error);
                });
            } else {
                reject(error);
            }
        }
    });
}

module.exports = spawnPromise;