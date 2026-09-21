const express = require("express");

const router = express.Router();

const {
    showBusinessPage,
    saveBusiness
} = require("../controllers/businessController");

const requireAuth = require("../middleware/auth");

router.get("/business", requireAuth, showBusinessPage);

router.post("/business", requireAuth, saveBusiness);

console.log("Business route loaded");

module.exports = router;