const path = require("path");
const fs = require("fs");

const User = require("../models/User");

async function showDashboardPage(req, res) {

    const user = await User.findById(req.session.userId);

    console.log("Logged-in user:", user.email);

    const filePath = path.join(__dirname, "../pages/dashboard.html");
    let html = fs.readFileSync(filePath, "utf8");

    html = html.replace("{{USER_EMAIL}}", user.email);

    res.send(html);

}

module.exports = {
showDashboardPage
};
