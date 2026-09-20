const path = require("path");
const SecretaryConfig = require("../models/SecretaryConfig");
const Business = require("../models/Business");
const fs = require("fs");

async function showSecretaryPage(req, res) {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        let config = await SecretaryConfig.findOne({
            businessId: business._id
        });

        if (!config) {
            config = await SecretaryConfig.create({
                businessId: business._id
            });
        }

        const filePath = path.join(__dirname, "../pages/secretary.html");
        let html = fs.readFileSync(filePath, "utf8");
        html = html.replace(
            "{{PERSONALITY_PROFESSIONAL}}",
            config.personality === "professional" ? "checked" : ""
        );

        html = html.replace(
            "{{PERSONALITY_FRIENDLY}}",
            config.personality === "friendly" ? "checked" : ""
        );

        html = html.replace(
            "{{PERSONALITY_ENERGETIC}}",
            config.personality === "energetic" ? "checked" : ""
        );

        html = html.replace("{{SECRETARY_NAME}}", config.secretaryName || "");
        html = html.replace("{{SECRETARY_TYPE}}", config.secretaryType || "");
        html = html.replace(
            `value="general">General secretary`,
            `value="general" ${config.secretaryType === "general" ? "selected" : ""}>General secretary`
        );

        html = html.replace(
            `value="receptionist">Receptionist`,
            `value="receptionist" ${config.secretaryType === "receptionist" ? "selected" : ""}>Receptionist`
        );

        html = html.replace(
            `value="appointment">Appointment secretary`,
            `value="appointment" ${config.secretaryType === "appointment" ? "selected" : ""}>Appointment secretary`
        );

        html = html.replace(
            `value="customer_service">Customer service`,
            `value="customer_service" ${config.secretaryType === "customer_service" ? "selected" : ""}>Customer service`
        );
        html = html.replace("{{PERSONALITY}}", config.personality || "");
        html = html.replace("{{LANGUAGE}}", config.language || "");
        html = html.replace("{{GREETING}}", config.greeting || "");
        html = html.replace("{{INSTRUCTIONS}}", config.instructions || "");

        res.send(html);
    } catch (error) {
        console.error("Loading secretary page failed:", error);
        res.status(500).send("Failed to load secretary page.");
    }
}

async function saveSecretary(req, res) {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        let config = await SecretaryConfig.findOne({
            businessId: business._id
        });

        if (!config) {
            config = await SecretaryConfig.create({
                businessId: business._id
            });
        }

        config.secretaryName = req.body.secretaryName;
        config.secretaryType = req.body.secretaryType;
        config.personality = req.body.personality;
        config.language = req.body.language;
        config.greeting = req.body.greeting;
        config.instructions = req.body.instructions;
        config.enabled = req.body.enabled === "on";

        await config.save();
        console.log(
            "Secretary config saved:",
            config._id,
            "Database:",
            SecretaryConfig.db.name,
            "Collection:",
            SecretaryConfig.collection.name
        );

        const check = await SecretaryConfig.findById(config._id);

        console.log("Read back from MongoDB:", check);

        res.redirect("/secretary");
    } catch (error) {
        console.error("Saving secretary failed:", error);
        res.status(500).send("Failed to save secretary.");
    }
}

module.exports = {
    showSecretaryPage,
    saveSecretary
};