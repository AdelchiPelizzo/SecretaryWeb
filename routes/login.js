const express = require("express");

const router = express.Router();

const {
    showLoginPage,
    handleLogin
} = require("../controllers/loginController");

router.get("/login", showLoginPage);
router.post("/login", handleLogin);
router.post("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error("Logout failed:", error);
            return res.status(500).send("Logout failed.");
        }

        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
});

module.exports = router;
