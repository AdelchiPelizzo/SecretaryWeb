const Business = require("../models/Business");

async function requireAuth(req, res, next) {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    try {

        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        const now = new Date();

        const paymentExpired =
            business.paymentStatus === "expired" ||
            (
                business.paymentStatus === "trial" &&
                business.trialEndsAt &&
                business.trialEndsAt <= now
            ) ||
            (
                business.paymentStatus === "valid" &&
                business.paymentValidUntil &&
                business.paymentValidUntil <= now
            );

        if (paymentExpired) {
            return res.redirect(
                `/payment/${business.paymentReference}`
            );
        }

        next();

    } catch (error) {

        console.error(
            "Authentication check failed:",
            error
        );

        res.status(500).send(
            "Authentication check failed."
        );
    }
}

module.exports = requireAuth;