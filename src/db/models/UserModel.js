const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");
const { db } = require("../db");
const { logger } = require("../../config/logger");
const SALT_ROUNDS = 10;

const UserModel = db.define(
  "users",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(64),
      unique: true,
      allowNull: false,
    },
    hashedPassword: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    photo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^[0-9\-\+]{9,15}$/,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    hooks: {
      async beforeCreate(user) {
        const count = await UserModel.count();
        if (count >= 1) {
          throw new Error("Можно создать только одного пользователя в системе");
        }
      },
      async beforeBulkCreate(users) {
        const count = await UserModel.count();
        if (count > 0 || users.length > 1) {
          throw new Error("Можно создать только одного пользователя в системе");
        }
      },
    },
  }
);

UserModel.createSingleton = async function (userData) {
  const existingUser = await this.findOne();
  if (existingUser) {
    throw new Error("Пользователь уже существует в системе");
  }

  return await this.create(userData);
};

UserModel.getSingleton = async function () {
  return await this.findOne();
};

UserModel.updateSingleton = async function (updateData) {
  const user = await this.findOne();
  if (!user) {
    throw new Error("Пользователь не найден");
  }

  return await user.update(updateData);
};

async function createAdmin() {
  async function hash(password) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    return hashedPassword;
  }

  try {
    await db.sync();

    const adminUsername = process.env.adminName;
    const adminPassword = process.env.adminPassword;

    const existingAdmin = await UserModel.findOne({
      where: { username: adminUsername },
    });

    if (!existingAdmin) {
      const hashedPassword = await hash(adminPassword);
      const firstName = "Robert";
      const lastName = "Polson";

      await UserModel.createSingleton({
        username: adminUsername,
        hashedPassword,
        firstName,
        lastName,
      });

      logger.info("✅ Админ успешно создан!");
    } else {
      logger.info("ℹ️ Админ уже существует.");
    }
  } catch (error) {
    logger.error("❌ Ошибка при создании админа:", error);
  } finally {
    await db.close();
  }
}

createAdmin();

module.exports = { UserModel };
