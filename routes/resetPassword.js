const express = require("express");

const {
    showResetPasswordPage,
    resetPassword
} = require("../controllers/resetPasswordController");

const router = express.Router();

router.get(
    "/reset-password",
    showResetPasswordPage
);

router.post(
    "/reset-password",
    resetPassword
);

module.exports = router;