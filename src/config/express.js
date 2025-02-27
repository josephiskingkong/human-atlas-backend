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
    allowedHeaders: [
        'Cookie',
        'Content-Type',
        'Authorization',
        'X-XSRF-TOKEN',
        'XSRF-TOKEN',
        'X-Custom-Header',
        'Accept',
        'Origin',
        'User-Agent',
        'Access-Control-Allow-Headers'
    ],
}));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
});

app.use(cookieParser());

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// const csrfProtection = csrf({
//     value: (req) => {
       
//         return req.headers['Xsrf-token'];
//     },
// });
// app.use(csrfProtection);

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