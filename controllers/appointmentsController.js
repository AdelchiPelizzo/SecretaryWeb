const path = require("path");

function showAppointmentsPage(req, res) {
    res.sendFile(path.join(__dirname, "../pages/appointments.html"));
}

module.exports = {
    showAppointmentsPage
};