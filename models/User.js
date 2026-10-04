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

        isAdmin: {
            type: Boolean,
            default: false
        },

        passwordResetToken: {
            type: String,
            default: null
        },

        passwordResetExpires: {
            type: Date,
            default: null
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

const User = mongoose.model("User", userSchema);

module.exports = User;