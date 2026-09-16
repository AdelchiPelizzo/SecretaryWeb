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
        html = html.replace("{{HOURS}}", business.hours || "");

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
        business.hours = req.body.hours;

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