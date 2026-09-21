const express = require("express");

const router = express.Router();

const { showAppointmentsPage } = require("../controllers/appointmentsController");

const requireAuth = require("../middleware/auth");

router.get("/appointments", requireAuth, showAppointmentsPage);

module.exports = router;