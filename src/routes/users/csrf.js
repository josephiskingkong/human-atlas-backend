const app = require("../../config/express");

app.get('/v1/csrf-token', (req, res) => {
    res.cookie('XSRF-TOKEN', req.csrfToken(), { httpOnly: true, maxAge: 3600000 });
    res.json({ csrfToken: req.csrfToken() });
});