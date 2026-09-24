const path = require("path");
const SecretaryConfig = require("../models/SecretaryConfig");
const Business = require("../models/Business");
const fs = require("fs");
const languagesPath = path.join(__dirname, "../data/languages.json");

const languages = JSON.parse(
    fs.readFileSync(languagesPath, "utf8")
);

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

        const languageOptions = languages
            .map(language => {
                const selected =
                    config.language === language.code
                        ? "selected"
                        : "";

                return `<option value="${language.code}" ${selected}>${language.name}</option>`;
            })
            .join("");

        const supportedLanguages =
            config.supportedLanguages || [];

        const supportedLanguageOptions = languages
            .map(language => {
                const checked =
                    supportedLanguages.includes(language.code)
                        ? "checked"
                        : "";

                const disabled =
                    config.language === language.code
                        ? "disabled"
                        : "";

                return `
                    <div class="language-checkbox-item">
                        <input
                            type="checkbox"
                            id="language-${language.code}"
                            name="supportedLanguages"
                            value="${language.code}"
                            ${checked}
                            ${disabled}
                        >
                        <label for="language-${language.code}">
                            ${language.name}
                        </label>
                    </div>
                `;
            })
            .join("");

        html = html.replace(
            "{{LANGUAGE_OPTIONS}}",
            languageOptions
        );

        html = html.replace(
            "{{SUPPORTED_LANGUAGE_OPTIONS}}",
            supportedLanguageOptions
        );

        html = html.replace("{{GREETING}}", config.greeting || "");
        html = html.replace("{{INSTRUCTIONS}}", config.instructions || "");

        res.send(html);
    } catch (error) {
        console.error("Loading secretary page failed:", error);
        res.status(500).send("Failed to load secretary page.");
    }
}

async function saveSecretary(req, res) {
    console.log("[SECRETARY] saveSecretary called");
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
        console.log("[SECRETARY] Language received from web:", req.body.language);
        config.language = req.body.language;

        business.language = req.body.language;

        let supportedLanguages = req.body.supportedLanguages || [];

        if (!Array.isArray(supportedLanguages)) {
            supportedLanguages = [supportedLanguages];
        }

        supportedLanguages = supportedLanguages.filter(
            code => code && code !== req.body.language
        );

        if (supportedLanguages.length > 3) {
            return res
                .status(400)
                .send("You can select up to 3 additional languages.");
        }

        config.supportedLanguages = supportedLanguages;
        
        config.greeting = req.body.greeting;
        config.instructions = req.body.instructions;
        config.enabled = req.body.enabled === "on";

        await config.save();
        await business.save();

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