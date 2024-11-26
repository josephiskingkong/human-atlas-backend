const app = require("../../config/express");
const { UserModel } = require("../../db/models/UserModel");
const { authenticateToken } = require("./auth");

app.get('/v1/users/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await UserModel.findOne({
            where: { id: userId },
            attributes: ["id", "username", "firstName", "lastName", "photo", "dateOfBirth", "phoneNumber", "email", "isAdmin"],
        });

        if (!user) {
            return res.status(404).json({
                error: "USER_NOT_FOUND",
                error_message: "User not found",
            });
        }

        res.status(200).json({
            message: "User profile retrieved successfully",
            user,
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            error_message: "An error occurred while fetching the profile",
        });
    }
});
