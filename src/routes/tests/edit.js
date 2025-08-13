const app = require("../../config/express");
const { colorText, logger } = require("../../config/logger");
const { CategoryModel } = require("../../db/models/CategoryModel");
const { TestModel } = require("../../db/models/TestModel");
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

app.put(
  "/v1/tests/edit",
  authenticateToken,
  requireBodyFields(["id", "title", "duration"]),
  async (req, res) => {
    const { id, title, duration } = req.body;

    if (!title || !duration) {
      return res.status(400).json({ message: "Заполните все поля" });
    }

    try {
      const test = await TestModel.findByPk(id);

      if (!test) {
        return res.status(404).json({ message: "Тест не найден" });
      }

      test.title = title;
      test.duration = duration;

      await test.save();

      res.status(200).json({ message: "Тест успешно обновлён", test });
    } catch (error) {
      console.error("Ошибка при обновлении теста:", error);
      res.status(500).json({ message: "Ошибка сервера" });
    }
  }
);
