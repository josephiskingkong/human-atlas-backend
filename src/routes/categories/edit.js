const app = require("../../config/express");
const { colorText, logger } = require("../../config/logger");
const { CategoryModel } = require("../../db/models/CategoryModel");
const authRequest = require("../../middlewares/auth");
const { requireBodyFields } = require("../../middlewares/fields");
const { authenticateToken } = require("../users/auth");

/**
 * Эндпоинт для редактирования существующей категории
 *
 * @route POST /v1/categories/edit
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware requireBodyFields(['id', 'name']) - Мидлвэйр для проверки обязательных полей
 *
 * @param {number} req.body.id - ID категории, которую необходимо отредактировать
 * @param {string} req.body.name - Новое название категории
 *
 * @param {Object} res - Объект ответа
 *
 * @returns {Object} - JSON объект с сообщением об успешном редактировании и ID обновлённой категории
 */

app.post(
  "/v1/categories/edit",
  authenticateToken,
  requireBodyFields(["id", "name"]),
  async (req, res) => {
    try {
      const { id, name } = req.body;

      if (name === undefined) {
        return res
          .status(400)
          .json({ error: "Имя категории должно быть строкой!" });
      }

      const [updatedRows] = await CategoryModel.update(
        { name },
        { where: { id } }
      );

      if (updatedRows === 0) {
        return res
          .status(404)
          .json({ error: "Category not found or no changes applied" });
      }

      logger.info(`Category ${colorText("edited", "green")}: ID=${id}`);

      return res.status(200).json({
        message: "success",
        categoryid: id,
      });
    } catch (e) {
      logger.error(
        `Error while editing category: ${colorText(e.message, "red")}`
      );
      res.status(500).send({ error: e.message });
    }
  }
);
