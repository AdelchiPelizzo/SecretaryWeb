
const mongoose = require("mongoose");

const pageVisitSchema = new mongoose.Schema({
    page: {
        type: String,
        required: true,
        default: "/"
    },

    // Anonymous browser identifier.
    visitorId: {
        type: String,
        default: null,
        index: true
    },

    // True when this browser has visited before.
    isReturning: {
        type: Boolean,
        default: false
    },

    // Classification of the request.
    visitorType: {
        type: String,
        enum: ["browser", "bot", "unknown"],
        default: "unknown"
    },

    // Detected traffic origin.
    trafficSource: {
        type: String,
        enum: [
            "linkedin",
            "facebook",
            "twitter",
            "referral",
            "direct",
            "other"
        ],
        default: "unknown"
    },

    // Original request details for later analysis.
    userAgent: {
        type: String,
        default: null
    },

    referer: {
        type: String,
        default: null
    },

    // Approximate location obtained from the visitor's IP.
    country: {
        type: String,
        default: null
    },

    region: {
        type: String,
        default: null
    },

    city: {
        type: String,
        default: null
    },

    visitedAt: {
        type: Date,
        required: true,
        default: Date.now
    }
});

pageVisitSchema.index({ visitedAt: -1 });

module.exports = mongoose.model("PageVisit", pageVisitSchema);
