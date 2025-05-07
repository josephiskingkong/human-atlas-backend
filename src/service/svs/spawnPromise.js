const { spawn } = require("child_process");
const { logger, colorText } = require("../../config/logger");

function spawnPromise(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args);
        let stdout = '';
        let stderr = '';

        if (options.ignoreStdout) {
            process.stdout.resume();
        } else {
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
        }

        process.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            if (errorOutput.includes('WARNING')) {
                logger.warn(`${command} warning: ${colorText(errorOutput.substring(0, 200) + (errorOutput.length > 200 ? '...' : ''), 'yellow')}`);
            } else {
                if (stderr.length < 10000) { 
                    stderr += errorOutput;
                }
            }
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr.substring(0, 1000)}`));
            }
        });
    });
}

module.exports = spawnPromise;