require('dotenv').config();
const { setupAssociations } = require('./src/db/init');
const { logger, colorText } = require('./src/config/logger');

// Установка всех связей между моделями
setupAssociations();

// Получаем настроенный Express app
const app = require('./src/config/express');

// Загрузка маршрутов ПОСЛЕ настройки Express
require('./src/routes/routes');

// Запускаем сервер ЗДЕСЬ
const port = process.env.API_PORT || 5001;
app.listen(port, () => {
    logger.info(`App listening on port ${colorText(port, 'green')}`);
});

// Обработка необработанных исключений
process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
});