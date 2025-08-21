const { logger } = require("../../config/logger");
const { db } = require("../db");
const { QueryTypes } = require("sequelize");

async function migrateColumnName() {
  const transaction = await db.transaction();

  try {
    // Проверяем существование колонки categoryid
    const columns = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'categoryid'",
      { type: QueryTypes.SELECT, transaction }
    );

    if (columns.length > 0) {
      // Если столбец categoryid существует, переименовываем его
      await db.query(
        'ALTER TABLE categories RENAME COLUMN categoryid TO "categoryId"',
        { transaction }
      );
      logger.info("Successfully renamed column from categoryid to categoryId");
    } else {
      // Проверяем, существует ли уже правильное имя колонки
      const newColumns = await db.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'categoryId'",
        { type: QueryTypes.SELECT, transaction }
      );

      if (newColumns.length > 0) {
        logger.info("Column categoryId already exists");
      } else {
        // Если ни одна из колонок не существует, создаем новую
        await db.query(
          'ALTER TABLE categories ADD COLUMN "categoryId" INTEGER',
          { transaction }
        );
        logger.info("Created column categoryId");
      }
    }

    await transaction.commit();
    logger.info("Migration completed successfully");
  } catch (error) {
    await transaction.rollback();
    logger.error("Error during migration:", error);
  }
}

migrateColumnName().then(() => {
  logger.info("Migration function executed");
  // Не закрываем соединение с базой данных здесь
});
