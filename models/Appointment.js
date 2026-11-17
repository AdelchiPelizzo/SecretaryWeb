
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        customerName: {
            type: String,
            trim: true
        },

        customerPhone: {
            type: String,
            trim: true
        },

        service: {
            type: String,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        location: {
            type: String,
            trim: true
        },

        startAt: {
            type: Date,
            required: true
        },

        endAt: {
            type: Date,
            required: true
        },

        duration: {
            type: Number,
            required: true,
            min: 1
        },

        timezone: {
            type: String,
            default: "Europe/Rome"
        },

        status: {
            type: String,
            enum: ["booked", "cancelled", "completed"],
            default: "booked"
        },

        source: {
            type: String,
            enum: ["telephone", "manual"],
            required: true
        },

        calendarProvider: {
            type: String,
            default: null
        },

        externalEventId: {
            type: String,
            default: null
        },

        syncStatus: {
            type: String,
            enum: ["not_connected", "pending", "synced", "failed"],
            default: "not_connected"
        }
    },
    {
        timestamps: true
    }
);

appointmentSchema.pre("validate", function () {
    if (this.startAt && this.endAt && this.endAt <= this.startAt) {
        this.invalidate(
            "endAt",
            "Appointment end time must be after start time."
        );
    }
});

// Supports appointment searches by business and date range.
appointmentSchema.index({
    businessId: 1,
    startAt: 1,
    endAt: 1
});

// Helps locate appointments synchronised with an external calendar.
appointmentSchema.index({
    businessId: 1,
    calendarProvider: 1,
    externalEventId: 1
});

module.exports = mongoose.model("Appointment", appointmentSchema);
