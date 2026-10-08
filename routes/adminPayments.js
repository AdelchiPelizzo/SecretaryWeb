const express = require("express");

const router = express.Router();

const requireAdmin =
    require("../middleware/adminAuth");

const {
    showAdminPaymentsPage,
    showNewPaymentPage,
    recordPayment,
    updatePayment,
    showEditPaymentPage,
    updateBusinessPaymentStatus
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

router.post(
    "/admin/payments/:paymentId/edit",
    requireAdmin,
    updatePayment
);

router.get(
    "/admin/payments/:paymentId/edit",
    requireAdmin,
    showEditPaymentPage
);

router.post(
    "/admin/payments/business/:businessId/status",
    requireAdmin,
    updateBusinessPaymentStatus
);


module.exports = router;