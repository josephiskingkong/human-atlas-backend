const app = require("../../config/express");
const { colorText, logger } = require("../../config/logger");
const { TestModel } = require("../../db/models/TestModel");
const { QuestionModel } = require("../../db/models/QuestionModel");
const { AnswerModel } = require("../../db/models/AnswerModel");
const { CategoryModel } = require("../../db/models/CategoryModel");
const { TestResultModel } = require("../../db/models/TestResultModel");
const { requireParamFields } = require("../../middlewares/fields");
const { authenticateToken } = require("../users/auth");
const { Sequelize } = require("sequelize");

/**
 * Получение всех тестов с фильтрацией по категории
 */
app.get("/v1/tests", async (req, res) => {
  try {
    const tests = await TestModel.findAll({
      order: [["id", "ASC"]],
    });

    logger.info(`Retrieved ${tests.length} tests`);

    return res.status(200).json(
      tests.map((test) => ({
        id: test.id,
        title: test.title,
        duration: test.duration,
        questionCount: test.questionCount,
        description: test.description,
      }))
    );
  } catch (e) {
    logger.error(`Error retrieving tests: ${colorText(e.message, "red")}`);
    res.status(500).json({ error: e.message });
  }
});

/**
 * Получение конкретного теста по ID
 */
app.get("/v1/tests/:id", requireParamFields(["id"]), async (req, res) => {
  try {
    const { id } = req.params;

    const test = await TestModel.findByPk(id);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    logger.info(`Retrieved test ID=${id}, title="${test.title}"`);

    return res.status(200).json({
      id: test.id,
      title: test.title,
      duration: test.duration,
      questionCount: test.questionCount,
      description: test.description,
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    });
  } catch (e) {
    logger.error(`Error retrieving test: ${colorText(e.message, "red")}`);
    res.status(500).json({ error: e.message });
  }
});

/**
 * Получение всех вопросов теста (для редактирования, не для прохождения)
 */
app.get(
  "/v1/tests/:testId/questions",
  // authenticateToken,
  requireParamFields(["testId"]),
  async (req, res) => {
    try {
      const { testId } = req.params;

      // Проверка существования теста
      const test = await TestModel.findByPk(testId);
      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }

      // Получение всех вопросов с ответами
      const questions = await QuestionModel.findAll({
        where: { testId },
        order: [["position", "ASC"]],
        include: [
          {
            model: AnswerModel,
            attributes: ["id", "text", "isCorrect", "position"],
            order: [["position", "ASC"]],
          },
        ],
      });

      logger.info(
        `Retrieved ${questions.length} questions for test ID=${testId}`
      );

      return res.status(200).json(questions);
    } catch (e) {
      logger.error(
        `Error retrieving questions: ${colorText(e.message, "red")}`
      );
      res.status(500).json({ error: e.message });
    }
  }
);

/**
 * Получение результатов тестов пользователя
 */
app.get("/v1/tests/results/my", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const results = await TestResultModel.findAll({
      where: { userId },
      include: [
        {
          model: TestModel,
          attributes: ["title", "description", "questionCount"],
        },
      ],
      order: [["finishedAt", "DESC"]],
    });

    logger.info(
      `Retrieved ${results.length} test results for user ID=${userId}`
    );

    return res.status(200).json(
      results.map((result) => ({
        id: result.id,
        testId: result.testId,
        testTitle: result.test.title,
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        skippedCount: result.skippedCount,
        totalCount: result.totalCount,
        score: result.score,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
      }))
    );
  } catch (e) {
    logger.error(
      `Error retrieving test results: ${colorText(e.message, "red")}`
    );
    res.status(500).json({ error: e.message });
  }
});

/**
 * Получение результата конкретного теста
 */
app.get(
  "/v1/tests/results/:resultId",
  authenticateToken,
  requireParamFields(["resultId"]),
  async (req, res) => {
    try {
      const { resultId } = req.params;
      const userId = req.user.id;

      const result = await TestResultModel.findOne({
        where: { id: resultId, userId },
        include: [
          {
            model: TestModel,
            attributes: ["title", "description", "questionCount"],
          },
        ],
      });

      if (!result) {
        return res.status(404).json({ error: "Test result not found" });
      }

      logger.info(`Retrieved test result ID=${resultId} for user ID=${userId}`);

      return res.status(200).json({
        id: result.id,
        testId: result.testId,
        testTitle: result.test.title,
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        skippedCount: result.skippedCount,
        totalCount: result.totalCount,
        score: result.score,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
      });
    } catch (e) {
      logger.error(
        `Error retrieving test result: ${colorText(e.message, "red")}`
      );
      res.status(500).json({ error: e.message });
    }
  }
);
