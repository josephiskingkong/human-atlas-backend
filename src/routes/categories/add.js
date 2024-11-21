const app = require("../../config/express");
const { colorText, logger } = require("../../config/logger");
const { CategoryModel } = require("../../db/models/CategoryModel");
const authRequest = require("../../middlewares/auth");
const { requireBodyFields } = require("../../middlewares/fields");

/**
 * Эндпоинт для добавления новой категории
 * 
 * @route POST /v1/categories/add
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware requireFields(['name']) - Мидлвэйр для проверки обязательных полей
 * 
 * @param {string} req.body.name - Название категории
 * @param {string} req.body.category_id - ID родительской категории (опционально)
 * 
 * @param {Object} res - Объект ответа
 * 
 * @returns {Object} - JSON объект с сообщением об успешном добавлении и ID новой категории
 */

app.post("/v1/categories/add", authRequest, requireBodyFields(['name']), async (req, res) => {
    try {
        const { name, categoryid } = req.body;

        const category = await CategoryModel.create({ name, categoryid });

        logger.info(`Category ${colorText('created', 'green')}: ID=${category.id}, name="${name}"`);

        return res.status(200).json({
            message: "success",
            categoryid: category.id
        })
    } catch (e) {
        logger.error(`Error while adding new category: ${colorText(e.message, 'red')}`)
        res.status(500).send({ error: e.message });
    }
});