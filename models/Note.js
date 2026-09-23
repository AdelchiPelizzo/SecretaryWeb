const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            index: true
        },

        callerNumber: {
            type: String,
            trim: true
        },

        callerName: {
            type: String,
            trim: true
        },

        recipient: {
            type: String,
            trim: true
        },

        text: {
            type: String,
            required: true,
            trim: true
        },

        source: {
            type: String,
            enum: ["call", "ai", "manual"],
            default: "call"
        },

        callId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Call"
        },

        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment"
        },

        status: {
            type: String,
            enum: ["new", "read", "handled"],
            default: "new"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Note", noteSchema, "notes");