require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

async function createAdmin() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        throw new Error(
            "Set ADMIN_EMAIL and ADMIN_PASSWORD first."
        );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.findOneAndUpdate(
        { email },
        {
            $set: {
                email,
                passwordHash,
                isAdmin: true
            },
            $setOnInsert: {
                createdAt: new Date()
            }
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );

    console.log(`Admin account ready: ${user.email}`);
}

createAdmin()
    .catch(error => {
        console.error("Could not create admin:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });