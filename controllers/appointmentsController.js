const path = require("path");
const fs = require("fs");

const User = require("../models/User");
const Business = require("../models/Business");
const SecretaryConfig = require("../models/SecretaryConfig");

async function showAppointmentsPage(req, res) {

    const user = await User.findById(req.session.userId);

    const business = await Business.findOne({
        ownerUserId: req.session.userId
    });

    if (!user || !business) {
        return res.status(404).send("Business not found.");
    }

    const secretaryConfig = await SecretaryConfig.findOne({
        businessId: business._id
    });

    const filePath = path.join(__dirname, "../pages/appointments.html");
    let html = fs.readFileSync(filePath, "utf8");

    const calendarConnected =
        req.session.calendarConnected === true;

    console.log(
        "calendarConnected received by appointments page:",
        calendarConnected
    );

    const calendarConnectionFailed =
        req.session.calendarConnectionFailed === true;

    delete req.session.calendarConnected;
    delete req.session.calendarConnectionFailed;

    html = html.replace(
        "{{LANGUAGE}}",
        business.language || "en"
    );

    html = html.replace(
        "{{APPOINTMENT_DURATION}}",
        secretaryConfig?.appointmentDuration ?? 30
    );

    html = html.replace(
        "{{BOOKING_WINDOW}}",
        secretaryConfig?.bookingWindow ?? 30
    );

    html = html.replace(
        "{{BOOKING_INSTRUCTIONS}}",
        secretaryConfig?.bookingInstructions || ""
    );

    html = html.replace(
        "{{START_TIME}}",
        secretaryConfig?.startTime || ""
    );

    html = html.replace(
        "{{END_TIME}}",
        secretaryConfig?.endTime || ""
    );

    html = html.replace(
        "{{DAYS}}",
        secretaryConfig?.days || "weekdays"
    );

    html = html.replace(
        "{{CALENDAR_CONNECTED}}",
        calendarConnected ? "true" : "false"
    );

    html = html.replace(
        "{{CALENDAR_CONNECTION_FAILED}}",
        calendarConnectionFailed ? "true" : "false"
    );

    res.send(html);
}

async function saveAppointmentSettings(req, res) {

    const business = await Business.findOne({
        ownerUserId: req.session.userId
    });

    if (!business) {
        return res.status(404).send("Business not found.");
    }

    const config = await SecretaryConfig.findOneAndUpdate(
        { businessId: business._id },
        {
            appointmentDuration: Number(req.body.appointmentDuration),
            bookingWindow: Number(req.body.bookingWindow),
            bookingInstructions: req.body.bookingInstructions || "",
            startTime: req.body.startTime || "",
            endTime: req.body.endTime || "",
            days: req.body.days || "weekdays"
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    console.log("Appointment settings saved:", {
        appointmentDuration: config.appointmentDuration,
        bookingWindow: config.bookingWindow,
        bookingInstructions: config.bookingInstructions,
        startTime: config.startTime,
        endTime: config.endTime,
        days: config.days
    });

    res.redirect("/appointments");
}

module.exports = {
    showAppointmentsPage,
    saveAppointmentSettings
};