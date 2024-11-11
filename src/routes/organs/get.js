const app = require("../../config/express");
const { logger, colorText } = require("../../config/logger");
const { OrganModel } = require("../../db/models/OrganModel");
const { PointModel } = require("../../db/models/PointModel");
const authRequest = require("../../middlewares/auth");
const { requireParamFields } = require("../../middlewares/fields");

/**
 * Эндпоинт для получения информации о органе по его айди
 * 
 * @route POST /v1/organs/get
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware requireFields(['id']) - Мидлвэйр для проверки обязательных полей
 * 
 * @param {number} req.body.id - Айди органа
 * 
 * @param {Object} res - Объект ответа
 * 
 * @returns {Object} - JSON объект с данными органа
 */

app.get("/v1/organs/get/:id", requireParamFields(['id']), async (req, res) => {
    try {
        const { id } = req.params;

        const organ = await OrganModel.findOne({ where: { id } })

        if (!organ) {
            res.status(404).send({ error: "Organ not found" })
        }

        return res.status(200).json({
            id: organ.id,
            categoryid: organ.categoryid,
            name: organ.name,
            synonym: organ.synonym,
            mpp_x: organ.mpp_x,
            mpp_y: organ.mpp_y,
            width: organ.width,
            height: organ.height
        })
    } catch (e) {
        logger.error(`Error while getting organ by id: ${colorText(e.message, 'red')}`)
        res.status(500).send({ error: e.message });
    }
});

/**
 * Эндпоинт для получения всех органов по ID категории
 * 
 * @route POST /v1/organs/get-by-categoryid
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware requireFields(['categoryid']) - Мидлвэйр для проверки обязательных полей
 * 
 * @param {number} req.body.categoryid - ID категории, для которой необходимо получить органы
 * 
 * @param {Object} res - Объект ответа
 * 
 * @returns {Object} - JSON массив объектов с данными органов
 */

app.get("/v1/organs/get-by-categoryid/:categoryid", requireParamFields(['categoryid']),  async (req, res) => {
    try {
        const { categoryid } = req.params;

        const organs = await OrganModel.findAll({ where: { categoryid, status: "DONE" } });

        if (organs.length === 0) {
            return res.status(200).send([]);
        }

        return res.status(200).json(organs.map(organ => ({
            id: organ.id,
            categoryid: organ.categoryid,
            name: organ.name,
            synonym: organ.synonym,
            mpp_x: organ.mpp_x,
            mpp_y: organ.mpp_y,
            width: organ.width,
            height: organ.height
        })));
    } catch (e) {
        logger.error(`Error while getting organs by category id: ${colorText(e.message, 'red')}`)
        res.status(500).send({ error: e.message });
    }
});

/**
 * Эндпоинт для получения всех органов (ADMIN-PANEL)
 * 
 * @route POST /v1/organs/get-all
 * @middleware authRequest - Авторизационный мидлвэйр
 * 
 * @param {Object} res - Объект ответа
 * 
 * @returns {Object} - JSON массив объектов с данными органов
 */

app.get("/v1/organs/get-all/", authRequest, async (req, res) => {
    try {
        const organs = await OrganModel.findAll();

        if (organs.length === 0) {
            return res.status(200).send([]);
        }

        return res.status(200).json(organs.map(organ => ({
            id: organ.id,
            categoryid: organ.categoryid,
            name: organ.name,
            synonym: organ.synonym,
            mpp_x: organ.mpp_x,
            mpp_y: organ.mpp_y,
            width: organ.width,
            height: organ.height,
            status: organ.status
        })));
    } catch (e) {
        logger.error(`Error while getting organs: ${colorText(e.message, 'red')}`)
        res.status(500).send({ error: e.message });
    }
});