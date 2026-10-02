const path = require("path");
const crypto = require("crypto");

const User = require("../models/User");
const {
    sendPasswordResetEmail
} = require("../utils/mailer");


function showForgotPasswordPage(req, res) {

    res.sendFile(
        path.join(__dirname, "../pages/forgot-password.html")
    );

}


async function requestPasswordReset(req, res) {

    try {

        const email =
            req.body.email?.trim().toLowerCase();

        if (!email) {

            return res.status(400).send(
                "Email address is required."
            );

        }


        const user = await User.findOne({ email });

        /*
         * Always return the same response whether the
         * email exists or not.
         *
         * This prevents revealing which email addresses
         * have accounts.
         */

        if (!user) {

            return res.send(
                "If an account exists for this email address, " +
                "password reset instructions have been sent."
            );

        }


        const resetToken =
            crypto.randomBytes(32).toString("hex");


        user.passwordResetToken = resetToken;

        user.passwordResetExpires =
            new Date(Date.now() + 60 * 60 * 1000);

        await user.save();


        const resetUrl =
            `${req.protocol}://${req.get("host")}` +
            `/reset-password?token=${resetToken}`;


        await sendPasswordResetEmail({
            email: user.email,
            resetUrl
        });


        return res.send(
            "If an account exists for this email address, " +
            "password reset instructions have been sent."
        );

    } catch (error) {

        console.error(
            "Password reset request failed:",
            error
        );

        return res.status(500).send(
            "Unable to process the password reset request."
        );

    }

}


module.exports = {
    showForgotPasswordPage,
    requestPasswordReset
};