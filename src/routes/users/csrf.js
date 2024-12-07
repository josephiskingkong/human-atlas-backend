const app = require("../../config/express");

app.get('/v1/csrf-token', (req, res) => {
    res.json({ });
});