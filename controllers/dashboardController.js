const path = require("path");
const fs = require("fs");

const User = require("../models/User");
const Business = require("../models/Business");
const {
    getBusinessProgress,
    getSecretaryProgress,
} = require("../utils/setupProgress");

const SecretaryConfig = require("../models/SecretaryConfig");

const CalendarConnection = require("../models/CalendarConnection");

const Note = require("../models/Note");
const { google } = require("googleapis");

async function showDashboardPage(req, res) {

    const user = await User.findById(req.session.userId);

    const business = await Business.findOne({
        ownerUserId: req.session.userId
    });

    if (!user || !business) {
        return res.status(404).send("Business not found.");
    }

    const progress = getBusinessProgress(Business, business);

    const secretaryConfig = await SecretaryConfig.findOne({
        businessId: business._id
    });

    const recentNotes = await Note.find({
        businessId: business._id
    })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

    const calendarConnection = await CalendarConnection.findOne({
        businessId: business._id,
        connected: true
    });

    let recentAppointments = [];

    if (calendarConnection?.calendarId) {

        const oauth2Client = require("../config/google");

        oauth2Client.setCredentials({
            access_token: calendarConnection.accessToken,
            refresh_token: calendarConnection.refreshToken
        });

        const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client
        });

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const eventsResponse = await calendar.events.list({
            calendarId: calendarConnection.calendarId,
            timeMin: startDate.toISOString(),
            timeMax: new Date().toISOString(),
            singleEvents: true,
            orderBy: "startTime",
            maxResults: 10
        });
        recentAppointments = eventsResponse.data.items || [];
        
    }

    const activities = [
        ...recentNotes.map(note => ({
            date: note.createdAt,
            type: "Note"
        })),

        ...recentAppointments.map(event => ({
            date: event.start?.dateTime || event.start?.date,
            type: "Appointment"
        }))
    ]
        .filter(activity => activity.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

    const calendarConnected = !!calendarConnection;

    const calendarPercentage = calendarConnected ? 100 : 0;

    const emailConnected =
    !!calendarConnection?.accountEmail;

    const overallActive =
        emailConnected && calendarConnected;

    console.log("Email connected:", emailConnected);
    console.log("Calendar connected:", calendarConnected);
    console.log("Overall status active:", overallActive);
    console.log("Calendar percentage:", calendarPercentage);

    console.log("Calendar connected:", calendarConnected);

    const secretaryProgress = secretaryConfig
        ? getSecretaryProgress(SecretaryConfig, secretaryConfig)
        : {
            total: 0,
            filled: 0,
            percentage: 0
        };

    console.log("Secretary progress:", secretaryProgress);
    console.log("Logged-in business:", business.name);
    console.log("Business progress:", progress);

    const registrationSuccess = req.session.registrationSuccess === true;
    delete req.session.registrationSuccess;

    const filePath = path.join(__dirname, "../pages/dashboard.html");
    let html = fs.readFileSync(filePath, "utf8");

    const language = business.language || "en";

    const localePath = path.join(
        __dirname,
        "../locales",
        `${language}.json`
    );

    let translations = {};

    if (fs.existsSync(localePath)) {
        translations = JSON.parse(
            fs.readFileSync(localePath, "utf8")
        );
    }

    html = html.replace(
        "{{LANGUAGE}}",
        business.language || "en"
    );

    html = html.replace(
        "{{TRANSLATIONS_JSON}}",
        JSON.stringify(translations)
    );

    html = html.replace(
        "{{BUSINESS_NAME}}",
        business.name
    );

    html = html.replace(
        "{{REGISTRATION_SUCCESS}}",
        registrationSuccess ? "true" : "false"
    );

    html = html.replace(
        "{{OVERALL_STATUS_TEXT}}",
        overallActive ? "Active" : "Inactive"
    );

    html = html.replace(
        "{{OVERALL_STATUS}}",
        overallActive ? "active" : "inactive"
    );

    html = html.replace(
        "{{OVERALL_STATUS_DESCRIPTION_KEY}}",
        overallActive
            ? "dashboard.connection_active"
            : "dashboard.connection_inactive"
    );

    html = html.replaceAll(
        "{{BUSINESS_PERCENTAGE}}",
        String(progress.percentage)
    );

    html = html.replaceAll(
        "{{SECRETARY_PERCENTAGE}}",
        String(secretaryProgress.percentage)
    );

    console.log("Business percentage in HTML:", progress.percentage);
    console.log(
        "Placeholder still present:",
        html.includes("{{BUSINESS_PERCENTAGE}}")
    );

    html = html.replaceAll(
        "{{CALENDAR_PERCENTAGE}}",
        String(calendarPercentage)
    );

    html = html.replace(
        "{{ACTIVITIES_JSON}}",
        JSON.stringify(activities)
    );

    res.send(html);
}

module.exports = {
    showDashboardPage
};