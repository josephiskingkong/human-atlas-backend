require('dotenv').config();
const { setupAssociations } = require('./src/db/init');

// Установка всех связей между моделями
setupAssociations();

// Загрузка маршрутов
require('./src/routes/routes');