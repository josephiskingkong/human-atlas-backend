const { Sequelize } = require("sequelize");
require("dotenv").config();

const requiredEnvVars = [
  "tableName",
  "dbLogin",
  "dbPass",
  "dbHost",
  "dbPort",
  "adminName",
  "adminPassword",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] || process.env[envVar].trim() === "") {
    throw new Error(
      `Missing or empty required environment variable: ${envVar}`
    );
  }
}

const db = new Sequelize(
  process.env.tableName,
  process.env.dbLogin,
  String(process.env.dbPass),
  {
    host: process.env.dbHost,
    port: Number(process.env.dbPort),
    dialect: "postgres",
    dialectOptions: {
      ssl:
        process.env.DB_SSL === "true"
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: process.env.NODE_ENV === "development" ? console.log : false,
  }
);

db.authenticate()
  .then(() => console.log("PostgreSQL connection established successfully"))
  .catch((err) => console.error("Unable to connect to PostgreSQL:", err));

module.exports = { db };
