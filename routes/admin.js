const express = require("express");
const router = express.Router();

const requireAdmin = require("../middleware/adminAuth");
const {
    showAdminOverviewPage
} = require("../controllers/adminController");

router.get(
    "/admin",
    requireAdmin,
    showAdminOverviewPage
);

module.exports = router;