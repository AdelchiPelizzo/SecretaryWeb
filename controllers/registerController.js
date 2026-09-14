const path = require("path");
const bcrypt = require("bcrypt");

const User = require("../models/User");
const Business = require("../models/Business");

function showRegisterPage(req, res) {
    res.sendFile(path.join(__dirname, "../pages/register.html"));
}

async function handleRegistration(req, res) {
    try {
        const { businessName, email, password } = req.body;

        if (!businessName || !email || !password) {
            return res.status(400).send("All fields are required.");
        }

        const existingUser = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (existingUser) {
            return res.status(400).send("An account with this email already exists.");
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            email: email.toLowerCase().trim(),
            passwordHash
        });

        await Business.create({
            ownerUserId: user._id,
            name: businessName.trim()
        });

        res.send("Registration successful.");
    } catch (error) {
        console.error("Registration failed:", error);
        res.status(500).send("Registration failed.");
    }
}

module.exports = {
    showRegisterPage,
    handleRegistration
};