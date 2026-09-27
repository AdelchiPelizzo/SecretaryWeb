const express = require("express");

const router = express.Router();

const {
    showAppointmentsPage,
    saveAppointmentSettings
} = require("../controllers/appointmentsController");

const requireAuth = require("../middleware/auth");

router.get("/appointments", requireAuth, showAppointmentsPage);

router.post(
    "/appointments",
    requireAuth,
    saveAppointmentSettings
);

module.exports = router;