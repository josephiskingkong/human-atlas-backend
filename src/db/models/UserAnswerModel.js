const { DataTypes } = require('sequelize');
const { db } = require('../db');

const UserAnswerModel = db.define('user_answers', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true,
        autoIncrement: true
    },
    sessionId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    questionId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    answerIds: {
        type: DataTypes.JSON, // Массив ID выбранных ответов
        allowNull: true
    },
    textAnswer: {
        type: DataTypes.TEXT, // Для текстовых ответов
        allowNull: true
    },
    isCorrect: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    timestamps: true
});

module.exports = { UserAnswerModel };