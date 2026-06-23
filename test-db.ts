import fs from "fs";
const possibleFiles = [
  "Daltoon_Bot.json",
  "db.json",
  "database.json",
  "bot_database.json",
];
const fileHasData = (filePath: string): boolean => {
  try {
    if (!fs.existsSync(filePath)) return false;
    const content = fs.readFileSync(filePath, "utf8").trim();
    if (!content) return false;
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.users) && parsed.users.length > 0) return true;
    if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0)
      return true;
    if (parsed.settings && parsed.settings.panel_config) {
      try {
        const config =
          typeof parsed.settings.panel_config === "string"
            ? JSON.parse(parsed.settings.panel_config)
            : parsed.settings.panel_config;
        if (
          config.botToken &&
          config.botToken !== "DUMMY_TOKEN" &&
          config.botToken.trim() !== ""
        ) {
          return true;
        }
      } catch (err) {}
    }
    return false;
  } catch (e) {
    return false;
  }
};
const dbJsonPath = (() => {
  for (const f of possibleFiles) {
    if (fileHasData(f)) return f;
  }
  return possibleFiles[0];
})();

console.log("dbJsonPath =", dbJsonPath);
const content = fs.readFileSync(dbJsonPath, "utf-8");
const db = JSON.parse(content);
console.log("Users count:", db.users?.length);
