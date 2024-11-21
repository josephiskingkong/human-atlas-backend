const { DataTypes } = require('sequelize')
const { db } = require('../db')

const CategoryModel = db.define('categories', {
    id: {
        type: DataTypes.INTEGER, primaryKey: true, unique: true, autoIncrement: true
    },
    name: {
        type: DataTypes.STRING, allowNull: false
    },
    categoryid: {
        type: DataTypes.INTEGER, allowNull: true
    }
})

module.exports = { CategoryModel }