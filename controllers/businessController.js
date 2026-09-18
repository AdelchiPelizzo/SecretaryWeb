const path = require("path");
const fs = require("fs");
const Business = require("../models/Business");

async function showBusinessPage(req, res) {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        const filePath = path.join(__dirname, "../pages/business.html");
        let html = fs.readFileSync(filePath, "utf8");

        html = html.replace("{{BUSINESS_NAME}}", business.name || "");
        html = html.replace("{{PHONE}}", business.phone || "");
        html = html.replace("{{EMAIL}}", business.email || "");
        html = html.replace("{{DESCRIPTION}}", business.description || "");
        html = html.replace("{{ADDRESS}}", business.address || "");
        html = html.replace("{{CITY}}", business.city || "");
        html = html.replace("{{POSTAL_CODE}}", business.postalCode || "");
        const hours = business.hours || {};
        html = html.replace("{{MONDAY_OPEN}}", hours.monday?.open || "");
        html = html.replace("{{MONDAY_CLOSE}}", hours.monday?.close || "");
        html = html.replace("{{MONDAY_CLOSED}}", hours.monday?.closed ? "checked" : "");

        html = html.replace("{{TUESDAY_OPEN}}", hours.tuesday?.open || "");
        html = html.replace("{{TUESDAY_CLOSE}}", hours.tuesday?.close || "");
        html = html.replace("{{TUESDAY_CLOSED}}", hours.tuesday?.closed ? "checked" : "");

        html = html.replace("{{WEDNESDAY_OPEN}}", hours.wednesday?.open || "");
        html = html.replace("{{WEDNESDAY_CLOSE}}", hours.wednesday?.close || "");
        html = html.replace("{{WEDNESDAY_CLOSED}}", hours.wednesday?.closed ? "checked" : "");

        html = html.replace("{{THURSDAY_OPEN}}", hours.thursday?.open || "");
        html = html.replace("{{THURSDAY_CLOSE}}", hours.thursday?.close || "");
        html = html.replace("{{THURSDAY_CLOSED}}", hours.thursday?.closed ? "checked" : "");

        html = html.replace("{{FRIDAY_OPEN}}", hours.friday?.open || "");
        html = html.replace("{{FRIDAY_CLOSE}}", hours.friday?.close || "");
        html = html.replace("{{FRIDAY_CLOSED}}", hours.friday?.closed ? "checked" : "");

        html = html.replace("{{SATURDAY_OPEN}}", hours.saturday?.open || "");
        html = html.replace("{{SATURDAY_CLOSE}}", hours.saturday?.close || "");
        html = html.replace("{{SATURDAY_CLOSED}}", hours.saturday?.closed ? "checked" : "");

        html = html.replace("{{SUNDAY_OPEN}}", hours.sunday?.open || "");
        html = html.replace("{{SUNDAY_CLOSE}}", hours.sunday?.close || "");
        html = html.replace("{{SUNDAY_CLOSED}}", hours.sunday?.closed ? "checked" : "");

        res.send(html);
    } catch (error) {
        console.error("Loading business failed:", error);
        res.status(500).send("Failed to load business.");
    }
}

async function saveBusiness(req, res) {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        business.name = req.body.businessName;
        business.phone = req.body.phone;
        business.email = req.body.email;
        business.description = req.body.description;
        business.address = req.body.address;
        business.city = req.body.city;
        business.postalCode = req.body.postalCode;
        business.hours = {
            monday: {
                open: req.body.mondayOpen || "",
                close: req.body.mondayClose || "",
                closed: req.body.mondayClosed === "on"
            },
            tuesday: {
                open: req.body.tuesdayOpen || "",
                close: req.body.tuesdayClose || "",
                closed: req.body.tuesdayClosed === "on"
            },
            wednesday: {
                open: req.body.wednesdayOpen || "",
                close: req.body.wednesdayClose || "",
                closed: req.body.wednesdayClosed === "on"
            },
            thursday: {
                open: req.body.thursdayOpen || "",
                close: req.body.thursdayClose || "",
                closed: req.body.thursdayClosed === "on"
            },
            friday: {
                open: req.body.fridayOpen || "",
                close: req.body.fridayClose || "",
                closed: req.body.fridayClosed === "on"
            },
            saturday: {
                open: req.body.saturdayOpen || "",
                close: req.body.saturdayClose || "",
                closed: req.body.saturdayClosed === "on"
            },
            sunday: {
                open: req.body.sundayOpen || "",
                close: req.body.sundayClose || "",
                closed: req.body.sundayClosed === "on"
            }
        };

        await business.save();

        res.redirect("/business");
    } catch (error) {
        console.error("Saving business failed:", error);
        res.status(500).send("Failed to save business.");
    }
}

module.exports = {
    showBusinessPage,
    saveBusiness
};