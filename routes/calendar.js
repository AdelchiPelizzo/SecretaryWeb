const express = require("express");
const oauth2Client = require("../config/google");
const { google } = require("googleapis");
const Business = require("../models/Business");
const CalendarConnection = require("../models/CalendarConnection");
const Appointment = require("../models/Appointment");
const requireAuth = require("../middleware/auth");
const { showCalendarPage } = require("../controllers/calendarController");

const router = express.Router();
router.get("/calendar", requireAuth, showCalendarPage);

router.post("/calendar/connect", requireAuth, async (req, res) => {
    try {
        if (req.body.calendarConsent !== "on") {
            return res.status(400).send(
                "You must accept the Google Calendar privacy notice before connecting."
            );
        }

        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        business.googleCalendarConsent = {
            granted: true,
            grantedAt: new Date(),
            policyVersion: "2026-11-18-v1"
        };

        await business.save();

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            scope: [
                "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
                "https://www.googleapis.com/auth/calendar.events.owned",
                "https://www.googleapis.com/auth/userinfo.email"
            ]
        });

        res.redirect(authUrl);

    } catch (error) {
        console.error("Google Calendar connection error:", error);
        res.status(500).send("Unable to start Google Calendar connection.");
    }
});

router.get("/calendar/callback", requireAuth, async (req, res) => {
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

        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({
            version: "v2",
            auth: oauth2Client
        });

        const userInfo = await oauth2.userinfo.get();

        const accountEmail = userInfo.data.email;

        console.log("Google account email:", accountEmail);

        const connection = await CalendarConnection.findOneAndUpdate(
            { businessId: business._id },
            {
                businessId: business._id,
                provider: "google",
                accountEmail: accountEmail,
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

        req.session.calendarConnected = true;

        console.log(
            "calendarConnected session flag set:",
            req.session.calendarConnected
        );

        req.session.save((err) => {
            if (err) {
                console.error(
                    "Could not save calendar connection session:",
                    err
                );

                return res.status(500).send(
                    "Could not save calendar connection status."
                );
            }

            res.redirect("/appointments");
        });
    } catch (error) {
        console.error("Google OAuth failed:", error);

        req.session.calendarConnectionFailed = true;

        res.redirect("/appointments");
    }
});

router.get("/calendar/list", requireAuth, async (req, res) => {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        const connection = await CalendarConnection.findOne({
            businessId: business._id,
            connected: true
        });

        if (!connection) {
            return res.status(404).json({
                error: "Google Calendar not connected."
            });
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

        res.status(500).json({
            error: "Failed to load Google calendars."
        });
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

        res.status(500).send(
            "Failed to save selected calendar."
        );
    }
});

router.get("/calendar/events", requireAuth, async (req, res) => {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({
                error: "Start and end dates are required."
            });
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime()) ||
            endDate <= startDate
        ) {
            return res.status(400).json({
                error: "Invalid date range."
            });
        }

        const appointments = await Appointment.find({
            businessId: business._id,
            status: { $ne: "cancelled" },
            startAt: { $lt: endDate },
            endAt: { $gt: startDate }
        }).sort({ startAt: 1 });

        res.json({
            calendarId: null,
            events: appointments.map(appointment => ({
                id: appointment._id.toString(),
                summary: appointment.title || "",
                description: appointment.description || "",
                location: appointment.location || "",
                start: {
                    dateTime: appointment.startAt.toISOString()
                },
                end: {
                    dateTime: appointment.endAt.toISOString()
                },
                customerName: appointment.customerName || "",
                customerPhone: appointment.customerPhone || "",
                service: appointment.service || "",
                duration: appointment.duration,
                status: appointment.status,
                source: appointment.source
            }))
        });

    } catch (error) {
        console.error("Loading calendar appointments failed:", error);

        res.status(500).json({
            error: "Failed to load calendar appointments."
        });
    }
});

router.get("/calendar/availability", requireAuth, async (req, res) => {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({
                error: "Start and end times are required."
            });
        }

        const availabilityStart = new Date(start);
        const availabilityEnd = new Date(end);

        if (
            Number.isNaN(availabilityStart.getTime()) ||
            Number.isNaN(availabilityEnd.getTime()) ||
            availabilityEnd <= availabilityStart
        ) {
            return res.status(400).json({
                error: "Invalid date range."
            });
        }

        const appointments = await Appointment.find({
            businessId: business._id,
            status: { $ne: "cancelled" },
            startAt: { $lt: availabilityEnd },
            endAt: { $gt: availabilityStart }
        }).sort({ startAt: 1 });

        let googleEvents = [];

        const connection = await CalendarConnection.findOne({
            businessId: business._id,
            connected: true
        });

        if (connection && connection.calendarId) {
            oauth2Client.setCredentials({
                access_token: connection.accessToken,
                refresh_token: connection.refreshToken
            });

            const calendar = google.calendar({
                version: "v3",
                auth: oauth2Client
            });

            const eventsResponse = await calendar.events.list({
                calendarId: connection.calendarId,
                timeMin: availabilityStart.toISOString(),
                timeMax: availabilityEnd.toISOString(),
                singleEvents: true,
                showDeleted: false,
                orderBy: "startTime"
            });

            googleEvents = eventsResponse.data.items || [];
        }

        res.json({
            available: appointments.length === 0 && googleEvents.length === 0,

            events: [
                ...appointments.map(appointment => ({
                    id: appointment._id.toString(),
                    summary: appointment.title || "",
                    start: {
                        dateTime: appointment.startAt.toISOString()
                    },
                    end: {
                        dateTime: appointment.endAt.toISOString()
                    }
                })),

                ...googleEvents.map(event => ({
                    id: event.id,
                    summary: event.summary || "",
                    start: event.start,
                    end: event.end
                }))
            ]
        });

    } catch (error) {
        console.error(
            "Checking appointment availability failed:",
            error
        );

        res.status(500).json({
            error: "Failed to check appointment availability."
        });
    }
});

router.delete("/calendar/event/:id", requireAuth, async (req, res) => {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        const appointment = await Appointment.findOne({
            _id: req.params.id,
            businessId: business._id
        });

        if (!appointment) {
            return res.status(404).json({
                error: "Appointment not found."
            });
        }

        if (appointment.status === "cancelled") {
            return res.status(400).json({
                error: "Appointment is already cancelled."
            });
        }

        // Delete the corresponding Google Calendar event first.
        if (
            appointment.calendarProvider === "google" &&
            appointment.externalEventId
        ) {
            const connection = await CalendarConnection.findOne({
                businessId: business._id,
                provider: "google"
            });

            if (
                !connection ||
                !connection.calendarId ||
                !connection.refreshToken
            ) {
                return res.status(409).json({
                    error: "Google Calendar connection is unavailable. Appointment was not cancelled."
                });
            }

            oauth2Client.setCredentials({
                access_token: connection.accessToken,
                refresh_token: connection.refreshToken
            });

            const calendar = google.calendar({
                version: "v3",
                auth: oauth2Client
            });

            try {
                await calendar.events.delete({
                    calendarId: connection.calendarId,
                    eventId: appointment.externalEventId
                });

                console.log(
                    "Google Calendar event deleted:",
                    appointment.externalEventId
                );

            } catch (googleError) {

                const googleStatus =
                    googleError.code ||
                    googleError.response?.status;

                // A 404 or 410 means the event is already absent.
                if (googleStatus !== 404 && googleStatus !== 410) {
                    throw googleError;
                }

                console.log(
                    "Google Calendar event was already deleted:",
                    appointment.externalEventId
                );
            }
        }

        // Only cancel the appointment after Google deletion succeeds.
        appointment.status = "cancelled";

        await appointment.save();

        return res.json({
            success: true,
            message: "Appointment cancelled and Google Calendar synchronisation completed."
        });

    } catch (error) {
        console.error("Cancelling appointment failed:", error);

        return res.status(500).json({
            error: "Failed to cancel appointment."
        });
    }
});

router.post("/calendar/event", requireAuth, async (req, res) => {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        const { summary, start, end, description, location } = req.body;

        if (!summary || !start || !end) {
            return res.status(400).json({
                error: "Summary, start, and end are required."
            });
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime()) ||
            endDate <= startDate
        ) {
            return res.status(400).json({
                error: "Invalid appointment date or time."
            });
        }

        const duration = Math.round(
            (endDate.getTime() - startDate.getTime()) / 60000
        );

        const appointment = await Appointment.create({
            businessId: business._id,
            title: summary.trim(),
            description: description || "",
            location: location || "",
            startAt: startDate,
            endAt: endDate,
            duration,
            timezone: business.timezone || "Europe/Rome",
            status: "booked",
            source: "manual",
            syncStatus: "not_connected"
        });

        res.status(201).json({
            success: true,
            event: {
                id: appointment._id.toString(),
                summary: appointment.title,
                description: appointment.description,
                location: appointment.location,
                start: {
                    dateTime: appointment.startAt.toISOString()
                },
                end: {
                    dateTime: appointment.endAt.toISOString()
                }
            }
        });

    } catch (error) {
        console.error("Creating appointment failed:", error);

        res.status(500).json({
            error: "Failed to create appointment."
        });
    }
});

module.exports = router;