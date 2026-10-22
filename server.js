const express = require("express");
const path = require("path");
require("dotenv").config();

const connectDatabase = require("./config/database");
const sessionMiddleware = require("./config/session");
const registerRoute = require("./routes/register");
const loginRoute = require("./routes/login");
const forgotPasswordRoute = require("./routes/forgotPassword");
const resetPasswordRoute = require("./routes/resetPassword");
const dashboardRoute = require("./routes/dashboard");
const businessRoute = require("./routes/business");
const secretaryRoute = require("./routes/secretary");
const appointmentsRoute = require("./routes/appointments");
const calendarRoute = require("./routes/calendar");
const appointmentsApiRoutes = require("./routes/appointmentsApiRoutes");
const notesRoute = require("./routes/notes");
const privacyRoutes = require("./routes/privacy");
const termsRoutes = require("./routes/terms");
console.log("Contact route path:", require.resolve("./routes/contact"));
const contactRoutes = require("./routes/contact");
const paymentRoute = require("./routes/payment");
const adminPaymentsRoute = require("./routes/adminPayments");
const adminSipNumbersRoute = require("./routes/adminSipNumbers");
const sipRegistrationsApiRoutes = require("./routes/sipRegistrationsApiRoutes");
const adminRoute = require("./routes/admin");
const PageVisit = require("./models/PageVisit");

const app = express();
app.set("trust proxy", 1);

// Record homepage visits in MongoDB.

 // Mark this browser to exclude its homepage visits.

const crypto = require("crypto");

// Read a cookie by name without requiring cookie-parser.
function getCookie(req, name) {
    const cookies = (req.headers.cookie || "").split(";");

    for (const cookie of cookies) {
        const separator = cookie.indexOf("=");

        if (separator === -1) {
            continue;
        }

        const key = cookie.slice(0, separator).trim();

        if (key === name) {
            return cookie.slice(separator + 1).trim();
        }
    }

    return null;
}


async function getVisitorLocation(ip) {
    if (!ip) {
        return {};
    }

    // Do not send local or invalid IP addresses to the provider.
    const net = require("net");

    if (net.isIP(ip) === 0) {
        return {};
    }

    if (
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        ip.startsWith("169.254.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
        ip.startsWith("fc") ||
        ip.startsWith("fd")
    ) {
        return {};
    }

    try {
        const response = await fetch(
            `https://ipwho.is/${encodeURIComponent(ip)}`
        );

        if (!response.ok) {
            return {};
        }

        const data = await response.json();

        if (!data.success) {
            return {};
        }

        return {
            country: data.country || null,
            region: data.region || null,
            city: data.city || null
        };
    } catch (error) {
        console.error(
            "Visitor location lookup failed:",
            error.message
        );

        return {};
    }
}

// Record homepage visits in MongoDB.
app.use((req, res, next) => {
    // Exclude this browser from homepage visit tracking.
    if (req.path === "/exclude-my-visits") {
        res.append(
            "Set-Cookie",
            "excludeHomepageVisit=true; Path=/; Max-Age=31536000; SameSite=Lax; Secure"
        );

        return res.redirect("/");
    }

    // Only record homepage visits.
    if (req.method !== "GET" || req.path !== "/") {
        return next();
    }

    // Preserve the existing exclusion feature.
    if (getCookie(req, "excludeHomepageVisit") === "true") {
        return next();
    }

    // Do not create a persistent visitor cookie until analytics
    // consent has been implemented and granted.
/*     if (getCookie(req, "secretaryAnalyticsConsent") !== "true") {
        PageVisit.create({
            page: "/",
            visitorId: null,
            isReturning: false
        }).catch((error) => {
            console.error(
                "Failed to record homepage visit:",
                error.message
            );
        });

        return next();
    } */

    // Read the anonymous ID or create a new one.
    let visitorId = getCookie(req, "secretaryVisitorId");

    if (
        !visitorId ||
        !/^[0-9a-f-]{36}$/i.test(visitorId)
    ) {
        visitorId = crypto.randomUUID();

        res.append(
            "Set-Cookie",
            `secretaryVisitorId=${visitorId}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`
        );
    }

    console.log("[VISITOR] IP:", req.ip);
    console.log("[VISITOR] Forwarded IP:", req.headers["x-forwarded-for"]);
    
    async function getVisitorLocation(ip) {
        if (!ip) {
            return {};
        }

        // Do not send local or invalid IP addresses to the provider.
        const net = require("net");

        if (net.isIP(ip) === 0) {
            return {};
        }

        if (
            ip === "127.0.0.1" ||
            ip === "::1" ||
            ip.startsWith("10.") ||
            ip.startsWith("192.168.") ||
            ip.startsWith("169.254.") ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
            ip.startsWith("fc") ||
            ip.startsWith("fd")
        ) {
            return {};
        }

        try {
            const response = await fetch(
                `https://ipwho.is/${encodeURIComponent(ip)}`
            );

            if (!response.ok) {
                return {};
            }

            const data = await response.json();

            if (!data.success) {
                return {};
            }

            return {
                country: data.country || null,
                region: data.region || null,
                city: data.city || null
            };
        } catch (error) {
            console.error(
                "Visitor location lookup failed:",
                error.message
            );

            return {};
        }
    }

    // Check whether this browser has visited before.

    (async () => {
        const previousVisit = await PageVisit.findOne({
            visitorId
        })
            .sort({ visitedAt: -1 })
            .lean();

        // Reuse the last known location to avoid a lookup on every visit.
        let location = {};

        if (
            previousVisit &&
            (
                previousVisit.country ||
                previousVisit.region ||
                previousVisit.city
            )
        ) {
            location = {
                country: previousVisit.country,
                region: previousVisit.region,
                city: previousVisit.city
            };
        } else {
            const forwardedIps = (
                req.headers["x-forwarded-for"] || ""
            ).split(",").map(ip => ip.trim());

            const clientIp = forwardedIps[0] || req.ip;

            location = await getVisitorLocation(clientIp);
        }

        await PageVisit.create({
            page: "/",
            visitorId,
            isReturning: Boolean(previousVisit),
            ...location
        });
    })().catch((error) => {
        console.error(
            "Failed to record homepage visit:",
            error.message
        );
    });

    next();
});


const PORT = process.env.PORT || 3000;

app.use("/pages", (req, res) => {
    res.status(404).send("Not found.");
});

app.use(express.static(path.join(__dirname), {
    index: false,
    dotfiles: "deny"
}));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(sessionMiddleware);
app.use(appointmentsRoute);
app.use(notesRoute);
app.use(secretaryRoute);
app.use(businessRoute);
app.use(dashboardRoute);
app.use(loginRoute);
app.use(forgotPasswordRoute);
app.use(resetPasswordRoute);
app.use(registerRoute);
app.use("/locales", express.static(path.join(__dirname, "locales")));
app.use(calendarRoute);
app.use("/api", appointmentsApiRoutes);
app.use("/", privacyRoutes);
app.use("/", termsRoutes);
app.use(contactRoutes);
app.use(paymentRoute);
app.use(adminPaymentsRoute);
app.use(adminSipNumbersRoute);
app.use("/api", sipRegistrationsApiRoutes);
app.use(adminRoute);

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

console.log("Register route loaded");

connectDatabase().then(() => {
    console.log("Database connection completed. Starting HTTP server...");

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
    });
});