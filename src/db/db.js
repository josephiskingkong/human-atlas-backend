const { Sequelize } = require('sequelize')
require('dotenv').config();

const db = new Sequelize(
    process.env.tableName,
    process.env.dbLogin,
    process.env.dbPass,
    {
        host: process.env.dbHost,
        port: process.env.dbPort,
        dialect: 'postgres',
        logging: false
    }
)

module.exports = { db }