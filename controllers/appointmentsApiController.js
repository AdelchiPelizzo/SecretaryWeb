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
            const alternativeSlots = [];

            const checkStart = new Date(startDateTime);
            checkStart.setHours(checkStart.getHours() - 2);

            const checkEnd = new Date(endDateTime);
            checkEnd.setHours(checkEnd.getHours() + 2);

            console.log("[API] Checking alternative availability...");

            const alternativeResponse = await calendar.events.list({
                calendarId: calendarConnection.calendarId,
                timeMin: checkStart.toISOString(),
                timeMax: checkEnd.toISOString(),
                singleEvents: true,
                orderBy: "startTime"
            });

            console.log("[API] Alternative availability received.");

            const occupiedEvents = alternativeResponse.data.items || [];

            console.log("[API] Occupied events found:", occupiedEvents.length);

            const candidates = [];

            for (let i = 1; i <= 4; i++) {
                candidates.push(
                    new Date(startDateTime.getTime() - i * 30 * 60 * 1000)
                );

                candidates.push(
                    new Date(startDateTime.getTime() + i * 30 * 60 * 1000)
                );
            }

            for (const candidateStart of candidates) {
                const candidateEnd = new Date(
                    candidateStart.getTime() + duration * 60 * 1000
                );

                const conflict = occupiedEvents.some(event => {
                    const eventStart = event.start?.dateTime;
                    const eventEnd = event.end?.dateTime;

                    if (!eventStart || !eventEnd) {
                        return false;
                    }

                    return (
                        candidateStart < new Date(eventEnd) &&
                        candidateEnd > new Date(eventStart)
                    );
                });

                if (!conflict) {
                    alternativeSlots.push(
                        candidateStart.toTimeString().slice(0, 5)
                    );
                }

                if (alternativeSlots.length >= 3) {
                    break;
                }
            }

            alternativeSlots.sort((a, b) => {
                const requestedMinutes =
                    startDateTime.getHours() * 60 + startDateTime.getMinutes();

                const [aHour, aMinute] = a.split(":").map(Number);
                const [bHour, bMinute] = b.split(":").map(Number);

                const aMinutes = aHour * 60 + aMinute;
                const bMinutes = bHour * 60 + bMinute;

                return (
                    Math.abs(aMinutes - requestedMinutes) -
                    Math.abs(bMinutes - requestedMinutes)
                );
            });

            console.log("[API] Alternative slots found:", alternativeSlots);

            return res.status(409).json({
                success: false,
                error: "Requested time is not available.",
                availableSlots: alternativeSlots
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