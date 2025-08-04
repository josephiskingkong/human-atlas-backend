const app = require("../../config/express");
const { logger } = require("../../config/logger");
const { OrganModel } = require("../../db/models/OrganModel");
const { authenticateToken } = require("../users/auth");

app.put("/v1/organs/edit", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, categoryId } = req.body;

  try {
    const organ = await OrganModel.findByPk(id);
    if (!organ) {
      return res.status(404).json({ error: "Organ not found" });
    }

    if (name !== undefined) organ.name = name;
    if (categoryId !== undefined) organ.categoryid = categoryId;

    await organ.save();

    return res.json({ message: "Organ updated successfully", organ });
  } catch (error) {
    logger.error(`Failed to update organ: ${error.message}`);
    res.status(500).json({ error: "Server error" });
  }
});
