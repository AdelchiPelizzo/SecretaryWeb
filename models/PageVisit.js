const mongoose = require("mongoose");

const pageVisitSchema = new mongoose.Schema({
    page: {
        type: String,
        required: true,
        default: "/"
    },

    visitedAt: {
        type: Date,
        required: true,
        default: Date.now
    }
});

pageVisitSchema.index({ visitedAt: -1 });

module.exports = mongoose.model("PageVisit", pageVisitSchema);