
const path = require("path");
const fs = require("fs");

const Business = require("../models/Business");

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

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

        const accountHolder =
            process.env.PAYMENT_ACCOUNT_HOLDER;

        const iban =
            process.env.PAYMENT_IBAN;

        const bic =
            process.env.PAYMENT_BIC;

        let bankDetailsHtml = "";

        if (accountHolder && iban && bic) {

            bankDetailsHtml = `
                <div class="payment-detail">
                    <span class="payment-label">
                        ${escapeHtml(translations["payment.account_holder"] || "Account holder")}
                    </span>
                    <strong>${escapeHtml(accountHolder)}</strong>
                </div>

                <div class="payment-detail">
                    <span class="payment-label">
                        ${escapeHtml(translations["payment.iban"] || "IBAN")}
                    </span>
                    <strong>${escapeHtml(iban)}</strong>
                </div>

                <div class="payment-detail">
                    <span class="payment-label">
                        ${escapeHtml(translations["payment.bic"] || "BIC / SWIFT")}
                    </span>
                    <strong>${escapeHtml(bic)}</strong>
                </div>
            `;

        } else {

            bankDetailsHtml = `
                <p>
                    ${escapeHtml(translations["payment.bank_details_unavailable"] || "Bank transfer details are temporarily unavailable. Please contact us.")}
                </p>
            `;

            console.error(
                "Payment bank details are not fully configured."
            );
        }

        html = html.replace(
            "{{LANGUAGE}}",
            escapeHtml(language)
        );

        html = html.replace(
            "{{PAYMENT_REFERENCE}}",
            escapeHtml(business.paymentReference || "")
        );

        html = html.replace(
            "{{BANK_DETAILS_CONTENT}}",
            bankDetailsHtml
        );

        html = html.replace(
            "{{TRANSLATIONS_JSON}}",
            JSON.stringify(translations).replace(/</g, "\\u003c")
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
