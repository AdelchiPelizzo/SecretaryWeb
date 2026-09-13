const express = require("express");

const router = express.Router();

const { showAppointmentsPage } = require("../controllers/appointmentsController");

router.get("/appointments", showAppointmentsPage);

module.exports = router;