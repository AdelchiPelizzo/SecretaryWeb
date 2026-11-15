const path = require("path");
const fs = require("fs");
const Business = require("../models/Business");

async function showCalendarPage(req, res) {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        const language = business.language === "it" ? "it" : "en";

        const filePath = path.join(__dirname, "../pages/calendar.html");
        let html = fs.readFileSync(filePath, "utf8");

        html = html.replace("{{LANGUAGE}}", language);

        res.type("html").send(html);

    } catch (error) {
        console.error("Loading calendar page failed:", error);
        res.status(500).send("Could not load calendar page.");
    }
}

module.exports = {
    showCalendarPage
};