const express = require("express");

const router = express.Router();

const { showLoginPage } = require("../controllers/loginController");

router.get("/login", showLoginPage);

module.exports = router;
