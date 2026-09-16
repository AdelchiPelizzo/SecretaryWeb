const express = require("express");
const oauth2Client = require("../config/google");
const { google } = require("googleapis");
const Business = require("../models/Business");
const CalendarConnection = require("../models/CalendarConnection");
const requireAuth = require("../middleware/auth");

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

        oauth2Client.setCredentials(tokens);

        const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client
        });

        const calendarList = await calendar.calendarList.list();

        console.log(
            "Google calendars found:",
            calendarList.data.items.map(item => ({
                id: item.id,
                summary: item.summary
            }))
        );

        res.send("Google Calendar connected successfully.");
    } catch (error) {
        console.error("Google OAuth failed:", error);
        res.status(500).send("Google Calendar connection failed.");
    }
});

router.get("/calendar/list", requireAuth, async (req, res) => {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).json({ error: "Business not found." });
        }

        const connection = await CalendarConnection.findOne({
            businessId: business._id,
            connected: true
        });

        if (!connection) {
            return res.status(404).json({ error: "Google Calendar not connected." });
        }

        oauth2Client.setCredentials({
            access_token: connection.accessToken,
            refresh_token: connection.refreshToken
        });

        const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client
        });

        const calendarList = await calendar.calendarList.list();

        res.json({
            selectedCalendarId: connection.calendarId || "",
            calendars: calendarList.data.items.map(item => ({
                id: item.id,
                summary: item.summary
            }))
        });
    } catch (error) {
        console.error("Loading Google calendars failed:", error);
        res.status(500).json({ error: "Failed to load Google calendars." });
    }
});

router.post("/calendar/select", requireAuth, async (req, res) => {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        await CalendarConnection.findOneAndUpdate(
            { businessId: business._id },
            {
                calendarId: req.body.calendarId
            }
        );

        res.redirect("/appointments");
    } catch (error) {
        console.error("Saving selected calendar failed:", error);
        res.status(500).send("Failed to save selected calendar.");
    }
});

module.exports = router;