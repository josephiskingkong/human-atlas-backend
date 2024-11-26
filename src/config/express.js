const express = require('express');
const cors = require('cors');
const { logger, colorText } = require('./logger');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

const app = express();
const port = process.env.API_PORT;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    next();
});

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
}));

app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-XSRF-TOKEN');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(204);
});

app.use(bodyParser.json());
app.use(cookieParser());

const csrfProtection = csrf({
    cookie: true
});
app.use(csrfProtection);

app.listen(port, () => {
    logger.info(`App listening on port ${colorText(port, 'green')}`);
});

app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    next(err);
});

module.exports = app;