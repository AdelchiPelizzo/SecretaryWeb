const path = require("path");
const fs = require("fs");

const Business = require("../models/Business");
const Note = require("../models/Note");
const User = require("../models/User");

async function showNotesPage(req, res) {
    try {
        const business = await Business.findOne({
            ownerUserId: req.session.userId
        });

        const user = await User.findById(req.session.userId);

        if (!business) {
            return res.status(404).send("Business not found.");
        }

        const notes = await Note.find({
            businessId: business._id
        })
            .sort({ createdAt: -1 })
            .lean();

        const filePath = path.join(__dirname, "../pages/notes.html");
        let html = fs.readFileSync(filePath, "utf8");

        const notesJson = JSON.stringify(notes);
        const language = business.language || "en";

        console.log("[NOTES] Business language:", language);
        console.log("[NOTES] Business object:", business);

        const localePath = path.join(
            __dirname,
            "../locales",
            `${language}.json`
        );

        let translations = {};

        if (fs.existsSync(localePath)) {
            translations = JSON.parse(
                fs.readFileSync(localePath, "utf8")
            );
        }
        html = html.replace(
            "{{NOTES_JSON}}",
            notesJson
        );

        html = html.replace(
            "{{BUSINESS_NAME}}",
            business.name
        );
        
        html = html.replace(
            "{{LANGUAGE}}",
            language
        );

        html = html.replace(
             "{{TRANSLATIONS_JSON}}",
              JSON.stringify(translations) 
        );        

        res.send(html);
    } catch (error) {
        console.error("Failed to load notes:", error);
        res.status(500).send("Failed to load notes.");
    }
}

module.exports = {
    showNotesPage
};