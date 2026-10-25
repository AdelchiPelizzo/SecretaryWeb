
const fs = require("fs");
const path = require("path");

const localesDirectory = path.join(__dirname, "..", "locales");
const sourceFile = path.join(localesDirectory, "en.json");

function loadJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        console.error(`ERROR reading ${filePath}: ${error.message}`);
        return null;
    }
}

function getEntries(object, prefix = "") {
    const entries = {};

    for (const [key, value] of Object.entries(object)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            Object.assign(entries, getEntries(value, fullKey));
        } else {
            entries[fullKey] = value;
        }
    }

    return entries;
}

function main() {
    const english = loadJson(sourceFile);

    if (!english) {
        process.exitCode = 1;
        return;
    }

    const englishEntries = getEntries(english);
    const englishKeys = new Set(Object.keys(englishEntries));

    const localeFiles = ["ru.json"];

    let totalMissing = 0;
    let totalUnexpected = 0;
    let totalSameAsEnglish = 0;
    let failedFiles = 0;

    console.log("\nTranslation quality report");
    console.log("==========================");
    console.log(`English source keys: ${englishKeys.size}`);
    console.log(`Other language files: ${localeFiles.length}`);

    for (const file of localeFiles) {
        const locale = loadJson(
            path.join(localesDirectory, file)
        );

        if (!locale) {
            failedFiles++;
            continue;
        }

        const entries = getEntries(locale);
        const localeKeys = new Set(Object.keys(entries));

        const missing = [...englishKeys].filter(
            key => !(key in entries)
        );

        const unexpected = [...localeKeys].filter(
            key => !englishKeys.has(key)
        );

        const sameAsEnglish = [...englishKeys].filter(key =>
            key !== "_meta.language" &&
            key !== "_meta.direction" &&
            key in entries &&
            typeof englishEntries[key] === "string" &&
            typeof entries[key] === "string" &&
            entries[key].trim() !== "" &&
            entries[key] === englishEntries[key]
        );

        totalMissing += missing.length;
        totalUnexpected += unexpected.length;
        totalSameAsEnglish += sameAsEnglish.length;

        console.log(`\n--- ${file} ---`);
        console.log(
            `Missing: ${missing.length} | ` +
            `Unexpected: ${unexpected.length} | ` +
            `Same as English: ${sameAsEnglish.length}`
        );

        
        if (missing.length > 0) {
            console.log("\nMissing keys (first 20):");

            for (const key of missing.slice(0, 20)) {
                console.log(`  + ${key}`);
            }

            if (missing.length > 20) {
                console.log(
                    `  ... and ${missing.length - 20} more missing keys`
                );
            }
        }

        if (unexpected.length > 0) {
            console.log("\nUnexpected keys:");

            for (const key of unexpected) {
                console.log(`  - ${key}`);
            }
        }

        if (sameAsEnglish.length > 0) {
            console.log("\nValues identical to English:");

            for (const key of sameAsEnglish) {
                console.log(`  = ${key}`);
            }
        }

        if (
            missing.length === 0 &&
            unexpected.length === 0 &&
            sameAsEnglish.length === 0
        ) {
            console.log(
                "No structural issues or identical values detected."
            );
        }
    }

    console.log("\n==========================");
    console.log("TOTAL SUMMARY");
    console.log(`Missing keys: ${totalMissing}`);
    console.log(`Unexpected keys: ${totalUnexpected}`);
    console.log(
        `Values identical to English: ${totalSameAsEnglish}`
    );
    console.log(`Files that could not be read: ${failedFiles}`);
    console.log(
        "\nReport complete. No translation files were modified."
    );
}

main();
