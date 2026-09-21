const express = require("express");

const router = express.Router();

const {
    createAppointment,
    getSecretaryConfig
} = require("../controllers/appointmentsApiController");

const requireSecretaryApiKey = require("../middleware/secretaryApiKey");

router.get(
    "/secretary-config",
    requireSecretaryApiKey,
    getSecretaryConfig
);

router.post(
    "/appointments",
    requireSecretaryApiKey,
    createAppointment
);

module.exports = router;