const { spawn } = require("child_process");
const { logger } = require("../../config/logger");

function spawnPromise(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        // Упрощаем процесс - только минимально необходимый код
        const process = spawn(command, args);
        let stdout = '';
        let stderr = '';

        // Используем опцию ignoreStdout для экономии памяти
        if (!options.ignoreStdout) {
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
        } else {
            process.stdout.resume(); // Только прочитать и сбросить поток
        }

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                // Ограничиваем размер сообщения об ошибке
                const errorMsg = stderr.length > 500 ? stderr.substring(0, 500) + '...' : stderr;
                reject(new Error(`Command failed with code ${code}: ${errorMsg}`));
            }
        });
    });
}

module.exports = spawnPromise;