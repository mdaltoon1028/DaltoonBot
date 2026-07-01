const Database = require('better-sqlite3');
const db = new Database('Daltoon_Bot.db');
const rows = db.prepare("SELECT key, value FROM kv").all();
console.log(rows.map(r => r.key));
