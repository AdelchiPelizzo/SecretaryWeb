const path = require("path");
const bcrypt = require("bcrypt");

const User = require("../models/User");
const Business = require("../models/Business");
const SipNumber = require("../models/SipNumber");
const {
    assignAvailableSipNumber
} = require("../utils/sipNumberAllocator");

const {
    generatePaymentReference
} = require("../utils/paymentReference");

function showRegisterPage(req, res) {
    res.sendFile(path.join(__dirname, "../pages/register.html"));
}

async function handleRegistration(req, res) {
    try {
        const { businessName, email, password, language } = req.body;

        const supportedLanguages = [
            "ar", "bg", "cs", "da", "de", "el", "en", "es",
            "fi", "fr", "ga", "hr", "hu", "it", "ja", "nl",
            "pl", "pt", "ro", "ru", "sk", "sl", "sv", "zh"
        ];

        const selectedLanguage = supportedLanguages.includes(language)
            ? language
            : "en";

        if (!businessName || !email || !password) {
            return res.status(400).send("All fields are required.");
        }

        const existingUser = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (existingUser) {
            return res.status(400).send("An account with this email already exists.");
        }

        const availableSipNumber = await SipNumber.findOne({
            status: "available",
            businessId: null
        }).select("_id");

        if (!availableSipNumber) {
            return res.status(503).send(
                "No SIP destination number is currently available. Please try again later."
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            email: email.toLowerCase().trim(),
            passwordHash
        });

        const paymentReference =
            await generatePaymentReference();

        const business = await Business.create({
            ownerUserId: user._id,
            name: businessName.trim(),
            language: selectedLanguage,

            paymentReference,

            trialStartedAt: new Date(),

            trialEndsAt: new Date(
                Date.now() + 15 * 24 * 60 * 60 * 1000
            ),

            paymentStatus: "trial"
        });

        const assignedNumber = await assignAvailableSipNumber(
            business._id
        );

        if (!assignedNumber) {
            await Business.deleteOne({ _id: business._id });
            await User.deleteOne({ _id: user._id });

            return res.status(503).send(
                "No SIP destination number is currently available. Please try again later."
            );
        }

        req.session.userId = user._id;
        req.session.registrationSuccess = true;
        res.redirect("/dashboard");
    } catch (error) {
        console.error("Registration failed:", error);
        res.status(500).send("Registration failed.");
    }
}

module.exports = {
    showRegisterPage,
    handleRegistration
};