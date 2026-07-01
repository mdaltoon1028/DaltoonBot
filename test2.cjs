const Database = require('better-sqlite3');
const db = new Database('Daltoon_Bot.db');
const rows = db.prepare("SELECT key, value FROM kv WHERE key='settings'").all();
const data = { settings: JSON.parse(rows[0].value) };
console.log("Raw data.settings:", data.settings);

let parsedSettings = {};
if (data.settings) {
    parsedSettings = { ...data.settings };
    delete parsedSettings.panel_config;
    if (data.settings.panel_config) {
        const pc = typeof data.settings.panel_config === 'string' ? JSON.parse(data.settings.panel_config) : data.settings.panel_config;
        parsedSettings = { ...parsedSettings, ...pc };
    }
}
console.log("Parsed settings:", parsedSettings);
