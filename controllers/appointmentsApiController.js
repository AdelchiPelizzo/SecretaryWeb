async function createAppointment(req, res) {
    try {
        console.log("[API] Appointment request received:");
        console.log(req.body);

        return res.json({
            success: true,
            message: "Appointment API reached successfully."
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