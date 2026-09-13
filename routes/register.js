const express = require("express");
const router = express.Router();

const { showRegisterPage } = require("../controllers/registerController");

router.get("/register", showRegisterPage);

module.exports = router; 