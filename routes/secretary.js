const express = require("express");

const router = express.Router();

const { showSecretaryPage } = require("../controllers/secretaryController");

router.get("/secretary", showSecretaryPage);

module.exports = router;