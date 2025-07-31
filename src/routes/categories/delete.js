const app = require("../../config/express");
const { logger, colorText } = require("../../config/logger");
const { requireBodyFields } = require("../../middlewares/fields");
const { authenticateToken } = require("../users/auth");
const { CategoryModel } = require("../../db/models/CategoryModel");

app.delete(
  "/v1/categories/delete",
  authenticateToken,
  requireBodyFields(["id"]),
  async (req, res) => {
    try {
      const { id } = req.body;

      await CategoryModel.destroy({ where: { id } });

      res.status(200).send({ message: "success" });
    } catch (e) {
      logger.error(`Server error: ${colorText(e.message, "red")}`);
      return res.status(400).send({ error: "Bad request" });
    }
  }
);
