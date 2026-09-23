const express = require("express");
const requireAuth = require("../middleware/auth");

const {
    showNotesPage
} = require("../controllers/notesController");

const router = express.Router();

router.get(
    "/notes",
    requireAuth,
    showNotesPage
);

module.exports = router;