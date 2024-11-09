const app = require("../../config/express");
const { logger, colorText } = require("../../config/logger");
const { PointModel } = require("../../db/models/PointModel");
const authRequest = require("../../middlewares/auth");
const { requireBodyFields } = require("../../middlewares/fields");

/**
 * Эндпоинт для удаления точки по её айди
 * 
 * @route DELETE /v1/points/delete
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware requireFields(['id']) - Мидлвэйр для проверки обязательных полей
 * 
 * @param {number} req.body.id - Айди точки, которую необходимо удалить
 * 
 * @param {Object} res - Объект ответа
 * 
 * @returns {Object} - JSON объект с сообщением об успешном удалении или ошибкой
 */

app.delete("/v1/points/delete", authRequest, requireBodyFields(['id']), async (req, res) => {
    try {
        const { id } = req.body;

        const point = await PointModel.findOne({ where: { id } });

        if (!point) {
            return res.status(404).send({ error: "Point not found" });
        }

        await PointModel.destroy({ where: { id } });

        logger.info(`Point ${colorText('removed', 'red')}: ID=${id}"`);

        return res.status(200).json({ message: "success" });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});