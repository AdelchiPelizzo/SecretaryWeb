const express = require("express");

const router = express.Router();

const {
    showPaymentRequiredPage
} = require("../controllers/paymentController");

const requireAuth = require("../middleware/auth");

router.get(
    "/payment",
    requireAuth,
    showPaymentRequiredPage
);

module.exports = router;