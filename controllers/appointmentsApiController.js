const Business = require("../models/Business");
const SecretaryConfig = require("../models/SecretaryConfig");
const Appointment = require("../models/Appointment");
const CalendarConnection = require("../models/CalendarConnection");
const SipNumber = require("../models/SipNumber");
const Note = require("../models/Note");
const { google } = require("googleapis");
const oauth2Client = require("../config/google");

function isWithinOpeningHours(start, end, hours, timezone) {

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "long",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    });

    const startParts = formatter.formatToParts(start);
    const endParts = formatter.formatToParts(end);

    const getPart = (parts, type) =>
        parts.find(part => part.type === type)?.value;

    // Appointments must start and end on the same local calendar day.
    if (
        getPart(startParts, "year") !== getPart(endParts, "year") ||
        getPart(startParts, "month") !== getPart(endParts, "month") ||
        getPart(startParts, "day") !== getPart(endParts, "day")
    ) {
        return false;
    }

    const dayName = getPart(startParts, "weekday")?.toLowerCase();
    const dayHours = hours?.[dayName];

    if (!dayHours || dayHours.closed) {
        return false;
    }

    if (!dayHours.open || !dayHours.close) {
        return false;
    }

    const startHour = Number(getPart(startParts, "hour"));
    const startMinute = Number(getPart(startParts, "minute"));

    const endHour = Number(getPart(endParts, "hour"));
    const endMinute = Number(getPart(endParts, "minute"));

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    const [openHour, openMinute] =
        dayHours.open.split(":").map(Number);

    const [closeHour, closeMinute] =
        dayHours.close.split(":").map(Number);

    const openingMinutes = openHour * 60 + openMinute;
    const closingMinutes = closeHour * 60 + closeMinute;

    return (
        startMinutes >= openingMinutes &&
        endMinutes <= closingMinutes
    );
}

function localDateTimeToDate(date, time, timeZone) {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    const targetUtc = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute
    );

    let utcGuess = targetUtc;

    const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    });

    for (let i = 0; i < 4; i++) {
        const parts = formatter.formatToParts(new Date(utcGuess));

        const values = {};

        for (const part of parts) {
            values[part.type] = Number(part.value);
        }

        const representedUtc = Date.UTC(
            values.year,
            values.month - 1,
            values.day,
            values.hour,
            values.minute,
            values.second
        );

        const difference = targetUtc - representedUtc;

        if (difference === 0) {
            break;
        }

        utcGuess += difference;
    }

    const result = new Date(utcGuess);
    const check = formatter.formatToParts(result);

    const actual = {};

    for (const part of check) {
        actual[part.type] = Number(part.value);
    }

    if (
        actual.year !== year ||
        actual.month !== month ||
        actual.day !== day ||
        actual.hour !== hour ||
        actual.minute !== minute
    ) {
        throw new Error("Invalid local date or time for the business timezone.");
    }

    return result;
}

function addDaysToLocalDate(dateString, days) {
    const [year, month, day] = dateString.split("-").map(Number);

    const result = new Date(Date.UTC(
        year,
        month - 1,
        day + days
    ));

    return [
        result.getUTCFullYear(),
        String(result.getUTCMonth() + 1).padStart(2, "0"),
        String(result.getUTCDate()).padStart(2, "0")
    ].join("-");
}

function googleEventOverlaps(event, start, end, timeZone) {
    let eventStart;
    let eventEnd;

    if (event.start?.dateTime && event.end?.dateTime) {
        eventStart = new Date(event.start.dateTime);
        eventEnd = new Date(event.end.dateTime);
    } else if (event.start?.date && event.end?.date) {
        eventStart = localDateTimeToDate(
            event.start.date,
            "00:00",
            timeZone
        );

        eventEnd = localDateTimeToDate(
            event.end.date,
            "00:00",
            timeZone
        );
    } else {
        return false;
    }

    return start < eventEnd && end > eventStart;
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
            description,
            checkOnly
        } = req.body;

        if (
            typeof date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            typeof time !== "string" ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
            !Number.isInteger(Number(duration)) ||
            Number(duration) <= 0 ||
            Number(duration) > 1440
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid appointment date, time or duration."
            });
        }

        const [year, month, day] = date.split("-").map(Number);

        const parsedDate = new Date(Date.UTC(year, month - 1, day));

        if (
            parsedDate.getUTCFullYear() !== year ||
            parsedDate.getUTCMonth() !== month - 1 ||
            parsedDate.getUTCDate() !== day
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid appointment date."
            });
        }

        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: "Appointment title is required."
            });
        }

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
        console.log("[DEBUG] Business timezone:", business.timezone);

        const calendarConnection = await CalendarConnection.findOne({
            businessId: business._id
        });

        let calendar = null;

        if (
            calendarConnection &&
            calendarConnection.connected === true &&
            calendarConnection.accessToken &&
            calendarConnection.calendarId
        ) {
            console.log("[API] Connected Google Calendar found.");

            oauth2Client.setCredentials({
                access_token: calendarConnection.accessToken,
                refresh_token: calendarConnection.refreshToken,
                expiry_date: calendarConnection.tokenExpiry
            });

            calendar = google.calendar({
                version: "v3",
                auth: oauth2Client
            });

            console.log("[API] Google Calendar client configured.");

        } else {
            console.log("[API] No connected Google Calendar. Using MongoDB only.");
        }

        const timeZone = business.timezone || "Europe/Rome";

                let startDateTime;

        try {
            startDateTime = localDateTimeToDate(
                date,
                time,
                timeZone
            );
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: "Invalid appointment time or business timezone."
            });
        }
        const endDateTime = new Date(
            startDateTime.getTime() + duration * 60 * 1000
        );

        const now = new Date();

        const nowFormatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        });

        const nowParts = nowFormatter.formatToParts(now);

        const getNowPart = (type) =>
            nowParts.find(part => part.type === type)?.value;

        const currentLocalDateTime =
            `${getNowPart("year")}-${getNowPart("month")}-${getNowPart("day")} ${getNowPart("hour")}:${getNowPart("minute")}`;

        const requestedLocalDateTime = `${date} ${time}`;

        const requestedTimeHasPassed =
            requestedLocalDateTime < currentLocalDateTime;

        const withinOpeningHours = isWithinOpeningHours(
            startDateTime,
            endDateTime,
            business.hours,
            timeZone
        );

        const mongoAppointments = await Appointment.find({
            businessId: business._id,
            status: { $ne: "cancelled" },
            startAt: { $lt: endDateTime },
            endAt: { $gt: startDateTime }
        });

        let googleEvents = [];

        if (calendar) {
            const eventsResponse = await calendar.events.list({
                calendarId: calendarConnection.calendarId,
                timeMin: startDateTime.toISOString(),
                timeMax: endDateTime.toISOString(),
                showDeleted: false,
                singleEvents: true
            });

            googleEvents = eventsResponse.data.items || [];
        }

        const requestedConflict =
            mongoAppointments.length > 0 ||
            googleEvents.some(event => {
                return googleEventOverlaps(
                    event,
                    startDateTime,
                    endDateTime,
                    timeZone
                );
            });

        console.log("[DEBUG] withinOpeningHours:", withinOpeningHours);
        console.log("[DEBUG] requestedConflict:", requestedConflict);
        console.log("[DEBUG] start:", startDateTime.toString());
        console.log("[DEBUG] end:", endDateTime.toString());

        if (!withinOpeningHours || requestedConflict || requestedTimeHasPassed) {
            const alternativeSlots = [];

            const requestedDateFormatter = new Intl.DateTimeFormat("en-CA", {
                timeZone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            });

            const requestedDateParts = requestedDateFormatter.formatToParts(startDateTime);

            const getRequestedDatePart = type =>
                requestedDateParts.find(part => part.type === type)?.value;

            const requestedLocalDate =
                `${getRequestedDatePart("year")}-${getRequestedDatePart("month")}-${getRequestedDatePart("day")}`;

            const checkStart = localDateTimeToDate(
                addDaysToLocalDate(requestedLocalDate, -3),
                "00:00",
                timeZone
            );

            const checkEnd = localDateTimeToDate(
                addDaysToLocalDate(requestedLocalDate, 9),
                "00:00",
                timeZone
            );

            console.log("[API] Checking alternative availability...");

            const occupiedAppointments = await Appointment.find({
                businessId: business._id,
                status: { $ne: "cancelled" },
                startAt: { $lt: checkEnd },
                endAt: { $gt: checkStart }
            });

            let occupiedEvents = [];

            if (calendar) {
                const alternativeResponse = await calendar.events.list({
                    calendarId: calendarConnection.calendarId,
                    timeMin: checkStart.toISOString(),
                    timeMax: checkEnd.toISOString(),
                    singleEvents: true,
                    showDeleted: false,
                    orderBy: "startTime"
                });

                occupiedEvents = alternativeResponse.data.items || [];
            }

            console.log("[API] Occupied events found:", occupiedEvents.length);

            const candidates = [];

            for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {

                const candidateDate = addDaysToLocalDate(
                    requestedLocalDate,
                    dayOffset
                );

                for (let minutes = 0; minutes < 24 * 60; minutes += 30) {

                    const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
                    const minute = String(minutes % 60).padStart(2, "0");
                    const candidateTime = `${hour}:${minute}`;

                    let candidateStart;

                    try {
                        candidateStart = localDateTimeToDate(
                            candidateDate,
                            candidateTime,
                            timeZone
                        );
                    } catch (error) {
                        // Skip local times that do not exist during daylight-saving changes.
                        continue;
                    }

                    const candidateEnd = new Date(
                        candidateStart.getTime() + Number(duration) * 60 * 1000
                    );

                    if (!isWithinOpeningHours(
                        candidateStart,
                        candidateEnd,
                        business.hours,
                        timeZone
                    )) {
                        continue;
                    }

                    candidates.push(candidateStart);

                }
            }

            for (const candidateStart of candidates) {

                const candidateEnd = new Date(
                    candidateStart.getTime() + Number(duration) * 60 * 1000
                );

                if (candidateStart < now) {
                    continue;
                }

                const mongoConflict = occupiedAppointments.some(appointment =>
                    candidateStart < appointment.endAt &&
                    candidateEnd > appointment.startAt
                );

                const googleConflict = occupiedEvents.some(event => {
                    return googleEventOverlaps(
                        event,
                        candidateStart,
                        candidateEnd,
                        timeZone
                    );
                });

                const conflict = mongoConflict || googleConflict;

                const withinOpeningHours = isWithinOpeningHours(
                    candidateStart,
                    candidateEnd,
                    business.hours,
                    timeZone
                );

                if (!conflict && withinOpeningHours) {

                    const localFormatter = new Intl.DateTimeFormat("en-CA", {
                        timeZone,
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hourCycle: "h23"
                    });

                    const localParts = localFormatter.formatToParts(candidateStart);

                    const getLocalPart = type =>
                        localParts.find(part => part.type === type)?.value;

                    const candidateDate =
                        `${getLocalPart("year")}-${getLocalPart("month")}-${getLocalPart("day")}`;

                    const candidateTime =
                        `${getLocalPart("hour")}:${getLocalPart("minute")}`;

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
            }

            alternativeSlots.sort((a, b) => {

                const aDateTime = localDateTimeToDate(
                    a.date,
                    a.time,
                    timeZone
                );

                const bDateTime = localDateTimeToDate(
                    b.date,
                    b.time,
                    timeZone
                );

                return (
                    Math.abs(aDateTime.getTime() - startDateTime.getTime()) -
                    Math.abs(bDateTime.getTime() - startDateTime.getTime())
                );
            });

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

        console.log("=== APPOINTMENT DESCRIPTION DEBUG ===");
        console.log("Description received:", description);
        console.log("=====================================");

        const appointment = await Appointment.create({
            businessId: business._id,
            title,
            description: description || "",
            startAt: startDateTime,
            endAt: endDateTime,
            duration: Number(duration),
            timezone: timeZone,
            status: "booked",
            source: "telephone",
            syncStatus: calendar ? "pending" : "not_connected"
        });

        let googleEventId = null;

        if (calendar) {
            try {
                const createdEvent = await calendar.events.insert({
                    calendarId: calendarConnection.calendarId,
                    requestBody: {
                        summary: title,
                        description: description || "",
                        start: { dateTime: startDateTime.toISOString() },
                        end: { dateTime: endDateTime.toISOString() }
                    }
                });

                googleEventId = createdEvent.data.id;

                appointment.calendarProvider = calendarConnection.provider;
                appointment.externalEventId = googleEventId;
                appointment.syncStatus = "synced";

                await appointment.save();
            } catch (googleError) {
                console.error(
                    "[API] Google Calendar sync failed:",
                    googleError.message
                );

                appointment.syncStatus = "failed";
                await appointment.save();
            }
        }

        console.log("[API] Appointment created:");
        console.log("Appointment ID:", appointment._id);
        console.log("Title:", appointment.title);
        console.log("Google Event ID:", googleEventId);
        console.log("Sync Status:", appointment.syncStatus);

        return res.json({
            success: true,
            message: "Appointment created successfully.",
            businessId: business._id,
            businessName: business.name,
            eventId: appointment._id,
            appointment: {
                title: appointment.title,
                description: appointment.description,
                startAt: appointment.startAt,
                endAt: appointment.endAt,
                duration: appointment.duration,
                timezone: appointment.timezone,
                status: appointment.status,
                source: appointment.source,
                syncStatus: appointment.syncStatus,
                calendarProvider: appointment.calendarProvider || null,
                externalEventId: appointment.externalEventId || null
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

async function getSecretaryConfig(req, res) {
    try {
        const { forwardingNumber } = req.query;

        if (!forwardingNumber) {
            return res.status(400).json({
                success: false,
                error: "Missing forwarding number."
            });
        }

        // 1. Find the SIP number called by the caller.
        const sipNumber = await SipNumber.findOne({
            number: forwardingNumber
        });

        if (!sipNumber) {
            return res.status(403).json({
                success: false,
                error: "SIP number is not authorized."
            });
        }

        // 2. Reject inactive SIP numbers.
        if (sipNumber.sip?.active !== true) {
            return res.status(403).json({
                success: false,
                error: "SIP number is deactivated."
            });
        }

        // 3. Reject numbers that are not currently assigned.
        if (
            sipNumber.status !== "assigned" ||
            !sipNumber.businessId
        ) {
            return res.status(403).json({
                success: false,
                error: "SIP number is not assigned to a business."
            });
        }

        // 4. Find the business currently assigned to this number.
        // Both fields must match the current SIP-number record.
        const business = await Business.findOne({
            _id: sipNumber.businessId,
            forwardingNumber: sipNumber.number
        });

        if (!business) {
            return res.status(403).json({
                success: false,
                error: "Current SIP-number assignment is invalid."
            });
        }

        console.log(
            "[API] Authorized SIP number:",
            forwardingNumber,
            "Business:",
            business.name,
            "Business ID:",
            business._id
        );

        // 5. Retrieve the current business's Secretary configuration.
        const config = await SecretaryConfig.findOne({
            businessId: business._id
        });

        if (!config) {
            return res.status(404).json({
                success: false,
                error: "Secretary configuration not found."
            });
        }

        // Check whether the business has a connected calendar.
        const calendarConnection = await CalendarConnection.findOne({
            businessId: business._id
        });

        const calendarConnected = calendarConnection?.connected === true;

        // 6. Return configuration only after authorization.
        return res.json({
            success: true,

            businessName: business.name,
            calendarConnected,

            paymentStatus: business.paymentStatus,
            trialStartedAt: business.trialStartedAt,
            trialEndsAt: business.trialEndsAt,
            paymentValidUntil: business.paymentValidUntil,

            language: config.language,
            secretaryName: config.secretaryName,
            secretaryType: config.secretaryType,
            personality: config.personality,
            greeting: config.greeting,
            instructions: config.instructions,
            supportedLanguages: config.supportedLanguages || []
        });

    } catch (error) {
        console.error(
            "[API] Secretary config error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
}


async function createNote(req, res) {
    try {
        console.log("=== CREATE NOTE REQUEST ===");
        console.log("Body:", req.body);

        const {
            forwardingNumber,
            text,
            callerNumber
        } = req.body;

        if (!forwardingNumber) {
            return res.status(400).json({
                success: false,
                message: "Missing forwardingNumber."
            });
        }

        if (!text) {
            return res.status(400).json({
                success: false,
                message: "Missing note text."
            });
        }

        const business = await Business.findOne({
            forwardingNumber
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found."
            });
        }

        const note = await Note.create({
            businessId: business._id,
            callerNumber: callerNumber || null,
            text,
            source: "call"
        });

        console.log("Note created:", note._id);

        return res.status(201).json({
            success: true,
            noteId: note._id
        });

    } catch (error) {
        console.error("Failed to create note:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create note."
        });
    }
}

module.exports = {
    createAppointment,
    createNote,
    getSecretaryConfig
};