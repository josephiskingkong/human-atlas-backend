const spawnPromise = require("./spawnPromise");

async function getSvsMetadata(inputFile) {
    const command = 'vipsheader';
    const args = ['-a', inputFile];

    try {
        const output = await spawnPromise(command, args);

        const mppXMatch = output.match(/openslide\.mpp-x:\s*([\d.]+)/);
        const mppYMatch = output.match(/openslide\.mpp-y:\s*([\d.]+)/);
        const mppX = mppXMatch ? parseFloat(mppXMatch[1]) : null;
        const mppY = mppYMatch ? parseFloat(mppYMatch[1]) : null;
        
        const widthMatch = output.match(/width:\s*(\d+)/);
        const heightMatch = output.match(/height:\s*(\d+)/);
        const width = widthMatch ? parseInt(widthMatch[1], 10) : null;
        const height = heightMatch ? parseInt(heightMatch[1], 10) : null;

        return { mppX, mppY, width, height, rawOutput: output };
    } catch (error) {
        throw new Error(`Error extracting metadata: ${error}`);
    }
}

async function convertSvsToTiles(inputFile, outputDir) {
    const command = 'vips';
    const args = ['dzsave', inputFile, outputDir, '--suffix', '.png', '--tile-size', '512', '--overlap', '0'];
    await spawnPromise(command, args);
}

module.exports = { getSvsMetadata, convertSvsToTiles }