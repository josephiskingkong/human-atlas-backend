const express = require('express');
const cors = require('cors');
const { logger, colorText } = require('./logger');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

const app = express();
const port = process.env.API_PORT;

app.use(cors({
    origin: 'http://localhost:3000', 
    credentials: true
}));

// Улучшенная проверка типа контента
app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    
    // Используем includes вместо startsWith для более надежной проверки
    if (contentType.includes('multipart/form-data')) {
        // Для multipart/form-data пропускаем JSON парсер
        logger.info(`Detected multipart request: ${req.path}`);
        return next();
    }
    
    // Для остальных запросов используем JSON парсер
    bodyParser.json({
        limit: '256mb'
    })(req, res, next);
});

// Используем парсер URL-encoded данных для форм без файлов
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.use(cookieParser());

// Добавляем обработчик ошибок перед маршрутами
app.use((err, req, res, next) => {
    if (err) {
        logger.error(`Express error: ${err.message}`);
        
        if (err.code === 'EBADCSRFTOKEN') {
            return res.status(403).json({ message: 'Invalid CSRF token' });
        }
        
        if (err.message && err.message.includes('Multipart')) {
            return res.status(400).json({ error: 'Invalid multipart request format' });
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
    next();
});

app.listen(port, () => {
    logger.info(`App listening on port ${colorText(port, 'green')}`);
});

module.exports = app;