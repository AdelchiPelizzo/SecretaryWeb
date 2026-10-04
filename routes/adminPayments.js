const express = require("express");

const router = express.Router();

const requireAdmin =
    require("../middleware/adminAuth");

const {
    showAdminPaymentsPage,
    showNewPaymentPage,
    recordPayment
} = require("../controllers/adminPaymentsController");

router.get(
    "/admin/payments",
    requireAdmin,
    showAdminPaymentsPage
);

router.get(
    "/admin/payments/new",
    requireAdmin,
    showNewPaymentPage
);

router.post(
    "/admin/payments/new",
    requireAdmin,
    recordPayment
);

module.exports = router;