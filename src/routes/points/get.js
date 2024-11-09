const app = require("../../config/express");
const { logger, colorText } = require("../../config/logger");
const { PointModel } = require("../../db/models/PointModel");
const authRequest = require("../../middlewares/auth");
const { requireParamFields } = require("../../middlewares/fields");

/**
 * Эндпоинт для получения информации о точке по её айди
 * 
 * @route POST /v1/points/get
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware requireFields(['id']) - Мидлвэйр для проверки обязательных полей
 * 
 * @param {number} req.body.id - Айди точки
 * 
 * @param {Object} res - Объект ответа
 * 
 * @returns {Object} - JSON объект с данными точки
 */

app.get("/v1/points/get/:id", requireParamFields(['id']), async (req, res) => {
    try {
        const { id } = req.params;

        const point = await PointModel.findOne({ where: { id } })

        if (!point) {
            res.status(404).send({ error: "Point not found" })
        }

        return res.status(200).json({
            id: point.id,
            x: point.x,
            y: point.y,
            organid: point.organid,
            name: point.name,
            description: point.description
        })
    } catch (e) {
        logger.error(`Error while getting point by id: ${colorText(e.message, 'red')}`)
        res.status(500).send({ error: e.message });
    }
});

/**
 * Эндпоинт для получения всех точек по ID органа
 * 
 * @route POST /v1/points/get-by-organid
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware requireFields(['organid']) - Мидлвэйр для проверки обязательных полей
 * 
 * @param {number} req.body.organid - ID органа, для которого необходимо получить точки
 * 
 * @param {Object} res - Объект ответа
 * 
 * @returns {Object} - JSON массив объектов с данными точек
 */

app.get("/v1/points/get-by-organid/:organid", requireParamFields(['organid']), async (req, res) => {
    try {
        const { organid } = req.params;

        const points = await PointModel.findAll({ where: { organid } });

        if (points.length === 0) {
            return res.status(404).send({ error: "No points found for the specified organid" });
        }

        return res.status(200).json(points.map(point => ({
            id: point.id,
            x: point.x,
            y: point.y,
            organid: point.organid,
            name: point.name,
            description: point.description
        })));
    } catch (e) {
        logger.error(`Error while getting points by organ id: ${colorText(e.message, 'red')}`)
        res.status(500).send({ error: e.message });
    }
});