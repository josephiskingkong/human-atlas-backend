const { DataTypes } = require('sequelize');
const { db } = require('../db');
const { v4: uuidv4 } = require('uuid');

const TestSessionModel = db.define('test_sessions', {
    id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true
    },
    testId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'in_progress',
        validate: {
            isIn: [['in_progress', 'completed', 'expired']]
        }
    },
    startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = { TestSessionModel };