const Business = require("../models/Business");

async function createAppointment(req, res) {
    try {
        console.log("[API] Appointment request received:");
        console.log(req.body);

        const {
            forwardingNumber,
            title,
            date,
            time,
            duration
        } = req.body;

        if (!forwardingNumber) {
            return res.status(400).json({
                success: false,
                error: "Missing forwarding number."
            });
        }

        const business = await Business.findOne({
            phone: forwardingNumber
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                error: "Business not found."
            });
        }

        console.log("[API] Business identified:");
        console.log("Business ID:", business._id);
        console.log("Business name:", business.name);

        return res.json({
            success: true,
            message: "Business identified successfully.",
            businessId: business._id,
            businessName: business.name,
            appointment: {
                title,
                date,
                time,
                duration
            }
        });

    } catch (error) {
        console.error("[API] Appointment error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
}

module.exports = {
    createAppointment
};