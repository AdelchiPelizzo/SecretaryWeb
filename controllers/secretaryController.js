const path = require("path");

function showSecretaryPage(req, res) {
    res.sendFile(path.join(__dirname, "../pages/secretary.html"));
}

module.exports = {
    showSecretaryPage
};