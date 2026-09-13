const express = require("express");

const router = express.Router();

const { showDashboardPage } = require("../controllers/dashboardController");

router.get("/dashboard", showDashboardPage);

module.exports = router;
