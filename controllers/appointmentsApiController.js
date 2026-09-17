const Business = require("../models/Business");
const CalendarConnection = require("../models/CalendarConnection");
const { google } = require("googleapis");
const oauth2Client = require("../config/google");

async function createAppointment(req, res) {
    try {
        console.log("[API] Appointment request received:");
        console.log(req.body);

        const {
            forwardingNumber,
            title,
            date,
            time,
            duration
        } = req.body;

        if (!forwardingNumber) {
            return res.status(400).json({
                success: false,
                error: "Missing forwarding number."
            });
        }

        const business = await Business.findOne({
            phone: forwardingNumber
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                error: "Business not found."
            });
        }

        console.log("[API] Business identified:");
        console.log("Business ID:", business._id);
        console.log("Business name:", business.name);

        const calendarConnection = await CalendarConnection.findOne({
            businessId: business._id
        });

        if (!calendarConnection) {
            return res.status(404).json({
                success: false,
                error: "Calendar connection not found."
            });
        }

        console.log("[API] Calendar connection found:");
        console.log("Provider:", calendarConnection.provider);
        console.log("Calendar ID:", calendarConnection.calendarId);
        console.log("Connected:", calendarConnection.connected);

        oauth2Client.setCredentials({
            access_token: calendarConnection.accessToken,
            refresh_token: calendarConnection.refreshToken,
            expiry_date: calendarConnection.tokenExpiry
        });

        const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client
        });

        const calendarInfo = await calendar.calendars.get({
            calendarId: calendarConnection.calendarId
        });

        console.log("[API] Google Calendar accessed:");
        console.log("Calendar:", calendarInfo.data.summary);

        const startDateTime = new Date(`${date}T${time}:00+02:00`);
        const endDateTime = new Date(
            startDateTime.getTime() + duration * 60 * 1000
        );

        const eventsResponse = await calendar.events.list({
            calendarId: calendarConnection.calendarId,
            timeMin: startDateTime.toISOString(),
            timeMax: endDateTime.toISOString(),
            singleEvents: true
        });

        const events = eventsResponse.data.items || [];

        if (events.length > 0) {
            return res.status(409).json({
                success: false,
                error: "Requested time is not available."
            });
        }

        const createdEvent = await calendar.events.insert({
            calendarId: calendarConnection.calendarId,
            requestBody: {
                summary: title,
                start: {
                    dateTime: startDateTime.toISOString()
                },
                end: {
                    dateTime: endDateTime.toISOString()
                }
            }
        });

        console.log("[API] Appointment created:");
        console.log("Event ID:", createdEvent.data.id);
        console.log("Title:", createdEvent.data.summary);

        return res.json({
            success: true,
            message: "Appointment created successfully.",
            businessId: business._id,
            businessName: business.name,
            eventId: createdEvent.data.id,
            appointment: {
                title,
                date,
                time,
                duration
            }
        });

    } catch (error) {
        console.error("[API] Appointment error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
}

module.exports = {
    createAppointment
};