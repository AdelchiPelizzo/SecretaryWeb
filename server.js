const express = require("express");

function getHomepageHtml(htmlPath, language) {
    const html = fs.readFileSync(htmlPath, "utf8");

    const localePath = path.join(
        __dirname,
        "locales",
        `${language}.json`
    );

    const translations = JSON.parse(
        fs.readFileSync(localePath, "utf8")
    );

    const title = translations["seo.title"];

    if (!title) {
        throw new Error(`Missing seo.title in ${language}.json`);
    }

    return html.replace(
        /<title>[\s\S]*?<\/title>/i,
        `<title>${title}</title>`
    );
}

const path = require("path");
const fs = require("fs");
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
    if (
        req.method !== "GET" ||
        !["/", "/it/"].includes(req.path)
    ) {
        return next();
    }

    // Preserve the existing exclusion feature.
    if (getCookie(req, "excludeHomepageVisit") === "true") {
        return next();
    }

    // Identify the client IP.
    const clientIp = (
        req.get("cf-connecting-ip") ||
        req.ip ||
        ""
    ).trim();

    // Exclude previously identified IP addresses.
    const excludedVisitorIps = new Set([
        "72.152.84.13",
        "72.152.84.15"
    ]);

    if (excludedVisitorIps.has(clientIp)) {
        console.log("[VISITOR] Excluded IP:", clientIp);
        return next();
    }

    // Classify requests before creating visitor cookies.
    const userAgent = req.get("user-agent") || "";
    const referer = req.get("referer") || "";
    const refererLower = referer.toLowerCase();

        // Read UTM campaign parameters safely.
    const getUtmValue = (value) =>
        typeof value === "string"
            ? value.trim().slice(0, 100) || null
            : null;

    const utmSource = getUtmValue(req.query.utm_source);
    const utmMedium = getUtmValue(req.query.utm_medium);
    const utmCampaign = getUtmValue(req.query.utm_campaign);
    const utmContent = getUtmValue(req.query.utm_content);

    const automatedRequestPattern =
    /bot|crawler|spider|crawling|slurp|scrapy|preview|facebookexternalhit|facebot|linkedinbot|twitterbot|trendiction|go-http-client|python-requests|curl|wget|headlesschrome|puppeteer|playwright|selenium/i;

    let visitorType = "unknown";

    if (automatedRequestPattern.test(userAgent)) {
        visitorType = "bot";
    } else if (userAgent.trim()) {
        visitorType = "browser";
    }

    // Do not save automated requests.
    if (visitorType === "bot") {
        console.log("[VISITOR] Ignored automated request:", userAgent);
        return next();
    }

    // Check whether the browser already has a visitor cookie.
    const existingVisitorCookie = getCookie(
        req,
        "secretaryVisitorId"
    );

    let visitorId = existingVisitorCookie;

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

    // Log request information.
    console.log("[VISITOR] IP:", req.ip);
    console.log("[VISITOR] Forwarded IP:", req.headers["x-forwarded-for"]);
    console.log("[VISITOR] CF-Connecting-IP:", clientIp);
    console.log("[VISITOR] User-Agent:", userAgent || "(none)");
    console.log("[VISITOR] Referer:", referer || "(none)");
    console.log("[VISITOR] Has visitor cookie:", Boolean(existingVisitorCookie));

    // Identify traffic source.
    let trafficSource = "unknown";

    if (
        /linkedin\.com|lnkd\.in/.test(refererLower)
    ) {
        trafficSource = "linkedin";

    } else if (
        /facebook\.com|fb\.com|fb\.watch|m\.facebook/.test(refererLower)
    ) {
        trafficSource = "facebook";

    } else if (
        /t\.co|twitter\.com|x\.com/.test(refererLower)
    ) {
        trafficSource = "twitter";

    } else if (referer.trim()) {
        trafficSource = "referral";

    } else if (userAgent.trim()) {
        trafficSource = "direct";
    }

    // UTM source takes priority over the HTTP referrer.
    if (utmSource) {
        const source = utmSource.toLowerCase();

        if (source === "linkedin") {
            trafficSource = "linkedin";
        } else if (source === "facebook") {
            trafficSource = "facebook";
        } else if (source === "twitter" || source === "x") {
            trafficSource = "twitter";
        } else {
            trafficSource = "other";
        }
    }

    console.log("[VISITOR] Type:", visitorType);
    console.log("[VISITOR] Traffic source:", trafficSource);

    // Record the visit asynchronously.
    //* Generate a unique ID for this homepage visit.*
    const visitId = crypto.randomUUID();

    // Make the ID available to the homepage route.
    req.visitId = visitId;

    //* Record the visit asynchronously.*
    (async () => {

        const previousVisit = await PageVisit.findOne({
            visitorId
        })
            .sort({ visitedAt: -1 })
            .lean();

        // Reuse the last known location.
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
        }

        // Create the visit record before looking up its location.
        await PageVisit.create({
            page: req.path,
            visitorId,
            visitId,
            isReturning: Boolean(previousVisit),
            visitorType,
            trafficSource,
            utmSource,
            utmMedium,
            utmCampaign,
            utmContent,
            userAgent: userAgent || null,
            referer: referer || null,
            ...location
        });

        // Allow the homepage to load.
        next();

        // Look up the location afterwards, if necessary.
        if (!location.country && !location.region && !location.city) {
            try {
                const forwardedIps = (
                    req.headers["x-forwarded-for"] || ""
                ).split(",").map(ip => ip.trim());

                const locationIp = forwardedIps[0] || clientIp;

                const newLocation = await getVisitorLocation(locationIp);

                if (Object.keys(newLocation).length > 0) {
                    await PageVisit.updateOne(
                        { visitId },
                        { $set: newLocation }
                    );
                }

            } catch (locationError) {
                console.error(
                    "Visitor location update failed:",
                    locationError.message
                );
            }
        }

    })().catch(error => {
        console.error(
            "Failed to record homepage visit:",
            error.message
        );

        next();
    });

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

// Receive browser-generated visitor engagement data.
app.post("/api/visitor-tracking", async (req, res) => {
    try {
        const {
            visitId,
            javascriptConfirmed,
            preferredLanguages,
            activeSeconds,
            maxScrollPercent,
            viewedSections
        } = req.body || {};

        // Require a valid server-generated visit ID.
        if (
            typeof visitId !== "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitId)
        ) {
            return res.sendStatus(400);
        }

        // Accept only the known homepage sections.
        const allowedSections = [
            "features",
            "pricing",
            "personalities",
            "how-it-works",
            "contact"
        ];

        const safeLanguages = Array.isArray(preferredLanguages)
            ? preferredLanguages
                .filter(language => typeof language === "string")
                .slice(0, 10)
                .map(language => language.slice(0, 20))
            : [];

        const safeSections = Array.isArray(viewedSections)
            ? [...new Set(viewedSections.filter(section =>
                allowedSections.includes(section)
            ))]
            : [];

        const safeActiveSeconds =
            Number.isFinite(activeSeconds) && activeSeconds >= 0
                ? Math.min(Math.floor(activeSeconds), 86400)
                : null;

        const safeScrollPercent =
            Number.isFinite(maxScrollPercent) &&
            maxScrollPercent >= 0 &&
            maxScrollPercent <= 100
                ? Math.round(maxScrollPercent)
                : null;

        await PageVisit.findOneAndUpdate(
            { visitId },
            {
                $set: {
                    javascriptConfirmed: javascriptConfirmed === true,
                    preferredLanguages: safeLanguages,
                    activeSeconds: safeActiveSeconds,
                    maxScrollPercent: safeScrollPercent,
                    viewedSections: safeSections
                }
            },
            { runValidators: true }
        );

        return res.sendStatus(204);

    } catch (error) {
        console.error(
            "Failed to update visitor tracking:",
            error.message
        );
        return res.sendStatus(500);
    }
});

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
    try {
        let html = getHomepageHtml(
            path.join(__dirname, "index.html"),
            "en"
        );

        // Expose this page visit's ID to the browser.
        const visitIdScript = `
            <script>
                window.secretaryVisitId = ${JSON.stringify(req.visitId || null)};
            </script>
        `;

        html = html.replace("</head>", `${visitIdScript}</head>`);

        res.type("html").send(html);

    } catch (error) {
        console.error("Failed to serve English homepage:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/it/", (req, res) => {
    try {
        let html = getHomepageHtml(
            path.join(__dirname, "it", "index.html"),
            "it"
        );

        // Expose this page visit's ID to the browser.
        const visitIdScript = `
            <script>
                window.secretaryVisitId = ${JSON.stringify(req.visitId || null)};
            </script>
        `;

        html = html.replace("</head>", `${visitIdScript}</head>`);

        res.type("html").send(html);

    } catch (error) {
        console.error("Failed to serve Italian homepage:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Connect to MongoDB before starting the server.
connectDatabase().then(() => {
    console.log("Database connection completed. Starting HTTP server...");

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
    });
});