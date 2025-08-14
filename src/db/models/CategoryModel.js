const { DataTypes } = require("sequelize");
const { db } = require("../db");
const fs = require("fs");
const { logger } = require("../../config/logger");
const { OrganModel } = require("./OrganModel");

const CategoryModel = db.define(
  "categories",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    hooks: {
      async beforeDestroy(category, options) {
        const organs = await OrganModel.findAll({
          where: { categoryid: category.id },
        });

        for (const organ of organs) {
          const organPath = `/var/www/human-atlas-tiles/tiles/${organ.id}`;

          try {
            await fs.promises.rm(organPath, { recursive: true, force: true });
            logger.info(`Папка удалена: ${organPath}`);
          } catch (err) {
            logger.error(`Ошибка удаления папки: ${err.message}`);
          }
        }
      },
    },
  }
);

module.exports = { CategoryModel };
