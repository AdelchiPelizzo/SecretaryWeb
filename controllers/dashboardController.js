const path = require("path");
const fs = require("fs");

const User = require("../models/User");
const Business = require("../models/Business");

async function showDashboardPage(req, res) {

    const user = await User.findById(req.session.userId);

    const business = await Business.findOne({
        ownerUserId: req.session.userId
    });

    if (!user || !business) {
        return res.status(404).send("Business not found.");
    }

    console.log("Logged-in business:", business.name);
    const registrationSuccess = req.session.registrationSuccess === true;
    delete req.session.registrationSuccess;

    const filePath = path.join(__dirname, "../pages/dashboard.html");
    let html = fs.readFileSync(filePath, "utf8");

    html = html.replace(
        "{{LANGUAGE}}",
        business.language || "en"
    );

    html = html.replace(
        "{{BUSINESS_NAME}}",
        business.name
    );

    html = html.replace(
        "{{REGISTRATION_SUCCESS}}",
        registrationSuccess ? "true" : "false"
    );

    res.send(html);
}

module.exports = {
    showDashboardPage
};