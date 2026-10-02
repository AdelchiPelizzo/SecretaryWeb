const path = require("path");
const bcrypt = require("bcrypt");

const User = require("../models/User");

function showResetPasswordPage(req, res) {

    res.sendFile(
        path.join(__dirname, "../pages/reset-password.html")
    );

}


async function resetPassword(req, res) {

    try {

        const {
            token,
            password,
            confirmPassword
        } = req.body;


        if (!token || !password || !confirmPassword) {

            return res.status(400).send(
                "All fields are required."
            );

        }


        if (password !== confirmPassword) {

            return res.status(400).send(
                "Passwords do not match."
            );

        }


        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: {
                $gt: new Date()
            }
        });


        if (!user) {

            return res.status(400).send(
                "This password reset link is invalid or has expired."
            );

        }


        const passwordHash =
            await bcrypt.hash(password, 12);


        user.passwordHash = passwordHash;

        user.passwordResetToken = null;

        user.passwordResetExpires = null;


        await user.save();


        return res.redirect(
            "/login?passwordChanged=true"
        );

    } catch (error) {

        console.error(
            "Password reset failed:",
            error
        );

        return res.status(500).send(
            "Unable to reset the password."
        );

    }

}


module.exports = {
    showResetPasswordPage,
    resetPassword
};