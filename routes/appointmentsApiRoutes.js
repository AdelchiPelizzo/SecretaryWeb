const express = require("express");

const router = express.Router();

const {
    createAppointment,
    createNote,
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

router.post(
    "/notes",
    requireSecretaryApiKey,
    createNote
);

module.exports = router;