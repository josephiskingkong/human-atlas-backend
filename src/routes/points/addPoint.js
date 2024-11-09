const app = require("../../config/express");
const authRequest = require("../../middlewares/auth");

app.post("/v1/points/add", authRequest, async (req, res) => {
    try {

    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})