const { DataTypes } = require('sequelize')
const { db } = require('../db')

const PointModel = db.define('points', {
    id: {
        type: DataTypes.INTEGER, primaryKey: true, unique: true, autoIncrement: true
    },
    organid: {
        type: DataTypes.INTEGER, allowNull: true
    },
    x: {
        type: DataTypes.FLOAT, allowNull: false
    },
    y: {
        type: DataTypes.FLOAT, allowNull: false
    },
    name: {
        type: DataTypes.STRING
    },
    description: {
        type: DataTypes.STRING
    }
})

module.exports = { PointModel }