const User = require("../models/User");

async function requireAdmin(req, res, next) {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    try {

        const user = await User.findById(
            req.session.userId
        );

        if (!user || !user.isAdmin) {
            return res.status(403).send(
                "Access denied."
            );
        }

        next();

    } catch (error) {

        console.error(
            "Admin authentication failed:",
            error
        );

        res.status(500).send(
            "Authentication failed."
        );
    }
}

module.exports = requireAdmin;