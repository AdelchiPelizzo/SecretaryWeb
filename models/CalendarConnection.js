const mongoose = require("mongoose");

const calendarConnectionSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true
        },

        provider: {
            type: String,
            required: true
        },

        accountEmail: {
            type: String,
            trim: true,
            lowercase: true
        },

        accessToken: {
            type: String
        },

        refreshToken: {
            type: String
        },

        tokenExpiry: {
            type: Date
        },

        calendarId: {
            type: String
        },

        connected: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "CalendarConnection",
    calendarConnectionSchema
);