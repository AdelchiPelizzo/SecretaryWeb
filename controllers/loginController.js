const path = require("path");

function showLoginPage(req, res) {
res.sendFile(path.join(__dirname, "../pages/login.html"));
}

module.exports = {
showLoginPage
};
