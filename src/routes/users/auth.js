const jwt = require('jsonwebtoken');
const { UserModel } = require('../../db/models/UserModel');
const { logger } = require('../../config/logger');

const authenticateToken = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken; 
        if (!token) {
            logger.error("No token found in cookies");
            return res.status(401).json({ error: 'UNAUTHORIZED' });
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            logger.error("JWT verification failed:", err);
            return res.status(401).json({ error: 'INVALID_TOKEN' });
        }

        const user = await UserModel.findByPk(payload.id);
        if (!user) {
            logger.error("User not found in database");
            return res.status(401).json({ error: 'USER_NOT_FOUND' });
        }

        if (user.tokenVersion !== payload.tokenVersion) {
            logger.error(`Token version mismatch: payload ${payload.tokenVersion}, expected ${user.tokenVersion}`);
            return res.status(401).json({ error: 'TOKEN_INVALID' });
        }

        req.user = user;
        next();
    } catch (err) {
        logger.error("Error in authenticateToken:", err.message);
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
};

module.exports = { authenticateToken };