const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            unique: true
        },

        plan: {
            type: String,
            default: "trial"
        },

        status: {
            type: String,
            default: "trial"
        },

        trialStart: {
            type: Date,
            default: Date.now
        },

        trialEnd: {
            type: Date
        },

        currentPeriodStart: {
            type: Date
        },

        currentPeriodEnd: {
            type: Date
        },

        provider: {
            type: String
        },

        providerCustomerId: {
            type: String
        },

        providerSubscriptionId: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);