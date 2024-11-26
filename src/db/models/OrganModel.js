const { DataTypes } = require('sequelize')
const { db } = require('../db')

const OrganModel = db.define('organs', {
    id: {
        type: DataTypes.INTEGER, primaryKey: true, unique: true, autoIncrement: true
    },
    name: {
        type: DataTypes.TEXT, allowNull: false
    },
    synonym: {
        type: DataTypes.TEXT, allowNull: false 
    },
    categoryid: {
        type: DataTypes.INTEGER, allowNull: false
    },
    status: {
        type: DataTypes.STRING, allowNull: false, defaultValue: "PROCESSING"
    },
    mpp_x: {
        type: DataTypes.FLOAT
    },
    mpp_y: {
        type: DataTypes.FLOAT
    },
    width: { 
        type: DataTypes.BIGINT
    },
    height: {
        type: DataTypes.BIGINT
    }
})

module.exports = { OrganModel }