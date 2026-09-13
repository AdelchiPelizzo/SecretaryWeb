const path = require("path");

function showRegisterPage(req, res) {
    res.sendFile(path.join(__dirname, "../pages/register.html"));
}

module.exports = {
    showRegisterPage
};