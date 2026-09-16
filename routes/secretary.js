const express = require("express");

const router = express.Router();

const {
    showSecretaryPage,
    saveSecretary
} = require("../controllers/secretaryController");

router.get("/secretary", showSecretaryPage);
router.post("/secretary", saveSecretary);

module.exports = router;