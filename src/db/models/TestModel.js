const { DataTypes } = require("sequelize");
const { db } = require("../db");

const TestModel = db.define(
  "tests",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // categoryId: {
    //     type: DataTypes.INTEGER,
    //     allowNull: false
    // },
    duration: {
      type: DataTypes.INTEGER, // длительность в минутах
      allowNull: false,
    },
    questionCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true, // включаем createdAt и updatedAt
  }
);

module.exports = { TestModel };
