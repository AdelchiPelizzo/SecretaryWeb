const express = require("express");

const router = express.Router();

const { showBusinessPage } = require("../controllers/businessController");

router.get("/business", showBusinessPage);

module.exports = router;

