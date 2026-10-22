
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
