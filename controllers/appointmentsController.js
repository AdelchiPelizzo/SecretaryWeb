const path = require("path");
const fs = require("fs");

const User = require("../models/User");
const Business = require("../models/Business");

async function showAppointmentsPage(req, res) {

    const user = await User.findById(req.session.userId);

    const business = await Business.findOne({
        ownerUserId: req.session.userId
    });

    if (!user || !business) {
        return res.status(404).send("Business not found.");
    }

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
        "{{CALENDAR_CONNECTED}}",
        calendarConnected ? "true" : "false"
    );

    html = html.replace(
        "{{CALENDAR_CONNECTION_FAILED}}",
        calendarConnectionFailed ? "true" : "false"
    );

    res.send(html);
}

module.exports = {
    showAppointmentsPage
};