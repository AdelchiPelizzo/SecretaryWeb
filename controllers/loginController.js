const path = require("path");
const bcrypt = require("bcrypt");

const User = require("../models/User");
const Business = require("../models/Business");

function showLoginPage(req, res) {
    res.sendFile(path.join(__dirname, "../pages/login.html"));
}

async function handleLogin(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send("Email and password are required.");
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            return res.status(401).send("Invalid email or password.");
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).send("Invalid email or password.");
        }

        const business = await Business.findOne({
            ownerUserId: user._id
        });

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        const now = new Date();

        if (
            business.paymentStatus === "expired" ||
            (
                business.paymentStatus === "trial" &&
                business.trialEndsAt &&
                business.trialEndsAt <= now
            ) ||
            (
                business.paymentStatus === "valid" &&
                business.paymentValidUntil &&
                business.paymentValidUntil <= now
            )
        ) {
            req.session.userId = user._id.toString();

            return res.redirect(
                `/payment/${business.paymentReference}`
            );
        }

        req.session.userId = user._id.toString();

        user.lastLoginAt = new Date();
        await user.save();

        res.redirect("/dashboard");
    } catch (error) {
        console.error("Login failed:", error);
        res.status(500).send("Login failed.");
    }
}

module.exports = {
    showLoginPage,
    handleLogin
};