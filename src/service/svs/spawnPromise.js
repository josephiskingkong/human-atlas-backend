const { spawn } = require("child_process");

function spawnPromise(command, args) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args);
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            if (errorOutput.includes('WARNING')) {
                logger.warn(`vips warning: ${colorText(errorOutput, 'yellow')}`);
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