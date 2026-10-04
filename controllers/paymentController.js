const path = require("path");
const fs = require("fs");

const Business = require("../models/Business");

async function showPaymentRequiredPage(req, res) {

    try {

        const business =
            await Business.findOne({
                paymentReference:
                    req.params.paymentReference
            });

        if (!business) {
            return res.status(404).send(
                "Payment reference not found."
            );
        }

        const filePath = path.join(
            __dirname,
            "../pages/payment-required.html"
        );

        let html = fs.readFileSync(
            filePath,
            "utf8"
        );

        const language =
            business.language || "en";

        const localePath = path.join(
            __dirname,
            "../locales",
            `${language}.json`
        );

        let translations = {};

        if (fs.existsSync(localePath)) {
            translations = JSON.parse(
                fs.readFileSync(
                    localePath,
                    "utf8"
                )
            );
        }

        html = html.replace(
            "{{LANGUAGE}}",
            language
        );

        html = html.replace(
            "{{PAYMENT_REFERENCE}}",
            business.paymentReference || ""
        );

        html = html.replace(
            "{{TRANSLATIONS_JSON}}",
            JSON.stringify(translations)
        );

        res.send(html);

    } catch (error) {

        console.error(
            "Loading payment page failed:",
            error
        );

        res.status(500).send(
            "Failed to load payment page."
        );
    }
}

module.exports = {
    showPaymentRequiredPage
};