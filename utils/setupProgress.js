function getBusinessProgress(Business, business) {
    const systemFields = new Set([
        "_id",
        "__v",
        "ownerUserId",
        "createdAt",
        "updatedAt"
    ]);

    const fields = Object.keys(Business.schema.paths);

    let total = 0;
    let filled = 0;

    for (const field of fields) {
        if (systemFields.has(field)) {
            continue;
        }

        // Handle opening hours separately
        if (field.startsWith("hours.")) {
            const parts = field.split(".");
            const day = parts[1];
            const property = parts[2];

            const dayData = business?.hours?.[day];

            if (!dayData) {
                total++;
                continue;
            }

            // If the day is closed, open/close are not required
            if (
                dayData.closed === true &&
                (property === "open" || property === "close")
            ) {
                continue;
            }

            total++;

            const value = dayData[property];

            if (
                value !== undefined &&
                value !== null &&
                (
                    typeof value !== "string" ||
                    value.trim() !== ""
                )
            ) {
                filled++;
            }

            continue;
        }

        total++;

        const value = business?.[field];

        if (
            value !== undefined &&
            value !== null &&
            (
                typeof value !== "string" ||
                value.trim() !== ""
            )
        ) {
            filled++;
        }
    }

    const percentage = total === 0
        ? 0
        : Math.round((filled / total) * 100);

    return {
        total,
        filled,
        percentage
    };
}

function getSecretaryProgress(SecretaryConfig, secretaryConfig) {

    const systemFields = new Set([
        "_id",
        "__v",
        "businessId",
        "createdAt",
        "updatedAt"
    ]);

    const appointmentFields = new Set([
        "appointmentDuration",
        "bookingWindow",
        "bookingInstructions",
        "startTime",
        "endTime",
        "days"
    ]);

    const fields = Object.keys(SecretaryConfig.schema.paths);

    let total = 0;
    let filled = 0;

    for (const field of fields) {

        if (
            systemFields.has(field) ||
            appointmentFields.has(field)
        ) {
            continue;
        }

        total++;

        const value = secretaryConfig?.[field];

        if (
            value !== undefined &&
            value !== null &&
            (
                typeof value !== "string" ||
                value.trim() !== ""
            ) &&
            (
                !Array.isArray(value) ||
                value.length > 0
            )
        ) {
            filled++;
        }
    }

    const percentage = total === 0
        ? 0
        : Math.round((filled / total) * 100);

    return {
        total,
        filled,
        percentage
    };
}

function getAppointmentsProgress(SecretaryConfig, secretaryConfig) {

    const appointmentFields = new Set([
        "appointmentDuration",
        "bookingWindow",
        "bookingInstructions",
        "startTime",
        "endTime",
        "days"
    ]);

    let total = 0;
    let filled = 0;

    for (const field of appointmentFields) {

        total++;

        const value = secretaryConfig?.[field];

        if (
            value !== undefined &&
            value !== null &&
            (
                typeof value !== "string" ||
                value.trim() !== ""
            )
        ) {
            filled++;
        }
    }

    const percentage = total === 0
        ? 0
        : Math.round((filled / total) * 100);

    return {
        total,
        filled,
        percentage
    };
}

module.exports = {
    getBusinessProgress,
    getSecretaryProgress,
    getAppointmentsProgress
};