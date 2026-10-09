const path = require("path");
const fs = require("fs");

const SipNumber = require("../models/SipNumber");
const Business = require("../models/Business");
const {
    assignAvailableSipNumber
} = require("../utils/sipNumberAllocator");

async function showAdminSipNumbersPage(req, res) {
    try {
        const sipNumbers = await SipNumber.find({})
            .sort({ createdAt: 1 })
            .lean();

        const businesses = await Business.find({})
            .sort({ name: 1 })
            .lean();

        const businessMap = new Map(
            businesses.map(business => [
                business._id.toString(),
                business
            ])
        );

        const rows = sipNumbers.map(sipNumber => {
            const business = sipNumber.businessId
                ? businessMap.get(sipNumber.businessId.toString())
                : null;

            const businessOptions = businesses.map(item => `
                <option
                    value="${item._id}"
                    ${business && item._id.toString() === business._id.toString()
                        ? "selected"
                        : ""}
                >
                    ${escapeHtml(item.name || "Unnamed business")}
                </option>
            `).join("");

            let action = "";

            if (sipNumber.status === "assigned") {
                action = `
                    <form
                        method="POST"
                        action="/admin/sip-numbers/${sipNumber._id}/release"
                        onsubmit="return confirm('Release this SIP number?');"
                    >
                        <button type="submit">Release</button>
                    </form>
                `;
            } else if (
                sipNumber.status === "available" &&
                businesses.length > 0
            ) {
                action = `
                    <form
                        method="POST"
                        action="/admin/sip-numbers/${sipNumber._id}/assign"
                    >
                        <select name="businessId" required>
                            <option value="">Select business</option>
                            ${businessOptions}
                        </select>
                        <button type="submit">Assign</button>
                    </form>
                `;
            }

            return `
                <tr>
                    <td>${escapeHtml(sipNumber.number)}</td>
                    <td>${escapeHtml(sipNumber.status)}</td>
                    <td>${escapeHtml(business ? business.name : "—")}</td>
                    <td>${sipNumber.assignedAt
                        ? new Date(sipNumber.assignedAt).toLocaleDateString()
                        : "—"}</td>
                    <td>${action}</td>
                </tr>
            `;
        }).join("");

        const filePath = path.join(
            __dirname,
            "../pages/admin-sip-numbers.html"
        );

        let html = fs.readFileSync(filePath, "utf8");

        html = html.replace("{{SIP_NUMBER_ROWS}}", rows);

        res.send(html);
    } catch (error) {
        console.error("Loading admin SIP numbers failed:", error);
        res.status(500).send("Failed to load SIP numbers.");
    }
}

async function addSipNumber(req, res) {
    try {
        const number = String(req.body.number || "").trim();

        if (!/^[0-9+()\-\s]{5,25}$/.test(number)) {
            return res.status(400).send("Invalid SIP destination number.");
        }

        const existingNumber = await SipNumber.findOne({ number });

        if (existingNumber) {
            return res.status(409).send("This SIP number already exists.");
        }

        await SipNumber.create({
            number,
            status: "available",
            businessId: null,
            assignedAt: null,
            reservedUntil: null
        });

        res.redirect("/admin/sip-numbers");
    } catch (error) {
        console.error("Adding SIP number failed:", error);

        if (error.code === 11000) {
            return res.status(409).send("This SIP number already exists.");
        }

        res.status(500).send("Failed to add SIP number.");
    }
}

async function releaseSipNumber(req, res) {
    try {
        const sipNumber = await SipNumber.findById(
            req.params.sipNumberId
        );

        if (!sipNumber) {
            return res.status(404).send("SIP number not found.");
        }

        if (sipNumber.status !== "assigned" || !sipNumber.businessId) {
            return res.status(400).send(
                "This SIP number is not currently assigned."
            );
        }

        const business = await Business.findById(sipNumber.businessId);

        if (business &&
            String(business.forwardingNumber || "") === sipNumber.number) {
            business.forwardingNumber = "";
            await business.save();
        }

        sipNumber.status = "available";
        sipNumber.businessId = null;
        sipNumber.assignedAt = null;
        sipNumber.reservedUntil = null;

        await sipNumber.save();

        res.redirect("/admin/sip-numbers");
    } catch (error) {
        console.error("Releasing SIP number failed:", error);
        res.status(500).send("Failed to release SIP number.");
    }
}

async function assignSipNumber(req, res) {
    try {
        const { businessId } = req.body;

        const sipNumber = await SipNumber.findById(
            req.params.sipNumberId
        );

        if (!sipNumber) {
            return res.status(404).send("SIP number not found.");
        }

        if (sipNumber.status !== "available" || sipNumber.businessId) {
            return res.status(409).send(
                "This SIP number is not available for assignment."
            );
        }

        const business = await Business.findById(businessId);

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        if (business.forwardingNumber) {
            return res.status(409).send(
                "This business already has a forwarding number. Release or clear it first."
            );
        }

        const assignedNumber = await assignAvailableSipNumber(business._id);

        if (!assignedNumber) {
            return res.status(409).send(
                "The number could not be assigned. It may no longer be available."
            );
        }

        res.redirect("/admin/sip-numbers");
    } catch (error) {
        console.error("Assigning SIP number failed:", error);
        res.status(500).send("Failed to assign SIP number.");
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

module.exports = {
    showAdminSipNumbersPage,
    addSipNumber,
    releaseSipNumber,
    assignSipNumber
};