const express = require("express");

const router = express.Router();

const {
    createAppointment,
    getSecretaryConfig
} = require("../controllers/appointmentsApiController");

router.get("/secretary-config", getSecretaryConfig);

router.post("/appointments", createAppointment);

module.exports = router;