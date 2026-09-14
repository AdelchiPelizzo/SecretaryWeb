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
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("SecretaryConfig", secretaryConfigSchema);