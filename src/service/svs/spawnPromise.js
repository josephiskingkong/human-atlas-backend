const { spawn } = require("child_process");
const { logger, colorText } = require("../../config/logger");

function spawnPromise(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args);
        let stdout = '';
        let stderr = '';

        if (!options.ignoreStdout) {
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
        } else {
            process.stdout.on('data', () => {});
        }

        process.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            if (errorOutput.includes('WARNING')) {
                logger.warn(`${command} warning: ${colorText(errorOutput, 'yellow')}`);
            } else {
                stderr += errorOutput;
            }
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });
    });
}

module.exports = spawnPromise;