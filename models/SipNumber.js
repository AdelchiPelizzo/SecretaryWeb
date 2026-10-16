const mongoose = require("mongoose");

const sipNumberSchema = new mongoose.Schema(
    {
        // Existing fields — keep unchanged
        number: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        status: {
            type: String,
            enum: ["available", "assigned", "disabled"],
            default: "available"
        },

        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            default: null
        },

        assignedAt: {
            type: Date,
            default: null
        },

        reservedUntil: {
            type: Date,
            default: null
        },

        // New SIP registration settings
        sip: {
            username: { type: String, trim: true },
            password: { type: String },
            host: { type: String, trim: true, default: "sip.vivavox.it" },
            port: { type: Number, default: 5060 },
            transport: {
                type: String,
                enum: ["UDP", "TCP", "TLS"],
                default: "UDP"
            },
            preferredCodec: {
                type: String,
                default: "G.729.A"
            },
            active: { type: Boolean, default: false }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("SipNumber", sipNumberSchema);