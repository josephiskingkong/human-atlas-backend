const app = require("../../config/express");
const { PointModel } = require("../../db/models/PointModel");
const authRequest = require("../../middlewares/auth");
const requireFields = require("../../middlewares/fields");

app.post("/v1/points/add", authRequest, requireFields(['x', 'y', 'organid', 'name', 'description']), async (req, res) => {
    try {
        const { x, y, organid, name, description } = req.body;

        const point = await PointModel.create({ x, y, organid, name, description })

        return res.status(200).json({
            message: "success",
            point_id: point.id
        })
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});