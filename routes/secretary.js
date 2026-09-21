const express = require("express");

const router = express.Router();

const {
    showSecretaryPage,
    saveSecretary
} = require("../controllers/secretaryController");

const requireAuth = require("../middleware/auth");

router.get("/secretary", requireAuth, showSecretaryPage);

router.post("/secretary", requireAuth, saveSecretary);

module.exports = router;