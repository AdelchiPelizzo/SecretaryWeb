
const SipNumber = require("../models/SipNumber");
const Business = require("../models/Business");

async function assignAvailableSipNumber(businessId) {
    const sipNumber = await SipNumber.findOneAndUpdate(
        {
            status: "available",
            businessId: null
        },
        {
            $set: {
                status: "assigned",
                businessId,
                assignedAt: new Date(),
                reservedUntil: null
            }
        },
        {
            new: true,
            sort: { createdAt: 1 }
        }
    );

    if (!sipNumber) {
        return null;
    }

    try {
        const business = await Business.findByIdAndUpdate(
            businessId,
            {
                forwardingNumber: sipNumber.number
            },
            {
                new: true
            }
        );

        if (!business) {
            throw new Error("Business not found for SIP-number assignment.");
        }

        return sipNumber;
    } catch (error) {
        await SipNumber.updateOne(
            {
                _id: sipNumber._id,
                businessId
            },
            {
                $set: {
                    status: "available",
                    businessId: null,
                    assignedAt: null,
                    reservedUntil: null
                }
            }
        );

        throw error;
    }
}

module.exports = {
    assignAvailableSipNumber
};
