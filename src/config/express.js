const express = require('express');
const cors = require('cors');
const { logger, colorText } = require('./logger');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.API_PORT;

// CORS конфигурация - должна быть ПЕРВОЙ
const corsOptions = {
    origin: ['http://localhost:3000', 'https://josephiskingkong.github.io', 'https://humanatlas.top'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Cookie',
        'Content-Type',
        'Authorization',
        'X-CSRF-TOKEN',
        'x-csrf-token',
        'XSRF-TOKEN',
        'X-Custom-Header',
        'Accept',
        'Origin',
        'User-Agent',
        'Access-Control-Allow-Headers'
    ],
    // Добавляем явную обработку preflight
    preflightContinue: false,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Явная обработка OPTIONS запросов для всех маршрутов
app.options('*', cors(corsOptions));

// Middleware для установки дополнительных CORS заголовков
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Если это preflight запрос, отправляем успешный ответ
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
});

// Cookie parser (убираем дублирование)
app.use(cookieParser());

// Body parsers
app.use(bodyParser.json({ limit: '2048mb' }));
app.use(bodyParser.urlencoded({ limit: '2048mb', extended: true }));

// Обработчик ошибок
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    
    logger.error(`Express error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
});

// НЕ ЗАПУСКАЕМ СЕРВЕР ЗДЕСЬ - это должно быть в app.js
// app.listen(port, () => {
//     logger.info(`App listening on port ${colorText(port, 'green')}`);
// });

module.exports = app;