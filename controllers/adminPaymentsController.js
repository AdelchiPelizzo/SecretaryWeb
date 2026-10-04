const Business = require("../models/Business");
const Payment = require("../models/Payment");
const path = require("path");
const fs = require("fs");

async function showAdminPaymentsPage(req, res) {

    try {

        const businesses =
            await Business.find({})
                .sort({ createdAt: -1 })
                .lean();
        console.log(
            "[ADMIN PAYMENTS] businesses:",
            businesses.length
        );

        const payments =
            await Payment.find({})
                .sort({ paymentDate: -1 })
                .lean();

        console.log(
            "[ADMIN PAYMENTS] payments:",
            payments.length
        );

        const rows = businesses
            .map(business => {

                const businessPayments =
                    payments.filter(
                        payment =>
                            payment.businessId?.toString() ===
                            business._id.toString()
                    );

                const paymentHistory =
                    businessPayments.length > 0
                        ? businessPayments
                            .map(payment => `
                                <div>
                                    ${payment.amount}
                                    ${payment.currency}
                                    -
                                    ${payment.paymentDate}
                                </div>
                            `)
                            .join("")
                        : "No payments";

                return `
                    <tr>
                        <td>${business.name || ""}</td>
                        <td>${business.paymentReference || ""}</td>
                        <td>${business.paymentStatus || ""}</td>
                        <td>${business.trialEndsAt || ""}</td>
                        <td>${business.paymentValidUntil || ""}</td>
                        <td>${paymentHistory}</td>
                    </tr>
                `;
            })
            .join("");

        const filePath =
            path.join(
                __dirname,
                "../pages/admin-payments.html"
            );

        let html =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        html = html.replace(
            "{{PAYMENT_ROWS}}",
            rows
        );

        res.send(html);

    } catch (error) {

        console.error(
            "Loading admin payments failed:",
            error
        );

        res.status(500).send(
            "Failed to load admin payments."
        );
    }
}

async function showNewPaymentPage(req, res) {

    try {

        const businesses =
            await Business.find({})
                .sort({ name: 1 })
                .lean();

        const businessOptions =
            businesses
                .map(business => `
                    <option value="${business._id}">
                        ${business.name || ""}
                        (${business.paymentReference || ""})
                    </option>
                `)
                .join("");

        const filePath =
            path.join(
                __dirname,
                "../pages/admin-payment-new.html"
            );

        let html =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        html = html.replace(
            "{{BUSINESS_OPTIONS}}",
            businessOptions
        );

        res.send(html);

    } catch (error) {

        console.error(
            "Loading new payment page failed:",
            error
        );

        res.status(500).send(
            "Failed to load new payment page."
        );
    }
}

async function recordPayment(req, res) {

    try {

        const {
            businessId,
            amount,
            paymentDate,
            payerName,
            transactionReference,
            notes
        } = req.body;

        const business =
            await Business.findById(
                businessId
            );

        console.log(
            "[ADMIN PAYMENTS] selected business:",
            business
        );

        if (!business) {
            return res.status(404).send(
                "Business not found."
            );
        }

        const Payment =
            require("../models/Payment");

        const payment =
            await Payment.create({

            businessId: business._id,

            paymentReference:
                business.paymentReference,

            amount:
                Number(amount),

            currency:
                "EUR",

            paymentDate:
                new Date(paymentDate),

            payerName:
                payerName || undefined,

            transactionReference:
                transactionReference || undefined,

            notes:
                notes || undefined,

            status:
                "confirmed",

            source:
                "manual"
        });

        const paymentValidFrom =
            new Date(payment.paymentDate);

        const paymentValidUntil =
            new Date(payment.paymentDate);

        paymentValidUntil.setMonth(
            paymentValidUntil.getMonth() + 1
        );

        business.paymentStatus = "valid";

        business.paymentValidUntil =
            paymentValidUntil;

        await business.save();

        res.redirect(
            "/admin/payments"
        );

    } catch (error) {

        console.error(
            "Recording payment failed:",
            error
        );

        res.status(500).send(
            "Failed to record payment."
        );
    }
}

module.exports = {
    showAdminPaymentsPage,
    showNewPaymentPage,
    recordPayment
};