const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true
        },

        callerNumber: {
            type: String,
            trim: true
        },

        startedAt: {
            type: Date
        },

        endedAt: {
            type: Date
        },

        duration: {
            type: Number
        },

        status: {
            type: String
        },

        transcript: {
            type: String
        },

        summary: {
            type: String
        },

        appointmentCreated: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Call", callSchema);