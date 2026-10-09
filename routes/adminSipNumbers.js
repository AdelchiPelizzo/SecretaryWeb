const express = require("express");

const router = express.Router();

const requireAdmin = require("../middleware/adminAuth");

const {
    showAdminSipNumbersPage,
    addSipNumber,
    releaseSipNumber,
    assignSipNumber
} = require("../controllers/adminSipNumbersController");

router.get(
    "/admin/sip-numbers",
    requireAdmin,
    showAdminSipNumbersPage
);

router.post(
    "/admin/sip-numbers/new",
    requireAdmin,
    addSipNumber
);

router.post(
    "/admin/sip-numbers/:sipNumberId/release",
    requireAdmin,
    releaseSipNumber
);

router.post(
    "/admin/sip-numbers/:sipNumberId/assign",
    requireAdmin,
    assignSipNumber
);

module.exports = router;