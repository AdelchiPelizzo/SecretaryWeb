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

    const filePath = path.join(__dirname, "../pages/dashboard.html");
    let html = fs.readFileSync(filePath, "utf8");

    html = html.replace(
        "{{BUSINESS_NAME}}",
        business.name
    );

    res.send(html);
}

module.exports = {
    showDashboardPage
};