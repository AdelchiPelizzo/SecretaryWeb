const Business = require("../models/Business");

async function generatePaymentReference() {
    let reference;

    do {
        reference =
            "SEC-" +
            Math.random()
                .toString(36)
                .substring(2, 7)
                .toUpperCase();

    } while (
        await Business.exists({
            paymentReference: reference
        })
    );

    return reference;
}

module.exports = {
    generatePaymentReference
};