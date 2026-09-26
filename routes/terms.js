const express = require("express");
const path = require("path");

const router = express.Router();

router.get("/terms", (req, res) => {
    res.sendFile(path.join(__dirname, "../pages/terms.html"));
});

module.exports = router;