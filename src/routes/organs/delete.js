const multer = require('multer');
const path = require('path');
const transliterate = require('transliteration').slugify;
const fs = require('fs');
const { spawn } = require('child_process');
const { OrganModel } = require('../../db/models/OrganModel');
const app = require('../../config/express');
const authRequest = require('../../middlewares/auth');
const { logger, colorText } = require('../../config/logger');
const { convertSvsToTiles, getSvsMetadata } = require('../../service/svs/svs');
const cors = require('cors');
const { requireBodyFields } = require('../../middlewares/fields');

/**
 * Эндпоинт для удаления органа по его ID
 * 
 * @route POST /v1/organs/add
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware requireBodyFields['id'] - Мидлвэйр для проверки обязательных полей
 * 
 * @param {string} req.body.id - ID органа
 * 
 * @returns {Object} - JSON объект с сообщением об успешном удалении органа
 */

app.delete("/v1/organs/delete", requireBodyFields['id'], authRequest, async (req, res) => {
    try {
        const { id } = req.body;
        const path = `/var/www/human-atlas-tiles/tiles/${id}`;

        await fs.promises.rm(path, { recursive: true, force: true });

        await OrganModel.destroy({ where: { id } })

        res.status(200).send({ message: "success" });
    } catch (e) {
        logger.error(`Server error: ${colorText(e.message, 'red')}`);
        return res.status(400).send({ error: "Bad request" });
    }
});