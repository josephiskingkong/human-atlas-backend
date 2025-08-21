const { CategoryModel } = require("./models/CategoryModel");
const { OrganModel } = require("./models/OrganModel");
const { PointModel } = require("./models/PointModel");
const { UserModel } = require("./models/UserModel");
const { TestModel } = require("./models/TestModel");
const { QuestionModel } = require("./models/QuestionModel");
const { AnswerModel } = require("./models/AnswerModel");
const { TestResultModel } = require("./models/TestResultModel");
const { TestSessionModel } = require("./models/TestSessionModel");
const { UserAnswerModel } = require("./models/UserAnswerModel");
const { logger } = require("../config/logger");

// Функция для настройки ассоциаций между моделями
function setupAssociations() {
  // Связи Сategory и подкатегорий
  CategoryModel.hasMany(CategoryModel, {
    foreignKey: "categoryId",
    as: "subcategories",
    onDelete: "CASCADE",
  });
  CategoryModel.belongsTo(CategoryModel, {
    foreignKey: "categoryId",
    as: "parentCategory",
  });

  // Связи CategoryModel и OrganModel
  CategoryModel.hasMany(OrganModel, {
    foreignKey: "categoryid",
    onDelete: "CASCADE",
  });
  OrganModel.belongsTo(CategoryModel, { foreignKey: "categoryid" });

  // Связи OrganModel и PointModel
  OrganModel.hasMany(PointModel, {
    foreignKey: "organid",
    onDelete: "CASCADE",
  });
  PointModel.belongsTo(OrganModel, { foreignKey: "organid" });

  // Связи для TestModel и QuestionModel
  TestModel.hasMany(QuestionModel, {
    foreignKey: "testId",
    onDelete: "CASCADE",
  });
  QuestionModel.belongsTo(TestModel, { foreignKey: "testId" });

  // Связи для QuestionModel и AnswerModel
  QuestionModel.hasMany(AnswerModel, {
    foreignKey: "questionId",
    onDelete: "CASCADE",
  });
  AnswerModel.belongsTo(QuestionModel, { foreignKey: "questionId" });

  // Связи для TestResultModel
  TestModel.hasMany(TestResultModel, { foreignKey: "testId" });
  TestResultModel.belongsTo(TestModel, { foreignKey: "testId" });

  UserModel.hasMany(TestResultModel, { foreignKey: "userId" });
  TestResultModel.belongsTo(UserModel, { foreignKey: "userId" });

  // Связи для TestSessionModel
  TestSessionModel.belongsTo(TestModel, { foreignKey: "testId" });
  TestModel.hasMany(TestSessionModel, { foreignKey: "testId" });

  TestSessionModel.belongsTo(UserModel, { foreignKey: "userId" });
  UserModel.hasMany(TestSessionModel, { foreignKey: "userId" });

  // Связи для UserAnswerModel
  UserAnswerModel.belongsTo(TestSessionModel, { foreignKey: "sessionId" });
  TestSessionModel.hasMany(UserAnswerModel, { foreignKey: "sessionId" });

  UserAnswerModel.belongsTo(QuestionModel, { foreignKey: "questionId" });
  QuestionModel.hasMany(UserAnswerModel, { foreignKey: "questionId" });
}

// Синхронизация моделей с базой данных
async function init() {
  try {
    // Устанавливаем ассоциации до синхронизации
    setupAssociations();

    // Синхронизируем модели
    await CategoryModel.sync({ alter: true });
    await OrganModel.sync({ alter: true });
    await PointModel.sync({ alter: true });
    await UserModel.sync({ alter: true });

    // Новые модели для тестирования
    await TestModel.sync({ alter: true });
    await QuestionModel.sync({ alter: true });
    await AnswerModel.sync({ alter: true });
    await TestResultModel.sync({ alter: true });
    await TestSessionModel.sync({ alter: true });
    await UserAnswerModel.sync({ alter: true });

    logger.info("Database synchronized successfully");
  } catch (error) {
    logger.error("Error synchronizing database:", error);
  }
}

if (require.main === module) {
  init();
}

module.exports = { init, setupAssociations };
