const winston = require("winston");

const colorCodes = {
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    purple: 35,
    cyan: 36,
    white: 37,
    reset: 0
};

function colorText(text, color) {
    const colorCode = colorCodes[color.toLowerCase()] || colorCodes.reset;
    return `\x1b[${colorCode}m${text}\x1b[0m`;
}

const logger = winston.createLogger({
    level: "silly",
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }), // Добавляем стек для ошибок
        winston.format.printf(({ timestamp, level, message, stack }) => {
            return stack
                ? `${timestamp} [${level.toUpperCase()}]: ${message}\nStack trace: ${stack}`
                : `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.colorize(),
                winston.format.errors({ stack: true }),
                winston.format.printf(({ timestamp, level, message, stack }) => {
                    return stack
                        ? `${timestamp} [${level}]: ${message}\nStack trace: ${stack}`
                        : `${timestamp} [${level}]: ${message}`;
                })
            )
        }),
        new winston.transports.File({
            filename: 'logs.log',
            level: 'info', // Логи уровня info и выше (но исключая error)
            format: winston.format.combine(
                winston.format.uncolorize(),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
                })
            )
        }),
        new winston.transports.File({
            filename: 'errors.log',
            level: 'error', // Логи уровня error
            format: winston.format.combine(
                winston.format.uncolorize(),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.printf(({ timestamp, level, message, stack }) => {
                    return stack
                        ? `${timestamp} [${level.toUpperCase()}]: ${message}\nStack trace: ${stack}`
                        : `${timestamp} [${level.toUpperCase()}]: ${message}`;
                })
            )
        })
    ]
});

module.exports = { logger, colorText };