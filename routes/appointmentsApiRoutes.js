const express = require("express");

const router = express.Router();

const {
    createAppointment
} = require("../controllers/appointmentsApiController");

router.post("/appointments", createAppointment);

module.exports = router;