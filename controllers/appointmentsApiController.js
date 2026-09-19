const Business = require("../models/Business");
const CalendarConnection = require("../models/CalendarConnection");
const { google } = require("googleapis");
const oauth2Client = require("../config/google");

function isWithinOpeningHours(start, end, hours) {
    const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday"
    ];

    const dayName = dayNames[start.getDay()];
    const dayHours = hours?.[dayName];

    if (!dayHours || dayHours.closed) {
        return false;
    }

    if (!dayHours.open || !dayHours.close) {
        return false;
    }

    const startMinutes =
        start.getHours() * 60 + start.getMinutes();

    const endMinutes =
        end.getHours() * 60 + end.getMinutes();

    const [openHour, openMinute] =
        dayHours.open.split(":").map(Number);

    const [closeHour, closeMinute] =
        dayHours.close.split(":").map(Number);

    const openingMinutes =
        openHour * 60 + openMinute;

    const closingMinutes =
        closeHour * 60 + closeMinute;

    return (
        startMinutes >= openingMinutes &&
        endMinutes <= closingMinutes
    );
}

async function createAppointment(req, res) {
    try {
        console.log("[API] Appointment request received:");
        console.log(req.body);
        const {
            forwardingNumber,
            title,
            date,
            time,
            duration,
            checkOnly
        } = req.body;

        if (!forwardingNumber) {
            return res.status(400).json({
                success: false,
                error: "Missing forwarding number."
            });
        }

        const business = await Business.findOne({
            forwardingNumber: forwardingNumber
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

        const withinOpeningHours = isWithinOpeningHours(
            startDateTime,
            endDateTime,
            business.hours
        );

/*         if (!withinOpeningHours) {
            return res.status(409).json({
                success: false,
                error: "Requested time is outside business opening hours."
            });
        } */

        const eventsResponse = await calendar.events.list({
            calendarId: calendarConnection.calendarId,
            timeMin: startDateTime.toISOString(),
            timeMax: endDateTime.toISOString(),
            singleEvents: true
        });

        const events = eventsResponse.data.items || [];

        console.log("[DEBUG] Events for requested appointment:", events.map(event => ({
            id: event.id,
            summary: event.summary,
            start: event.start?.dateTime,
            end: event.end?.dateTime
        })));

        const requestedConflict = events.some(event => {
            const eventStart = event.start?.dateTime;
            const eventEnd = event.end?.dateTime;

            if (!eventStart || !eventEnd) {
                return false;
            }

            return (
                startDateTime < new Date(eventEnd) &&
                endDateTime > new Date(eventStart)
            );
        });

        console.log("[DEBUG] withinOpeningHours:", withinOpeningHours);
        console.log("[DEBUG] requestedConflict:", requestedConflict);
        console.log("[DEBUG] start:", startDateTime.toString());
        console.log("[DEBUG] end:", endDateTime.toString());

        if (!withinOpeningHours || requestedConflict) {
            const alternativeSlots = [];

            const checkStart = new Date(startDateTime);
            checkStart.setDate(checkStart.getDate() - 3);
            checkStart.setHours(0, 0, 0, 0);

            const checkEnd = new Date(startDateTime);
            checkEnd.setDate(checkEnd.getDate() + 8);
            checkEnd.setHours(23, 59, 59, 999);

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

            for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {

                const dayStart = new Date(startDateTime);
                dayStart.setDate(dayStart.getDate() + dayOffset);
                dayStart.setHours(0, 0, 0, 0);

                for (let minutes = 0; minutes < 24 * 60; minutes += 30) {

                    const candidateStart = new Date(dayStart);
                    candidateStart.setMinutes(minutes);

                    const candidateEnd = new Date(
                        candidateStart.getTime() + duration * 60 * 1000
                    );

                    if (!isWithinOpeningHours(
                        candidateStart,
                        candidateEnd,
                        business.hours
                    )) {
                        continue;
                    }

                    candidates.push(candidateStart);

                    if (candidates.length >= 30) {
                        break;
                    }
                }

                if (candidates.length >= 30) {
                    break;
                }
            }

/*             const candidates = [];

            for (let i = 1; i <= 4; i++) {
                candidates.push(
                    new Date(startDateTime.getTime() - i * 30 * 60 * 1000)
                );

                candidates.push(
                    new Date(startDateTime.getTime() + i * 30 * 60 * 1000)
                );
            } */

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

                const withinOpeningHours = isWithinOpeningHours(
                    candidateStart,
                    candidateEnd,
                    business.hours
                );

                if (!conflict && withinOpeningHours) {
                    const candidateDate = candidateStart
                        .toISOString()
                        .slice(0, 10);

                    const candidateTime = candidateStart
                        .toTimeString()
                        .slice(0, 5);

                    const candidateSlot = {
                        date: candidateDate,
                        time: candidateTime
                    };

                    if (!alternativeSlots.some(slot =>
                        slot.date === candidateDate &&
                        slot.time === candidateTime
                    )) {
                        alternativeSlots.push(candidateSlot);
                    }
                }

                if (alternativeSlots.length >= 3) {
                    break;
                }
            }

            alternativeSlots.sort((a, b) => {
                const aDateTime = new Date(`${a.date}T${a.time}:00+02:00`);
                const bDateTime = new Date(`${b.date}T${b.time}:00+02:00`);

                return (
                    Math.abs(aDateTime - startDateTime) -
                    Math.abs(bDateTime - startDateTime)
                );
            });

/*             alternativeSlots.sort((a, b) => {
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
            }); */

            console.log("[API] Alternative slots found:", alternativeSlots);

            return res.status(409).json({
                success: false,
                error: "Requested time is not available.",
                availableSlots: alternativeSlots.slice(0, 3)
            });
        }

        if (checkOnly) {
            return res.status(200).json({
                success: true,
                available: true
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