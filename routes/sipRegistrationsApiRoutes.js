
const express = require("express");
const SipNumber = require("../models/SipNumber");
const requireSecretaryApiKey = require("../middleware/secretaryApiKey");

const router = express.Router();

router.get(
    "/sip-registrations",
    requireSecretaryApiKey,
    async (req, res) => {
        try {
            const sipNumbers = await SipNumber.find({
                "sip.active": true,
                "sip.username": { $nin: ["", null] },
                "sip.password": { $nin: ["", null] }
            }).select("number sip");

            const registrations = sipNumbers.map((sipNumber) => ({
                number: sipNumber.number,
                sip: {
                    username: sipNumber.sip.username,
                    password: sipNumber.sip.password,
                    host: sipNumber.sip.host,
                    port: sipNumber.sip.port,
                    transport: sipNumber.sip.transport,
                    preferredCodec: sipNumber.sip.preferredCodec,
                    active: sipNumber.sip.active
                }
            }));

            res.json({ registrations });
        } catch (error) {
            console.error(
                "Failed to retrieve SIP registrations:",
                error.message
            );

            res.status(500).json({
                error: "Failed to retrieve SIP registrations."
            });
        }
    }
);

module.exports = router;
