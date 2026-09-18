const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
    {
        ownerUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        legalName: {
            type: String,
            trim: true
        },

        vatNumber: {
            type: String,
            trim: true
        },

        address: {
            type: String,
            trim: true
        },

        city: {
            type: String,
            trim: true
        },

        postalCode: {
            type: String,
            trim: true
        },

        country: {
            type: String,
            trim: true,
            default: "Italy"
        },

        phone: {
            type: String,
            trim: true
        },

        email: {
            type: String,
            trim: true,
            lowercase: true
        },

        timezone: {
            type: String,
            default: "Europe/Rome"
        },

        language: {
            type: String,
            default: "en"
        },

        description: {
            type: String,
            trim: true
        },

        hours: {
            monday: {
                open: String,
                close: String,
                closed: Boolean
            },
            tuesday: {
                open: String,
                close: String,
                closed: Boolean
            },
            wednesday: {
                open: String,
                close: String,
                closed: Boolean
            },
            thursday: {
                open: String,
                close: String,
                closed: Boolean
            },
            friday: {
                open: String,
                close: String,
                closed: Boolean
            },
            saturday: {
                open: String,
                close: String,
                closed: Boolean
            },
            sunday: {
                open: String,
                close: String,
                closed: Boolean
            }
        },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Business", businessSchema);