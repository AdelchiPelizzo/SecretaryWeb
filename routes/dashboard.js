const express = require("express");

const router = express.Router();

const { showDashboardPage } = require("../controllers/dashboardController");
const requireAuth = require("../middleware/auth");

router.get("/dashboard", requireAuth, showDashboardPage);

module.exports = router;