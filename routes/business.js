const express = require("express");

const router = express.Router();

const {
    showBusinessPage,
    saveBusiness
} = require("../controllers/businessController");

router.get("/business", showBusinessPage);

router.post("/business", saveBusiness);

console.log("Business route loaded");

module.exports = router;
