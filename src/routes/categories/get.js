const app = require("../../config/express");
const { logger, colorText } = require("../../config/logger");
const { CategoryModel } = require("../../db/models/CategoryModel");
const { requireParamFields } = require("../../middlewares/fields");

/**
 * Эндпоинт для получения списка главных категорий
 * 
 * @route POST /v1/categories/get-mains/
 * 
 * @param {Object} res - Объект ответа
 * 
 * @returns {Object} - Массив JSON объектов с данными о категориях
 */

app.get("/v1/categories/get-mains/", async (req, res) => {
    try {
        const categories = await CategoryModel.findAll({ where: { categoryid: null } })

        if (categories.length === 0) {
            return res.status(404).send({ error: "Categories not found" })
        }

        return res.status(200).json(
            categories.map(category => ({
                id: category.id,
                name: category.name,
            }))
        )
    } catch (e) {
        logger.error(`Error while getting categories: ${colorText(e.message, 'red')}`)
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

app.get("/v1/categories/get-by-categoryid/:categoryid", requireParamFields(['categoryid']), async (req, res) => {
    try {
        const { categoryid } = req.params;

        const categories = await CategoryModel.findAll({ where: { categoryid }, order: [['id', 'ASC']] });

        if (categories.length === 0) {
            return res.status(200).send([]);
        }

        return res.status(200).json(categories.map(category => ({
            id: category.id,
            name: category.name,
            categoryid: category.categoryid
        })));
    } catch (e) {
        logger.error(`Error while getting categories by category id: ${colorText(e.message, 'red')}`)
        res.status(500).send({ error: e.message });
    }
});