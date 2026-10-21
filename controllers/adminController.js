const Business = require("../models/Business");
const PageVisit = require("../models/PageVisit");
const path = require("path");
const fs = require("fs");

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short"
    });
}

function getStatus(status) {
    const statuses = {
        trial: "Trial",
        valid: "Valid",
        expired: "Expired"
    };

    return {
        key: statuses[status] ? status : "unknown",
        label: statuses[status] || "Unknown"
    };
}

async function showAdminOverviewPage(req, res) {
    try {
        // Load registered businesses.
        const businesses = await Business.find({})
            .sort({ createdAt: -1 })
            .populate(
                "ownerUserId",
                "firstName lastName email"
            )
            .lean();

        // Calculate business statistics.
        const counts = {
            total: businesses.length,
            trial: 0,
            valid: 0,
            expired: 0
        };

        const rows = businesses.map((business) => {
            const status = getStatus(business.paymentStatus);

            if (
                Object.prototype.hasOwnProperty.call(
                    counts,
                    status.key
                )
            ) {
                counts[status.key]++;
            }

            const owner = business.ownerUserId;

            const ownerName = owner
                ? [
                    owner.firstName,
                    owner.lastName
                ].filter(Boolean).join(" ") || owner.email
                : "Owner not found";

            return `
                <tr>
                    <td>
                        <strong class="business-name">
                            ${escapeHtml(business.name || "Unnamed business")}
                        </strong>
                        <span class="secondary-text">
                            ${escapeHtml(business.email || "")}
                        </span>
                    </td>

                    <td>
                        <strong>${escapeHtml(ownerName)}</strong>
                        <span class="secondary-text">
                            ${escapeHtml(owner?.email || "")}
                        </span>
                    </td>

                    <td>${escapeHtml(business.country || "—")}</td>
                    <td>${escapeHtml(business.language || "—")}</td>
                    <td>${escapeHtml(business.timezone || "—")}</td>
                    <td>${escapeHtml(business.forwardingNumber || "—")}</td>

                    <td>
                        <span class="admin-status admin-status-${status.key}">
                            ${escapeHtml(status.label)}
                        </span>
                    </td>

                    <td>${escapeHtml(formatDate(business.createdAt))}</td>
                </tr>
            `;
        }).join("");

        // Calculate homepage visit statistics using UTC.
        const now = new Date();

        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000
        );

        const thirtyDaysAgo = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
        );

        const [
            visitsToday,
            visitsLast7Days,
            visitsLast30Days,
            recentVisits
        ] = await Promise.all([
            PageVisit.countDocuments({
                page: "/",
                visitedAt: { $gte: todayStart }
            }),

            PageVisit.countDocuments({
                page: "/",
                visitedAt: { $gte: sevenDaysAgo }
            }),

            PageVisit.countDocuments({
                page: "/",
                visitedAt: { $gte: thirtyDaysAgo }
            }),

            PageVisit.find({ page: "/" })
                .sort({ visitedAt: -1 })
                .limit(20)
                .lean()
        ]);

        // Build the recent homepage visits table.
        const visitRows = recentVisits.map((visit) => `
            <tr>
                <td>${escapeHtml(visit.page)}</td>
                <td>${escapeHtml(formatDateTime(visit.visitedAt))}</td>
            </tr>
        `).join("");

        // Load the admin HTML template.
        const pagePath = path.join(
            __dirname,
            "../pages/admin.html"
        );

        let html = fs.readFileSync(pagePath, "utf8");

        // Insert business and visitor statistics.
        html = html
            .replace(
                "{{BUSINESS_ROWS}}",
                rows || `
                    <tr>
                        <td colspan="8" class="empty-state">
                            No businesses have been registered yet.
                        </td>
                    </tr>
                `
            )
            .replace(
                "{{BUSINESS_COUNT}}",
                String(counts.total)
            )
            .replace(
                "{{TRIAL_COUNT}}",
                String(counts.trial)
            )
            .replace(
                "{{VALID_COUNT}}",
                String(counts.valid)
            )
            .replace(
                "{{EXPIRED_COUNT}}",
                String(counts.expired)
            )
            .replace(
                "{{VISITS_TODAY}}",
                String(visitsToday)
            )
            .replace(
                "{{VISITS_7_DAYS}}",
                String(visitsLast7Days)
            )
            .replace(
                "{{VISITS_30_DAYS}}",
                String(visitsLast30Days)
            )
            .replace(
                "{{RECENT_VISITS}}",
                visitRows || `
                    <tr>
                        <td colspan="2" class="empty-state">
                            No homepage visits recorded yet.
                        </td>
                    </tr>
                `
            );

        // Send the completed admin page.
        return res.send(html);

    } catch (error) {
        console.error(
            "Loading admin overview failed:",
            error
        );

        return res.status(500).send(
            "Failed to load the admin overview."
        );
    }
}

module.exports = {
    showAdminOverviewPage
};