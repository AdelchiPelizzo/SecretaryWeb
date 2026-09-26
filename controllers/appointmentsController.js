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

    html = html.replace(
        "{{LANGUAGE}}",
        business.language || "en"
    );

    res.send(html);
}

module.exports = {
    showAppointmentsPage
};