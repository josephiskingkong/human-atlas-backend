const { DataTypes } = require("sequelize");
const { db } = require("../db");
const fs = require("fs");
const { logger } = require("../../config/logger");

const OrganModel = db.define(
  "organs",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    synonym: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    categoryid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "PROCESSING",
    },
    mpp_x: {
      type: DataTypes.FLOAT,
    },
    mpp_y: {
      type: DataTypes.FLOAT,
    },
    width: {
      type: DataTypes.BIGINT,
    },
    height: {
      type: DataTypes.BIGINT,
    },
  },
  {
    hooks: {
      async beforeDestroy(organ) {
        const organPath = `/var/www/human-atlas-tiles/tiles/${organ.id}`;

        try {
          await fs.promises.rm(organPath, { recursive: true, force: true });
          logger.info(`Папка удалена: ${organPath}`);
        } catch (err) {
          logger.error(`Ошибка удаления папки: ${err.message}`);
        }
      },
    },
  }
);

module.exports = { OrganModel };
