const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        passwordHash: {
            type: String,
            required: true
        },

        firstName: {
            type: String,
            trim: true
        },

        lastName: {
            type: String,
            trim: true
        },

        createdAt: {
            type: Date,
            default: Date.now
        },

        lastLoginAt: {
            type: Date,
            default: null
        }
    }
);

module.exports = mongoose.model("User", userSchema);