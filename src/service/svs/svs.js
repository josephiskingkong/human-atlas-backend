const spawnPromise = require("./spawnPromise");
const { logger } = require("../../config/logger");

async function getSvsMetadata(inputFile) {
    const command = 'vipsheader';

    async function getField(field) {
        try {
            // Вызываем spawnPromise без опции ignoreStdout, так как нам нужен вывод
            const output = await spawnPromise(command, ['-f', field, inputFile]);
            return output.trim();
        } catch (error) {
            logger.warn(`Could not retrieve field ${field} for ${inputFile}: ${error.message}`);
            return null;
        }
    }

    try {
        const mppXStr = await getField('openslide.mpp-x');
        const mppYStr = await getField('openslide.mpp-y');
        const widthStr = await getField('width');
        const heightStr = await getField('height');

        const mppX = mppXStr ? parseFloat(mppXStr) : null;
        const mppY = mppYStr ? parseFloat(mppYStr) : null;
        const width = widthStr ? parseInt(widthStr, 10) : null;
        const height = heightStr ? parseInt(heightStr, 10) : null;
        
        return { mppX, mppY, width, height };
    } catch (error) {
        throw new Error(`Error extracting metadata for ${inputFile}: ${error}`);
    }
}

module.exports = { getSvsMetadata };