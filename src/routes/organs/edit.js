const app = require("../../config/express");
const { logger } = require("../../config/logger");
const { OrganModel } = require("../../db/models/OrganModel");
const { authenticateToken } = require("../users/auth");

app.put("/v1/organs/edit", authenticateToken, async (req, res) => {
  const { id, name, details, categoryId } = req.body;

  try {
    const organ = await OrganModel.findByPk(id);

    if (!organ) {
      return res.status(404).json({ error: "Organ not found" });
    }

    if (name !== undefined) organ.name = name;
    if (details !== undefined) organ.detailedDescription = details;
    if (categoryId !== undefined) organ.categoryid = categoryId;

    await organ.save();

    logger.info(
      `Organ updated successfully: ${organ.id}, ${organ.name}, ${organ.detailedDescription}`
    );
    return res.json({ message: "Organ updated successfully", organ });
  } catch (error) {
    logger.error(`Failed to update organ: ${error.message}`);
    res.status(500).json({ error: "Server error" });
  }
});
