const app = require("../../config/express");
const { UserModel } = require("../../db/models/UserModel");
const bcrypt = require("bcrypt");
const { requireBodyFields } = require("../../middlewares/fields");
const { logger, colorText } = require("../../config/logger");
const { generateAccessToken } = require("./jwt");

app.post("/v1/users/login", requireBodyFields(["username", "password"]), async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await UserModel.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({
                error: "INVALID_CREDENTIALS",
                error_message: "Invalid username or password",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            return res.status(400).json({
                error: "INVALID_CREDENTIALS",
                error_message: "Invalid username or password",
            });
        }

        const accessToken = generateAccessToken(user);

        logger.info(`User ${username} ${colorText("logged in", "blue")}`);

        res.status(200).json({
            message: "Login successful",
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin },
            accessToken,
        });
    } catch (e) {
        logger.error(`Login error for user ${username}: ${e.message}`);
        res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            error_message: e.message,
        });
    }
});