const mongoose = require("mongoose");

const secretaryConfigSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            unique: true
        },

        secretaryName: {
            type: String,
            trim: true,
            default: "Secretary"
        },

        secretaryType: {
            type: String,
            trim: true,
            default: "general"
        },

        personality: {
            type: String,
            trim: true,
            default: "professional and friendly"
        },

        language: {
            type: String,
            default: "en"
        },

        supportedLanguages: {
            type: [String],
            default: []
        },

        greeting: {
            type: String,
            trim: true
        },

        instructions: {
            type: String,
            trim: true
        },

        enabled: {
            type: Boolean,
            default: true
        },

        enabled: {
            type: Boolean,
            default: true
        },

        appointmentDuration: {
            type: Number,
            default: 30
        },

        bookingWindow: {
            type: Number,
            default: 30
        },

        bookingInstructions: {
            type: String,
            trim: true,
            default: ""
        },

        startTime: {
            type: String,
            default: ""
        },

        endTime: {
            type: String,
            default: ""
        },

        days: {
            type: String,
            default: "weekdays"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "SecretaryConfig",
    secretaryConfigSchema,
    "secretaryConfigs"
);