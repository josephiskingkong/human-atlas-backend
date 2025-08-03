const app = require("../../config/express");
const { colorText, logger } = require("../../config/logger");
const { TestModel } = require("../../db/models/TestModel");
const { QuestionModel } = require("../../db/models/QuestionModel");
const { AnswerModel } = require("../../db/models/AnswerModel");
const { authenticateToken } = require("../users/auth");
const { requireBodyFields } = require("../../middlewares/fields");
const { db } = require("../../db/db");

/**
 * Эндпоинт для добавления нового теста
 */
app.post(
  "/v1/tests/add",
  authenticateToken,
  requireBodyFields(["title", "categoryId", "duration"]),
  async (req, res) => {
    const transaction = await db.transaction();

    try {
      const { title, categoryId, duration, description } = req.body;

      const test = await TestModel.create(
        {
          title,
          categoryId,
          duration,
          description,
        },
        { transaction }
      );

      logger.info(
        `Test ${colorText("created", "green")}: ID=${test.id}, title="${title}"`
      );

      await transaction.commit();

      return res.status(201).json({
        message: "success",
        test_id: test.id,
      });
    } catch (e) {
      await transaction.rollback();
      logger.error(`Error creating test: ${colorText(e.message, "red")}`);
      res.status(500).send({ error: e.message });
    }
  }
);

/**
 * Эндпоинт для добавления вопроса к тесту
 */
app.post(
  "/v1/tests/:testId/questions/add",
  authenticateToken,
  requireBodyFields(["text", "type", "position", "answers"]),
  async (req, res) => {
    const transaction = await db.transaction();

    try {
      const { testId } = req.params;
      const { text, type, position, answers } = req.body;

      // Проверка существования теста
      const test = await TestModel.findByPk(testId);
      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }

      // Создание вопроса
      const question = await QuestionModel.create(
        {
          testId,
          text,
          type,
          position,
        },
        { transaction }
      );

      // Добавление вариантов ответов
      if (Array.isArray(answers) && answers.length > 0) {
        for (const answer of answers) {
          await AnswerModel.create(
            {
              questionId: question.id,
              text: answer.text,
              isCorrect: answer.isCorrect || false,
              position: answer.position,
            },
            { transaction }
          );
        }
      }

      // Обновляем счетчик вопросов в тесте
      await TestModel.increment("questionCount", {
        by: 1,
        where: { id: testId },
        transaction,
      });

      await transaction.commit();

      logger.info(
        `Question ${colorText(
          "added",
          "green"
        )} to test ID=${testId}: question ID=${question.id}`
      );

      return res.status(201).json({
        message: "success",
        question_id: question.id,
      });
    } catch (e) {
      await transaction.rollback();
      logger.error(`Error adding question: ${colorText(e.message, "red")}`);
      res.status(500).send({ error: e.message });
    }
  }
);

app.post(
  "/v1/tests/:testId/questions/clear",
  authenticateToken,
  async (req, res) => {
    const transaction = await db.transaction();

    try {
      const { testId } = req.params;

      const test = await TestModel.findByPk(testId);
      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }

      const questions = await QuestionModel.findAll({
        where: { testId },
        transaction,
      });

      const questionIds = questions.map((q) => q.id);

      if (questionIds.length > 0) {
        await AnswerModel.destroy({
          where: { questionId: questionIds },
          transaction,
        });

        await QuestionModel.destroy({
          where: { id: questionIds },
          transaction,
        });
      }

      await TestModel.update(
        { questionCount: 0 },
        {
          where: { id: testId },
          transaction,
        }
      );

      await transaction.commit();

      logger.info(
        `Questions ${colorText("cleared", "yellow")} for test ID=${testId}`
      );

      return res
        .status(200)
        .json({ message: "Questions cleared successfully" });
    } catch (e) {
      await transaction.rollback();
      logger.error(`Error clearing questions: ${colorText(e.message, "red")}`);
      res.status(500).send({ error: e.message });
    }
  }
);
