const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            index: true
        },

        paymentReference: {
            type: String,
            required: true,
            trim: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        currency: {
            type: String,
            default: "EUR",
            trim: true,
            uppercase: true
        },

        paymentDate: {
            type: Date,
            required: true
        },

        periodFrom: {
            type: Date
        },

        periodTo: {
            type: Date
        },

        payerName: {
            type: String,
            trim: true
        },

        payerIBAN: {
            type: String,
            trim: true
        },

        transactionReference: {
            type: String,
            trim: true
        },

        status: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "rejected"
            ],
            default: "confirmed"
        },

        source: {
            type: String,
            enum: [
                "manual",
                "bank_statement"
            ],
            default: "manual"
        },

        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.model("Payment", paymentSchema);