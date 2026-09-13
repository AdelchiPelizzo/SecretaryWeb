const path = require("path");

function showDashboardPage(req, res) {
res.sendFile(path.join(__dirname, "../pages/dashboard.html"));
}

module.exports = {
showDashboardPage
};
