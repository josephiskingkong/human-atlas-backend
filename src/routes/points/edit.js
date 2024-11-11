const app = require("../../config/express");
const { colorText, logger } = require("../../config/logger");
const { PointModel } = require("../../db/models/PointModel");
const authRequest = require("../../middlewares/auth");
const { requireBodyFields } = require("../../middlewares/fields");

/**
 * Эндпоинт для редактирования существующей точки
 * 
 * @route POST /v1/points/edit
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware requireBodyFields(['id']) - Мидлвэйр для проверки обязательных полей
 * 
 * @param {number} req.body.id - ID точки, которую необходимо отредактировать
 * @param {number} [req.body.x] - Новая координата X точки (опционально)
 * @param {number} [req.body.y] - Новая координата Y точки (опционально)
 * @param {string} [req.body.name] - Новое название точки (опционально)
 * @param {string} [req.body.description] - Новое описание точки (опционально)
 * 
 * @param {Object} res - Объект ответа
 * 
 * @returns {Object} - JSON объект с сообщением об успешном редактировании и ID обновлённой точки
 */

app.post("/v1/points/edit", authRequest, requireBodyFields(['id']), async (req, res) => {
    try {
        const { id, x, y, name, description } = req.body;
        const body = { x, y, name, description };

        Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

        const [updatedRows] = await PointModel.update(body, { where: { id } });

        if (updatedRows === 0) {
            return res.status(404).json({ error: "Point not found or no changes applied" });
        }

        logger.info(`Point ${colorText('edited', 'green')}: ID=${id}`);

        return res.status(200).json({
            message: "success",
            point_id: id
        });
    } catch (e) {
        logger.error(`Error while editing point: ${colorText(e.message, 'red')}`);
        res.status(500).send({ error: e.message });
    }
});