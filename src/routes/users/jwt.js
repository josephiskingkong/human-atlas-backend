const jwt = require('jsonwebtoken');

function generateAccessToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, isAdmin: user.isAdmin, tokenVersion: user.tokenVersion },
        process.env.JWT_SECRET || 'access_secret_key'
    );
}

module.exports = { generateAccessToken }