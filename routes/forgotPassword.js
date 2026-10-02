const express = require("express");

const {
    showForgotPasswordPage,
    requestPasswordReset
} = require("../controllers/forgotPasswordController");

const router = express.Router();

router.get(
    "/forgot-password",
    showForgotPasswordPage
);

router.post(
    "/forgot-password",
    requestPasswordReset
);

module.exports = router;