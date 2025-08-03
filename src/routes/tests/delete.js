const app = require("../../config/express");
const { logger, colorText } = require("../../config/logger");
const { TestModel } = require("../../db/models/TestModel");
const { requireBodyFields } = require("../../middlewares/fields");
const { authenticateToken } = require("../users/auth");

/**
 * Эндпоинт для удаления теста по его айди
 *
 * @route DELETE /v1/tests/delete
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware requireFields(['id']) - Мидлвэйр для проверки обязательных полей
 *
 * @param {number} req.body.id - Айди теста, который необходимо удалить
 *
 * @param {Object} res - Объект ответа
 *
 * @returns {Object} - JSON объект с сообщением об успешном удалении или ошибкой
 */

app.delete(
  "/v1/tests/delete",
  authenticateToken,
  requireBodyFields(["id"]),
  async (req, res) => {
    try {
      const { id } = req.body;

      const test = await TestModel.findOne({ where: { id } });

      if (!test) {
        return res.status(404).send({ error: "Test not found" });
      }

      await TestModel.destroy({ where: { id } });

      logger.info(`Test ${colorText("removed", "red")}: ID=${id}"`);

      return res.status(200).json({ message: "success" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);
