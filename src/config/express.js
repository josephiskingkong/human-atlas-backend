const express = require('express');
const cors = require('cors');
const { logger, colorText } = require('./logger');
const app = express()
const port = process.env.API_PORT;

app.use(express.json());
app.use(cors({ origin: '*' }));

app.listen(port, () => {
    logger.info(`App listening on port ${colorText(port, 'green')}`)
})

module.exports = app;