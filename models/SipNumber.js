
const mongoose = require("mongoose");

const sipNumberSchema = new mongoose.Schema(
    {
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
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("SipNumber", sipNumberSchema);