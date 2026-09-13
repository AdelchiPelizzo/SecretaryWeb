const path = require("path");

function showBusinessPage(req, res) {
res.sendFile(path.join(__dirname, "../pages/business.html"));
}

module.exports = {
showBusinessPage
};
