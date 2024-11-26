const app = require("../../config/express");
const { colorText, logger } = require("../../config/logger");
const { PointModel } = require("../../db/models/PointModel");
const { requireBodyFields } = require("../../middlewares/fields");
const { authenticateToken } = require("../users/auth");

/**
 * Эндпоинт для добавления новой точки
 * 
 * @route POST /v1/points/add
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware requireFields(['x', 'y', 'organid', 'name', 'description']) - Мидлвэйр для проверки обязательных полей
 * 
 * @param {number} req.body.x - Координата X точки
 * @param {number} req.body.y - Координата Y точки
 * @param {number} req.body.organid - ID органа, связанного с точкой
 * @param {string} req.body.name - Название точки
 * @param {string} req.body.description - Описание точки
 * 
 * @param {Object} res - Объект ответа
 * 
 * @returns {Object} - JSON объект с сообщением об успешном добавлении и ID новой точки
 */

app.post("/v1/points/add", authenticateToken, requireBodyFields(['x', 'y', 'organid', 'name', 'description']), async (req, res) => {
    try {
        const { x, y, organid, name, description } = req.body;

        const point = await PointModel.create({ x, y, organid, name, description })

        logger.info(`Point ${colorText('created', 'green')}: ID=${point.id}, x=${x}, y=${y}, organid=${organid}, name="${name}"`);

        return res.status(200).json({
            message: "success",
            point_id: point.id
        })
    } catch (e) {
        logger.error(`Error while adding new point: ${colorText(e.message, 'red')}`)
        res.status(500).send({ error: e.message });
    }
});