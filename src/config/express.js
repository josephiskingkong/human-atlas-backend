const express = require('express');
const cors = require('cors');
const { logger, colorText } = require('./logger');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.API_PORT;

app.use(cors({
    origin: ['http://localhost:3000', 'https://josephiskingkong.github.io'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-TOKEN'],
}));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
});

app.use(cookieParser());

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const csrfProtection = csrf();

app.use(csrfProtection);

app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    next(err);
});

app.listen(port, () => {
    logger.info(`App listening on port ${colorText(port, 'green')}`);
});

module.exports = app;