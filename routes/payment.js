const express = require("express");

const router = express.Router();

const {
    showPaymentRequiredPage
} = require("../controllers/paymentController");

router.get(
    "/payment/:paymentReference",
    showPaymentRequiredPage
);

module.exports = router;