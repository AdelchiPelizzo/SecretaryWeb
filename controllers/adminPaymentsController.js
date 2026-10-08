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
                                ${new Date(
                                    payment.paymentDate
                                ).toLocaleDateString()}
                            </div>
                        `)
                        .join("")
                    : "No payments";

            const paymentActions =
                businessPayments.length > 0
                    ? businessPayments
                        .map(payment => `
                            <div>
                                <a
                                    href="/admin/payments/${payment._id}/edit">
                                    Edit
                                </a>
                            </div>
                        `)
                        .join("")
                    : "";

            return `
                <tr>
                    <td>${business.name || ""}</td>

                    <td>${business.paymentReference || ""}</td>

                    <td>
                        <form
                            method="POST"
                            action="/admin/payments/business/${business._id}/status">

                            <select
                                name="paymentStatus"
                                onchange="this.form.submit()">

                                <option
                                    value="trial"
                                    ${business.paymentStatus === "trial" ? "selected" : ""}>
                                    Trial
                                </option>

                                <option
                                    value="valid"
                                    ${business.paymentStatus === "valid" ? "selected" : ""}>
                                    Valid
                                </option>

                                <option
                                    value="expired"
                                    ${business.paymentStatus === "expired" ? "selected" : ""}>
                                    Expired
                                </option>

                            </select>

                        </form>
                    </td>

                    <td>
                        ${business.trialEndsAt
                            ? new Date(
                                business.trialEndsAt
                            ).toLocaleDateString()
                            : ""}
                    </td>

                    <td>
                        ${business.paymentValidUntil
                            ? new Date(
                                business.paymentValidUntil
                            ).toLocaleDateString()
                            : ""}
                    </td>

                    <td>
                        ${paymentHistory}
                    </td>

                    <td>
                        ${paymentActions}
                    </td>

                    <td>
                        ${businessPayments
                            .map(
                                payment =>
                                    payment.notes || ""
                            )
                            .join("<br>")}
                    </td>
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

async function showEditPaymentPage(req, res) {


try {

    const payment =
        await Payment.findById(
            req.params.paymentId
        ).lean();

    if (!payment) {

        return res.status(404).send(
            "Payment not found."
        );

    }

    const business =
        await Business.findById(
            payment.businessId
        ).lean();

    if (!business) {

        return res.status(404).send(
            "Business not found."
        );

    }

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

    const businessOptions = `
        <option value="${business._id}" selected>
            ${business.name || ""}
            (${business.paymentReference || ""})
        </option>
    `;

    html = html.replace(
        "{{BUSINESS_OPTIONS}}",
        businessOptions
    );

    html = html.replace(
        "<title>Record Payment</title>",
        "<title>Edit Payment</title>"
    );

    html = html.replace(
        "<h1>Record Payment</h1>",
        "<h1>Edit Payment</h1>"
    );

    html = html.replace(
        'action="/admin/payments/new"',
        `action="/admin/payments/${payment._id}/edit"`
    );

    html = html.replace(
        'name="amount"',
        `name="amount" value="${payment.amount}"`
    );

    html = html.replace(
        'name="paymentDate"',
        `name="paymentDate" value="${payment.paymentDate
            ? new Date(payment.paymentDate)
                .toISOString()
                .split("T")[0]
            : ""}"`
    );

    html = html.replace(
        'name="payerName"',
        `name="payerName" value="${payment.payerName || ""}"`
    );

    html = html.replace(
        'name="payerIBAN"',
        `name="payerIBAN" value="${payment.payerIBAN || ""}"`
    );

    html = html.replace(
        'name="periodFrom"',
        `name="periodFrom" value="${payment.periodFrom
            ? new Date(payment.periodFrom)
                .toISOString()
                .split("T")[0]
            : ""}"`
    );

    html = html.replace(
        'name="periodTo"',
        `name="periodTo" value="${payment.periodTo
            ? new Date(payment.periodTo)
                .toISOString()
                .split("T")[0]
            : ""}"`
    );

    html = html.replace(
        'name="transactionReference"',
        `name="transactionReference" value="${payment.transactionReference || ""}"`
    );

    html = html.replace(
        '<textarea id="notes" name="notes"></textarea>',
        `<textarea id="notes" name="notes">${payment.notes || ""}</textarea>`
    );

    html = html.replace(
        'value="confirmed"',
        `value="confirmed" ${payment.status === "confirmed" ? "selected" : ""}`
    );

    html = html.replace(
        "Record payment",
        "Save changes"
    );

    res.send(html);

} catch (error) {

    console.error(
        "Loading edit payment page failed:",
        error
    );

    res.status(500).send(
        "Failed to load edit payment page."
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

    business.paymentStatus =
        "valid";

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

async function updatePayment(req, res) {


try {

    const {
        amount,
        paymentDate,
        periodFrom,
        periodTo,
        payerName,
        payerIBAN,
        transactionReference,
        status,
        notes
    } = req.body;

    const payment =
        await Payment.findById(
            req.params.paymentId
        );

    if (!payment) {

        return res.status(404).send(
            "Payment not found."
        );
    }

    payment.amount =
        Number(amount);

    payment.paymentDate =
        new Date(paymentDate);

    payment.periodFrom =
        periodFrom
            ? new Date(periodFrom)
            : undefined;

    payment.periodTo =
        periodTo
            ? new Date(periodTo)
            : undefined;

    payment.payerName =
        payerName || undefined;

    payment.payerIBAN =
        payerIBAN || undefined;

    payment.transactionReference =
        transactionReference || undefined;

    payment.status =
        status;

    payment.notes =
        notes || undefined;

    await payment.save();

    res.redirect(
        "/admin/payments"
    );

} catch (error) {

    console.error(
        "Updating payment failed:",
        error
    );

    res.status(500).send(
        "Failed to update payment."
    );
}


}

async function updateBusinessPaymentStatus(req, res) {


try {

    const {
        paymentStatus
    } = req.body;

    if (
        ![
            "trial",
            "valid",
            "expired"
        ].includes(paymentStatus)
    ) {

        return res.status(400).send(
            "Invalid payment status."
        );
    }

    const business =
        await Business.findById(
            req.params.businessId
        );

    if (!business) {

        return res.status(404).send(
            "Business not found."
        );
    }

    business.paymentStatus =
        paymentStatus;

    await business.save();

    res.redirect(
        "/admin/payments"
    );

} catch (error) {

    console.error(
        "Updating business payment status failed:",
        error
    );

    res.status(500).send(
        "Failed to update business payment status."
    );
}


}

module.exports = {
showAdminPaymentsPage,
showNewPaymentPage,
showEditPaymentPage,
recordPayment,
updatePayment,
updateBusinessPaymentStatus
};
