const app = require("../../config/express");
const { UserModel } = require("../../db/models/UserModel");
const bcrypt = require('bcrypt');
const { requireBodyFields } = require("../../middlewares/fields");
const { logger, colorText } = require("../../config/logger");
const { generateAccessToken } = require("./jwt");

app.post('/v1/users/register', requireBodyFields(['username', 'password', 'name']), async (req, res) => {
    try {
        const { username, password, name } = req.body;

        if (username.length > 64) {
            return res.status(400).send({ 
                error: "FIELD_LENGTH_TOO_LARGE", 
                error_message: "Username length is over 64 chars" 
            });
        }

        const isLowercase = /^[a-z0-9_.]+$/.test(username);
        if (!isLowercase) {
            return res.status(400).send({ 
                error: "INVALID_USERNAME_FORMAT", 
                error_message: "Username must only contain lowercase letters, numbers, underscores, or dots" 
            });
        }

        const nameParts = name.split(' ');
        if (nameParts.length !== 2) {
            return res.status(400).json({ 
                error: "INVALID_NAME", 
                error_message: "Invalid name was provided" 
            });
        }

        if (password.length < 8) {

        }

        if (password.length < 8) {
            return res.status(400).json({ 
                error: "PASSWORD_TOO_SHORT", 
                error_message: "Password must be at least 8 characters long" 
            });
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                error: "INVALID_PASSWORD_FORMAT", 
                error_message: "Password must contain letters, numbers, and valid symbols. No spaces or invisible characters allowed." 
            });
        }

        const isUsernameOccupied = await UserModel.findOne({ where: { username } });
        if (isUsernameOccupied) {
            return res.status(400).json({ 
                error: "USERNAME_ALREADY_TAKEN", 
                error_message: "The username is already taken" 
            });
        }

        const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
        const lastName = nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1).toLowerCase();

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await UserModel.create({ username, hashedPassword, firstName, lastName });
        logger.info(`User ${username} was ${colorText("created", "green")}: ${firstName} ${lastName}`)

        const accessToken = generateAccessToken(user);

        res.status(201).json({
            message: 'User created',
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin },
            accessToken
        });
    } catch (e) {
        res.status(500).json({ 
            error: "INTERNAL_SERVER_ERROR", 
            error_message: e.message 
        });
    }
});