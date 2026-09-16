const express = require("express");
const oauth2Client = require("../config/google");
const Business = require("../models/Business");
const CalendarConnection = require("../models/CalendarConnection");

const router = express.Router();

router.get("/calendar/connect", (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/calendar"
        ]
    });

    res.redirect(authUrl);
});

router.get("/calendar/callback", async (req, res) => {
    try {
        const { code } = req.query;

        const { tokens } = await oauth2Client.getToken(code);

        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        console.log("Google OAuth tokens received.");

        const connection = await CalendarConnection.findOneAndUpdate(
            { businessId: business._id },
            {
                businessId: business._id,
                provider: "google",
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenExpiry: tokens.expiry_date
                    ? new Date(tokens.expiry_date)
                    : null,
                connected: true
            },
            {
                new: true,
                upsert: true
            }
        );

        res.send("Google Calendar connected successfully.");
    } catch (error) {
        console.error("Google OAuth failed:", error);
        res.status(500).send("Google Calendar connection failed.");
    }
});

module.exports = router;