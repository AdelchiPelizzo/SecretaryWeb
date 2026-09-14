const express = require("express");
const router = express.Router();

const {
    showRegisterPage,
    handleRegistration
} = require("../controllers/registerController");

router.get("/register", showRegisterPage);
router.post("/register", handleRegistration);

module.exports = router; 