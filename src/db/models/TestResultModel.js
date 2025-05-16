const { DataTypes } = require('sequelize');
const { db } = require('../db');

const TestResultModel = db.define('test_results', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true,
        autoIncrement: true
    },
    testId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    correctCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    incorrectCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    skippedCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    totalCount: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
    },
    startedAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    finishedAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    timestamps: false
});

module.exports = { TestResultModel };