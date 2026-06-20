import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { spawn, ChildProcess, exec } from "child_process";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Explicit absolute dotenv loads for absolute correctness across nested builds
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const _dirname = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

try {
  dotenv.config({ path: path.resolve(_dirname, ".env") });
  dotenv.config({ path: path.resolve(_dirname, "..", ".env") });
} catch (e) {}

// Disable SSL verification for outgoing requests to 3x-ui panels
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Path to JSON-based DB store (relative to script to support reliable CWD-independent execution like PM2)
const dbJsonPath = (() => {
  const customFile = "database.json";
  const defaultFile = "Daltoon_Bot.json";
  
  const legacyPath = _dirname.endsWith("dist")
    ? path.resolve(_dirname, "..", customFile)
    : path.resolve(_dirname, customFile);

  const defaultPath = _dirname.endsWith("dist")
    ? path.resolve(_dirname, "..", defaultFile)
    : path.resolve(_dirname, defaultFile);

  // Helper inspect file for actual registered data
  const fileHasData = (filePath: string): boolean => {
    try {
      if (!fs.existsSync(filePath)) return false;
      const content = fs.readFileSync(filePath, "utf8").trim();
      if (!content) return false;
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.users) && parsed.users.length > 0) return true;
      if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) return true;
      if (parsed.settings && parsed.settings.panel_config) {
        try {
          const config = JSON.parse(parsed.settings.panel_config);
          if (config.botToken && config.botToken !== "DUMMY_TOKEN" && config.botToken.trim() !== "") {
            return true;
          }
        } catch (err) {}
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // 1. Automatic database migration: If legacyPath has actual data but defaultPath doesn't, migrate it!
  if (!fileHasData(defaultPath) && fileHasData(legacyPath)) {
    console.log(`[Database Migration] Default DB (${defaultPath}) is empty/seeded, but legacy DB (${legacyPath}) has active data. Migrating...`);
    try {
      fs.copyFileSync(legacyPath, defaultPath);
      console.log(`[Database Migration] Migration completed successfully!`);
    } catch (migErr: any) {
      console.error(`[Database Migration Error] Failed to migrate database:`, migErr.message);
    }
  }

  // 2. If defaultFile (Daltoon_Bot.json) exists and has actual data, prioritize it!
  if (fileHasData(defaultPath)) {
    console.log(`[Database Setup] Active database found at: ${defaultPath}`);
    return defaultPath;
  }
  
  // 3. If legacyPath (database.json) has actual data, use it!
  if (fileHasData(legacyPath)) {
    console.log(`[Database Setup] Legacy database found with data at: ${legacyPath}`);
    return legacyPath;
  }

  // 4. Fallback: If defaultFile exists at all, use it even if empty
  if (fs.existsSync(defaultPath)) {
    console.log(`[Database Setup] Using existing default empty db at: ${defaultPath}`);
    return defaultPath;
  }

  // 5. Fallback to legacy path if it exists at all
  if (fs.existsSync(legacyPath)) {
    console.log(`[Database Setup] Using existing legacy empty db at: ${legacyPath}`);
    return legacyPath;
  }

  console.log(`[Database Setup] Creating new database at: ${defaultPath}`);
  return defaultPath;
})();

// Helper to load port dynamically from DB config
function getServerPort(): number {
  // Try to load port from database
  try {
    if (fs.existsSync(dbJsonPath)) {
      const dbContent = fs.readFileSync(dbJsonPath, 'utf8');
      const dbData = JSON.parse(dbContent);
      if (dbData.settings && dbData.settings.panel_config) {
        let pc = dbData.settings.panel_config;
        if (typeof pc === "string") pc = JSON.parse(pc);
        if (pc.serverPort && !isNaN(Number(pc.serverPort))) {
          // Inside AI Studio Sandbox, port is strictly controlled by proxy/infra
          if (process.env.NODE_ENV !== 'production' && process.env.PORT === '3000') {
             return 3000; // Force 3000 in sandbox to prevent proxy breakage
          }
          return Number(pc.serverPort);
        }
      }
    }
  } catch (err) {
    console.error("Error reading port from DB configurations, defaulting to 3000", err);
  }
  return process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
}

// Set up server port
const PORT = getServerPort();
const app = express();

console.log("[AI Studio Debug] process.env.GEMINI_API_KEY loaded:", process.env.GEMINI_API_KEY ? `Yes (length: ${process.env.GEMINI_API_KEY.length}, starts with: ${process.env.GEMINI_API_KEY.substring(0, 5)})` : "No (undefined/empty)");
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
console.log(`[Database] Connecting to JSON file database at: ${dbJsonPath}`);

// Define types for pure JSON database to align perfectly with schema
interface DbSchema {
  users: any[];
  transactions: any[];
  subscription_keys: any[];
  inbounds: any[];
  custom_buttons: any[];
  vpn_plans?: any[];
  gift_codes?: any[];
  promo_codes?: any[];
  tickets?: any[];
  colleague_packages?: any[];
  colleague_accounts?: any[];
  logs?: any[];
  settings: Record<string, string>;
}

// Function to read JSON Database, seeding with default templates if not found
function readJsonDb(): DbSchema {
  try {
    if (!fs.existsSync(dbJsonPath)) {
      console.log("[Database] JSON database not found. Seeding initial templates...");
      const defaultDb: DbSchema = {
        users: [],
        transactions: [],
        subscription_keys: [],
        vpn_plans: [],
        colleague_packages: [],
        colleague_accounts: [],
        inbounds: [],
        custom_buttons: [],
        gift_codes: [],
        promo_codes: [],
        tickets: [],
        settings: {
          panel_config: JSON.stringify({
            botToken: process.env.BOT_TOKEN || "",
            baseUrl: "",
            panelUrl: "",
            panelUsername: "",
            panelPassword: "",
            activeInboundIds: [],
            ownerId: process.env.OWNER_ID ? Number(process.env.OWNER_ID) : 0,
            cardNumber: process.env.CARD_NUMBER || "",
            cardHolder: process.env.CARD_HOLDER || "",
            bankName: "",
            welcomeText: "",
            supportText: "",
            btnTextGuides: "",
            guidesText: "",
            hideSupport: false,
            hideBuy: false,
            hideProfile: false,
            hideWallet: false,
            dashboardUsername: process.env.DASHBOARD_USERNAME || "admin",
            dashboardPassword: process.env.DASHBOARD_PASSWORD || "admin",
            serverPort: process.env.DASHBOARD_PORT ? parseInt(process.env.DASHBOARD_PORT, 10) : 3000,
            admins: []
          })
        }
      };
      fs.writeFileSync(dbJsonPath, JSON.stringify(defaultDb, null, 2), "utf8");
      return defaultDb;
    }
    const raw = fs.readFileSync(dbJsonPath, "utf8");
    const db = JSON.parse(raw);
    
    let modified = false;
    // Backport empty arrays on existing database structures
    if (!db.vpn_plans) {
      db.vpn_plans = [];
      modified = true;
    }

    if (!db.promo_codes) {
      db.promo_codes = [];
      modified = true;
    }

    if (!db.tickets) {
      db.tickets = [];
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(dbJsonPath, JSON.stringify(db, null, 2), "utf8");
    }

    return db;
  } catch (err) {
    console.error("[Database] Read error, returning empty dataset:", err);
    return { users: [], transactions: [], subscription_keys: [], inbounds: [], custom_buttons: [], vpn_plans: [], settings: {}, gift_codes: [], promo_codes: [], tickets: [], colleague_packages: [], colleague_accounts: [] };
  }
}

// Function to write back data
function writeJsonDb(data: DbSchema) {
  try {
    fs.writeFileSync(dbJsonPath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("[Database] Write error to JSON store:", err);
  }
}

function getSystemSettings(db?: any) {
  const data = db || readJsonDb();
  let parsedSettings = {};
  if (data.settings && data.settings.panel_config) {
    try {
      parsedSettings = JSON.parse(data.settings.panel_config);
    } catch(e) {}
  }
  
  const settings: any = {
    botToken: process.env.BOT_TOKEN || "",
    baseUrl: process.env.XUI_URL || "",
    panelUrl: "",
    panelUsername: process.env.PANEL_USER || "",
    panelPassword: process.env.PANEL_PASS || "",
    activeInboundIds: [],
    ownerId: process.env.OWNER_ID ? Number(process.env.OWNER_ID) : 0,
    cardNumber: process.env.CARD_NUMBER || "",
    cardHolder: process.env.CARD_HOLDER || "",
    bankName: "",
    welcomeText: "",
    supportText: "",
    hideSupport: false,
    hideBuy: false,
    hideProfile: false,
    hideWallet: false,
    dashboardUsername: process.env.PANEL_USER || "Daltoon",
    dashboardPassword: process.env.PANEL_PASS || "Daltoon10",
    serverPort: 3000,
    admins: [],
    panelConnectionActive: false,
    ...parsedSettings
  };

  if (!settings.botToken && process.env.BOT_TOKEN) settings.botToken = process.env.BOT_TOKEN;
  if (!settings.ownerId && process.env.OWNER_ID) settings.ownerId = Number(process.env.OWNER_ID);
  if (!settings.dashboardUsername && process.env.PANEL_USER) settings.dashboardUsername = process.env.PANEL_USER;
  if (!settings.dashboardPassword && process.env.PANEL_PASS) settings.dashboardPassword = process.env.PANEL_PASS;
  
  return settings;
}

let botProcess: ChildProcess | null = null;
let pythonDepsInstalled = false;

function startPythonBot() {
  // Check if we are running in PM2 environment
  const isPM2 = process.env.PM2_HOME !== undefined || process.env.pm_id !== undefined || process.env.name === "daltoon-store";

  if (isPM2) {
    console.log("[Bot Manager] Running in PM2 environment. Delegating bot restart to PM2 daemon to avoid duplicate polling conflicts...");
    exec("pm2 restart daltoon-bot", (err, stdout, stderr) => {
      if (err) {
        console.error("[Bot Manager] Failed to restart daltoon-bot via PM2:", err.message);
      } else {
        console.log("[Bot Manager] daltoon-bot process restarted successfully via PM2.");
      }
    });
    return;
  }

  if (botProcess) {
    console.log("[Bot Manager] Stopping old Python bot process...");
    botProcess.kill("SIGKILL");
    botProcess = null;
  }

  // Load latest settings to check if BOT_TOKEN is empty
  const db = readJsonDb();
  const settings = getSystemSettings(db);
  const token = settings.botToken;

  if (!token || token === "DUMMY_TOKEN" || token.trim() === "") {
    console.log("[Bot Manager] Bot token is empty or dummy. Python bot will not start.");
    return;
  }

  const runBot = () => {
    console.log(`[Bot Manager] Starting Python Telegram Bot with token ${token.substring(0, 6)}...`);
    try {
      const pythonCmd = "python3";
      const botScriptPath = path.resolve(process.cwd(), "bot.py");
      
      botProcess = spawn(pythonCmd, ["-u", botScriptPath], {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
        stdio: "pipe",
      });

      const logStream = fs.createWriteStream("bot_dev.log", { flags: "a" });
      
      botProcess.stdout?.on("data", (data) => {
        const msg = data.toString();
        console.log(`[Bot Output]: ${msg.trim()}`);
        logStream.write(`[STDOUT] ${msg}`);
      });

      botProcess.stderr?.on("data", (data) => {
        const msg = data.toString();
        console.error(`[Bot Error]: ${msg.trim()}`);
        logStream.write(`[STDERR] ${msg}`);
      });

      botProcess.on("close", (code) => {
        console.log(`[Bot Manager] Python bot process closed with code ${code}`);
        botProcess = null;
      });

      botProcess.on("error", (err) => {
        console.error("[Bot Manager] Failed to start Python bot process:", err);
      });
    } catch (err) {
      console.error("[Bot Manager] Exception when spawning python:", err);
    }
  };

  if (!pythonDepsInstalled) {
    console.log("[Bot Manager] Ensuring Python dependencies (pyTelegramBotAPI, python-dotenv, requests) are installed...");
    exec("pip3 install pyTelegramBotAPI python-dotenv requests --break-system-packages || pip install pyTelegramBotAPI python-dotenv requests", (err, stdout, stderr) => {
      pythonDepsInstalled = true;
      if (err) {
        console.error("[Bot Manager] Failed to install Python dependencies:", err.message);
      } else {
        console.log("[Bot Manager] Python dependencies verified/installed successfully.");
      }
      runBot();
    });
  } else {
    runBot();
  }
}

// Ensure database file gets seeded on startup
readJsonDb();
startPythonBot();

// --- API Endpoints ---

// Reset Database API
app.post("/api/database/reset", async (req, res) => {
  try {
    if (fs.existsSync(dbJsonPath)) {
      fs.unlinkSync(dbJsonPath);
    }
    const freshDb = readJsonDb();
    res.json({ success: true, message: "Database reset to empty template successfully." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Get complete aggregated database snapshot
app.get("/api/data", async (req, res) => {
  try {
    const db = readJsonDb();
    const settings = getSystemSettings(db);

    // Ensure admins list is properly formatted
    if (!settings.admins || !Array.isArray(settings.admins)) {
      settings.admins = [];
    }

    // REAL-TIME 3X-UI INBOUNDS MONITORING IMPLEMENTATION
    if (settings.panelConnectionActive && settings.baseUrl && settings.panelUsername && settings.panelPassword) {
      try {
        const cleanedUrl = normalizeXuiUrl(settings.baseUrl);
        const loginResult = await loginXuiPanel(cleanedUrl, settings.panelUsername, settings.panelPassword);

        if (loginResult.success && loginResult.cookie) {
          // 2. Fetch the active state of all inbounds
          const listRes = await xuiFetch(`${cleanedUrl}/panel/api/inbounds/list`, {
            method: "GET",
            headers: { 
              "Cookie": loginResult.cookie
            }
          }, 5000);

            if (listRes.ok) {
              const listText = await listRes.text();
              const listJson = JSON.parse(listText);
              if (listJson && listJson.success && Array.isArray(listJson.obj)) {
                // Map Sanaei obj data into local DB inbounds structure
                const freshInbounds = listJson.obj.map((item: any) => {
                  let totalClientsCount = 0;
                  try {
                    const settingsObj = typeof item.settings === "string" ? JSON.parse(item.settings) : item.settings;
                    if (settingsObj && Array.isArray(settingsObj.clients)) {
                      totalClientsCount = settingsObj.clients.length;
                    }
                  } catch (e) {}

                  const usedGb = ((Number(item.up || 0) + Number(item.down || 0)) / (1024 * 1024 * 1024)).toFixed(1);
                  const limitGb = item.total ? (Number(item.total) / (1024 * 1024 * 1024)).toFixed(0) : "unlimited";

                  return {
                    id: item.id,
                    remark: item.remark || `Inbound #${item.id}`,
                    protocol: item.protocol || "vless",
                    port: item.port || 1234,
                    totalClients: totalClientsCount,
                    trafficUsed: usedGb,
                    trafficLimit: limitGb,
                    status: item.enable ? "active" : "inactive"
                  };
                });

                // Overwrite inbounds with real live data
                db.inbounds = freshInbounds;
                writeJsonDb(db);
              }
            }
          }
      } catch (e: any) {
        console.warn("[Background 3x-ui Sync Warning]:", e.message);
      }
    }

    res.json({
      success: true,
      users: db.users,
      transactions: db.transactions,
      keys: db.subscription_keys,
      inbounds: db.inbounds,
      customButtons: db.custom_buttons,
      vpnPlans: db.vpn_plans || [],
      giftCodes: db.gift_codes || [],
      promoCodes: db.promo_codes || [],
      tickets: db.tickets || [],
      colleaguePackages: db.colleague_packages || [],
      colleagueAccounts: db.colleague_accounts || [],
      logs: db.logs || [],
      settings
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Save panel configuration
// --- GIFT CODES API ---
app.get("/api/gift-codes", (req, res) => {
  const db = readJsonDb();
  res.json(db.gift_codes || []);
});

app.post("/api/gift-codes", (req, res) => {
  const db = readJsonDb();
  if (!db.gift_codes) db.gift_codes = [];
  const { code, amount, maxUsage } = req.body;
  if (!code || !amount || maxUsage === undefined) return res.status(400).json({ error: "Missing fields" });

  const newCode = {
    id: crypto.randomUUID(),
    code,
    amount: parseInt(amount, 10),
    maxUsage: parseInt(maxUsage, 10),
    totalUsage: 0,
    usedBy: [],
    createdAt: new Date().toISOString()
  };
  db.gift_codes.push(newCode);
  writeJsonDb(db);
  res.json({ success: true, item: newCode });
});

app.post("/api/gift-codes/delete", (req, res) => {
  const db = readJsonDb();
  if (!db.gift_codes) db.gift_codes = [];
  db.gift_codes = db.gift_codes.filter(c => c.id !== req.body.id);
  writeJsonDb(db);
  res.json({ success: true });
});

// --- Colleague Endpoints ---
app.post("/api/colleague-packages/save", (req, res) => {
  const db = readJsonDb();
  if (!db.colleague_packages) db.colleague_packages = [];
  const { id, title, price, trafficGb, description } = req.body;
  if (!id || !title || price === undefined || trafficGb === undefined) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const existingIdx = db.colleague_packages.findIndex(p => p.id === id);
  if (existingIdx !== -1) {
    db.colleague_packages[existingIdx] = { id, title, price: Number(price), trafficGb: Number(trafficGb), description };
  } else {
    db.colleague_packages.push({ id, title, price: Number(price), trafficGb: Number(trafficGb), description });
  }
  writeJsonDb(db);
  res.json({ success: true, colleaguePackages: db.colleague_packages });
});

app.post("/api/colleague-packages/delete", (req, res) => {
  const db = readJsonDb();
  if (!db.colleague_packages) db.colleague_packages = [];
  db.colleague_packages = db.colleague_packages.filter(p => p.id !== req.body.id);
  writeJsonDb(db);
  res.json({ success: true, colleaguePackages: db.colleague_packages });
});

app.post("/api/colleague-accounts/delete", (req, res) => {
  const db = readJsonDb();
  if (!db.colleague_accounts) db.colleague_accounts = [];
  db.colleague_accounts = db.colleague_accounts.filter(a => a.id !== req.body.id);
  writeJsonDb(db);
  res.json({ success: true, colleagueAccounts: db.colleague_accounts });
});

app.post("/api/colleague-accounts/reset", (req, res) => {
  const db = readJsonDb();
  if (!db.colleague_accounts) db.colleague_accounts = [];
  
  const accIndex = db.colleague_accounts.findIndex(a => a.id === req.body.id);
  if (accIndex !== -1) {
    db.colleague_accounts[accIndex].username = Math.random().toString(36).substring(2, 10);
    db.colleague_accounts[accIndex].password = Math.random().toString(36).substring(2, 10);
    writeJsonDb(db);
    res.json({ success: true, colleagueAccounts: db.colleague_accounts });
  } else {
    res.json({ success: false, error: "Account not found" });
  }
});

app.post("/api/colleague-accounts/edit", (req, res) => {
  const db = readJsonDb();
  if (!db.colleague_accounts) db.colleague_accounts = [];
  
  const accIndex = db.colleague_accounts.findIndex(a => a.id === req.body.id);
  if (accIndex !== -1 && req.body.trafficGb !== undefined) {
    db.colleague_accounts[accIndex].trafficGb = req.body.trafficGb;
    writeJsonDb(db);
    res.json({ success: true, colleagueAccounts: db.colleague_accounts });
  } else {
    res.json({ success: false, error: "Account not found or missing fields" });
  }
});

app.post("/api/colleague-accounts/reset-usage", (req, res) => {
  const db = readJsonDb();
  if (!db.colleague_accounts) db.colleague_accounts = [];
  
  const accIndex = db.colleague_accounts.findIndex(a => a.id === req.body.id);
  if (accIndex !== -1) {
    db.colleague_accounts[accIndex].usedTrafficGb = 0;
    db.colleague_accounts[accIndex].realUsedTrafficGb = 0;
    writeJsonDb(db);
    res.json({ success: true, colleagueAccounts: db.colleague_accounts });
  } else {
    res.json({ success: false, error: "Account not found" });
  }
});

// --- PROMO CODES ENDPOINTS ---
app.post("/api/promo-codes", (req, res) => {
  try {
    const db = readJsonDb();
    if (!db.promo_codes) db.promo_codes = [];
    const nextCode = req.body;
    
    const idx = db.promo_codes.findIndex((p: any) => p.id === nextCode.id || p.code === nextCode.code);
    if (idx >= 0) {
      db.promo_codes[idx] = nextCode;
    } else {
      db.promo_codes.push(nextCode);
    }
    
    writeJsonDb(db);
    res.json({ success: true, item: nextCode });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/promo-codes/delete", (req, res) => {
  try {
    const db = readJsonDb();
    if (!db.promo_codes) db.promo_codes = [];
    db.promo_codes = db.promo_codes.filter((p: any) => p.id !== req.body.id);
    writeJsonDb(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- TICKETS ENDPOINTS ---
app.post("/api/tickets/create", (req, res) => {
  try {
    const { userId, username, subject, message } = req.body;
    const db = readJsonDb();
    if (!db.tickets) db.tickets = [];

    const ticketId = "TKB-" + Math.floor(Math.random() * 9000 + 1000);
    const newTicket = {
      id: ticketId,
      userId: Number(userId),
      username: username || ("user_" + userId),
      subject: subject,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          sender: "user",
          message: message,
          date: new Date().toISOString()
        }
      ]
    };

    db.tickets.push(newTicket);
    writeJsonDb(db);

    res.json({ success: true, ticketId, tickets: db.tickets, ticket: newTicket });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/tickets/delete", (req, res) => {
  try {
    const { ticketId } = req.body;
    const db = readJsonDb();
    if (!db.tickets) db.tickets = [];

    db.tickets = db.tickets.filter((t: any) => t.id !== ticketId);
    writeJsonDb(db);

    res.json({ success: true, tickets: db.tickets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/tickets/reply", (req, res) => {
  try {
    const { ticketId, reply } = req.body;
    const db = readJsonDb();
    if (!db.tickets) db.tickets = [];
    
    const ticketIdx = db.tickets.findIndex((t: any) => t.id === ticketId);
    if (ticketIdx >= 0) {
      const ticket = db.tickets[ticketIdx];
      ticket.messages.push({
        sender: "admin",
        message: reply,
        date: new Date().toISOString()
      });
      ticket.status = "answered";
      ticket.updatedAt = new Date().toISOString();
      
      writeJsonDb(db);
      res.json({ success: true, ticket });
    } else {
      res.status(404).json({ success: false, error: "Ticket not found" });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/tickets/close", (req, res) => {
  try {
    const { ticketId } = req.body;
    const db = readJsonDb();
    if (!db.tickets) db.tickets = [];
    
    const ticketIdx = db.tickets.findIndex((t: any) => t.id === ticketId);
    if (ticketIdx >= 0) {
      db.tickets[ticketIdx].status = "closed";
      db.tickets[ticketIdx].updatedAt = new Date().toISOString();
      writeJsonDb(db);
      res.json({ success: true, ticket: db.tickets[ticketIdx] });
    } else {
      res.status(404).json({ success: false, error: "Ticket not found" });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- REGEN UUID & TRANSFER KEY CONNECTIONS ---
app.post("/api/subscription-keys/regenerate-uuid", async (req, res) => {
  try {
    const { id, userId } = req.body;
    const db = readJsonDb();
    const subIdx = db.subscription_keys.findIndex((k: any) => k.id === id);
    if (subIdx >= 0) {
      const key = db.subscription_keys[subIdx];
      // Generate a brand new client Name identifier / UUID simulation
      const newUuid = Math.random().toString(36).substring(2, 12) + "-" + Math.random().toString(36).substring(2, 10);
      
      // Let's replace the link token
      if (key.subLink) {
        // e.g. vless://uuid@host:port... or https://host/sub/clientEmail
        if (key.subLink.includes("://")) {
          // Replace matching part before host
          key.subLink = key.subLink.replace(/:\/\/[^@]+@/, `://${newUuid}@`);
        } else {
          // Normal HTTP sub link, append an updated revision parameter or randomize route Email
          const randEmail = "rev_" + Math.random().toString(36).substring(2, 8);
          key.subLink = key.subLink.substring(0, key.subLink.lastIndexOf("/") + 1) + randEmail;
        }
      }
      
      db.subscription_keys[subIdx] = key;
      writeJsonDb(db);
      res.json({ success: true, key });
    } else {
      res.status(404).json({ success: false, error: "Subscription entry not found." });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/subscription-keys/transfer-ownership", async (req, res) => {
  try {
    const { id, targetUserIdOrUsername } = req.body;
    const db = readJsonDb();
    
    const cleanTarget = String(targetUserIdOrUsername).replace("@", "").trim();
    const targetUser = db.users.find(
      (u: any) => String(u.userId) === cleanTarget || String(u.username).toLowerCase() === cleanTarget.toLowerCase()
    );
    
    if (!targetUser) {
      return res.status(400).json({ success: false, error: "کاربر مقصد در سیستم یافت نشد. دوست شما باید حداقل یکبار دکمه /start را در ربات زده باشد." });
    }
    
    const subIdx = db.subscription_keys.findIndex((k: any) => k.id === id);
    if (subIdx >= 0) {
      const key = db.subscription_keys[subIdx];
      const oldUserId = key.userId;
      
      // Transfer
      key.userId = targetUser.userId;
      db.subscription_keys[subIdx] = key;
      
      // Recalculate
      const oldUser = db.users.find((u: any) => u.userId === oldUserId);
      if (oldUser) {
        oldUser.activePlansCount = db.subscription_keys.filter((k: any) => k.userId === oldUserId && k.status === "active").length;
      }
      targetUser.activePlansCount = db.subscription_keys.filter((k: any) => k.userId === targetUser.userId && k.status === "active").length;
      
      writeJsonDb(db);
      res.json({ success: true, key, targetUsername: targetUser.username || String(targetUser.userId) });
    } else {
      res.status(404).json({ success: false, error: "کانفیگ مورد نظر یافت نشد." });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/transactions/instant-pay", async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    const db = readJsonDb();
    
    const user = db.users.find((u: any) => u.userId === Number(userId));
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    
    const amountNum = Number(amount);
    user.walletBalance = Number(user.walletBalance) + amountNum;
    
    const newTx = {
      id: "TX-AUTO-" + Math.floor(Math.random() * 90000 + 10000),
      userId: Number(userId),
      username: user.username,
      amount: amountNum,
      receiptImage: "bg-gradient-to-br from-emerald-500 to-teal-700",
      status: "approved",
      date: new Date().toISOString(),
      description: description || "پرداخت خودکار آنلاین"
    };
    
    db.transactions.unshift(newTx);
    writeJsonDb(db);
    res.json({ success: true, userWalletBalance: user.walletBalance, tx: newTx });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- AI Chatbot Feature ---
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    let key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Try to load from database settings first, which persists across deployments and doesn't rely on .env files
      try {
        const db = readJsonDb();
        if (db && db.settings && db.settings.panel_config) {
          const cfg = JSON.parse(db.settings.panel_config);
          if (cfg && cfg.geminiApiKey && cfg.geminiApiKey.trim() !== "") {
            key = cfg.geminiApiKey.trim();
            process.env.GEMINI_API_KEY = key;
            console.log("[AI Studio DB Load] Successfully loaded GEMINI_API_KEY from database settings.");
          }
        }
      } catch (e: any) {
        console.warn("[AI Studio DB Load Warning] Could not parse geminiApiKey from Daltoon_Bot.json settings:", e.message);
      }
    }

    if (!key) {
      // Direct file-based parser fallback for absolute correctness across nested environments
      try {
        const envPaths = [
          path.resolve(process.cwd(), ".env"),
          path.resolve(_dirname, ".env"),
          path.resolve(_dirname, "..", ".env"),
          path.resolve(_dirname, "../..", ".env"),
          "/.env"
        ];
        for (const envPath of envPaths) {
          if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, "utf8");
            const match = content.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
            if (match && match[1]) {
              key = match[1].trim();
              process.env.GEMINI_API_KEY = key; // Backguard env
              console.log(`[AI Studio Direct Load] Loaded GEMINI_API_KEY directly from file: ${envPath}`);
              break;
            }
          }
        }
      } catch (e: any) {
        console.error("[AI Studio Direct Load Error]", e.message);
      }
    }
    
    if (key) {
      key = key.trim();
      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.substring(1, key.length - 1);
      }
      key = key.trim();
    }
    if (!key) {
      throw new Error("لطفا کلید دسترسی (GEMINI_API_KEY) را در تنظیمات داشبورد و یا فایل .env تنظیم کنید.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, userId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const ai = getAiClient();
    const dbData = readJsonDb();
    
    // Clean settings to remove sensitive information before sharing context
    const safeSettings = { ...dbData.settings };
    delete safeSettings.panelPassword;
    delete safeSettings.panelUsername;
    delete safeSettings.botToken;
    delete safeSettings.dashboardPassword;
    
    // Convert panel_config string to parsed object
    let safePanelConfig: any = {};
    if (safeSettings.panel_config) {
      try {
        const parsed = JSON.parse(safeSettings.panel_config);
        delete parsed.panelPassword;
        delete parsed.panelUsername;
        delete parsed.botToken;
        delete parsed.dashboardPassword;
        safePanelConfig = parsed;
      } catch (e) {
        // ignore JSON issue
      }
    }
    safeSettings.panel_config = JSON.stringify(safePanelConfig);

    const activeUsersCount = (dbData.users || []).filter((u: any) => u.status === 'active').length;

    const systemPrompt = `شما یک دستیار هوش مصنوعی مودب و پاسخگو متعلق به سرور V2ray / X-UI به نام "Daltoon Servers" (دالتون سرور) هستید. 
شما باید به سوالات مرتبط با برنامه‌ها، خدمات، و وضعیت سرور پاسخ‌های مفید، محترمانه و دقیق بدهید.

مهم‌ترین نکته: در صورتی که کاربر نیاز به پشتیبانی انسانی، مدیریت، رفع مشکل واریز فیش، قطعی یا خرید دارد، به هیچ عنوان آیدی تلگرام پشتیبانی معرفی نکنید. به جای آن، کاربر را راهنمایی کنید که با لمس دکمه «🎫 ثبت تیکت پشتیبانی» از منوی اصلی ربات، تیکت پشتیبانی جدید ارسال کند تا کارشناسان ما بررسی کنند.

زمینه و اطلاعات حال حاضر سیستم:
- بسته‌های خرید کاربر (VIP/Standard): ${JSON.stringify(dbData.vpn_plans || [])}
- بسته‌های ویژه همکاران (عمده): ${JSON.stringify(dbData.colleague_packages || [])}
- تعداد کل کاربران سیستم: ${activeUsersCount}
- راهنما و متن قوانین پیش‌فرض: ${safeSettings.supportText || safePanelConfig.supportText || ""}

لطفاً کوتاه، زیبا و با ادبیات مناسب پاسخ دهید. از ارائه اطلاعات محرمانه خودداری کنید. سوال کاربر: ${message}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
         systemInstruction: systemPrompt
      }
    });
    
    res.json({ response: response.text });
  } catch (error: any) {
    console.error("[AI Chat API Error]:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI response." });
  }
});

// ---------------------------

app.post("/api/gift-codes/edit", (req, res) => {
  const db = readJsonDb();
  if (!db.gift_codes) db.gift_codes = [];
  const { id, code, amount, maxUsage } = req.body;
  if (!id || !code || amount === undefined || maxUsage === undefined) {
    return res.status(400).json({ error: "Missing fields" });
  }

  let updatedCode = null;
  db.gift_codes = db.gift_codes.map(c => {
    if (c.id === id) {
      updatedCode = { ...c, code, amount: parseInt(amount, 10), maxUsage: parseInt(maxUsage, 10) };
      return updatedCode;
    }
    return c;
  });

  if (updatedCode) {
    writeJsonDb(db);
    res.json({ success: true, item: updatedCode });
  } else {
    res.status(404).json({ error: "Code not found" });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.ownerId) {
      payload.ownerId = Number(payload.ownerId);
    }
    const configValue = JSON.stringify(payload);

    const db = readJsonDb();
    
    // Compare admins list to find newly added ones
    const prevSettings = getSystemSettings(db);
    const prevAdmins = prevSettings.admins || [];
    const newAdmins = payload.admins || [];
    
    const addedAdmins = newAdmins.filter((newAdm: any) => 
      newAdm.userId && !prevAdmins.some((prevAdm: any) => Number(prevAdm.userId) === Number(newAdm.userId))
    );

    db.settings.panel_config = configValue;
    writeJsonDb(db);
    
    // Reset cached AI client so newly saved GEMINI_API_KEY settings will take effect immediately
    aiClient = null;

    // Notify newly appointed admins via Telegram Bot
    const botToken = payload.botToken || prevSettings.botToken;
    if (botToken && addedAdmins.length > 0) {
      for (const adm of addedAdmins) {
        try {
          const roleText = adm.role === "super_admin" ? "سوپر ادمین (مدیر ارشد)" : "ادمین معمولی (مدیریت پشتیبانی)";
          const htmlMsg = `👑 <b>انتصاب شایسته شما به عنوان مدیریت سیستم</b>\n\n` +
            `کاربر گرامی <b>@${adm.username || "کاربر"}</b> (شناسه: <code>${adm.userId}</code>)؛\n` +
            `با سلام و احترام،\n\n` +
            `بدین‌وسیله به اطلاع می‌رساند دسترسی مدیریتی شما به عنوان <b>${roleText}</b> در ربات دالتون استور با موفقیت فعال گردید.\n\n` +
            `🛡️ <b>برخی از مزایا و وظایف سطح دسترسی ادمین:</b>\n` +
            `🔹 <b>بررسی و تایید واریزی‌ها:</b> دسترسی به لیست فیش‌های ارسالی کاربران در بخش «تایید تراکنش‌ها» جهت شارژ خودکار کیف پول.\n` +
            `🔹 <b>مدیریت اعضا:</b> امکان ویرایش، افزایش و یا کاهش موجودی کاربران، مسدودسازی و رفع مسدودیت اعضا.\n` +
            `🔹 <b>پلان‌های ادمین:</b> استفاده رایگان از پلان‌ها بدون کسر موجودی جهت بررسی و کنترل کیفی سرورها.\n` +
            `🔹 <b>اعلان‌های هوشمند:</b> رصد و دریافت فوری اطلاعات فیش‌های ارسالی اعضا به محض بارگذاری در ربات.\n\n` +
            `<i>مفتخریم که در تیم توسعه و مدیریت دالتون حضور دارید. با آرزوی موفقیت و همکاری مستمر.</i>\n\n` +
            `✨ <b>تیم پشتیبانی و فنی دالتون استور</b>`;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: adm.userId,
              text: htmlMsg,
              parse_mode: "HTML"
            })
          });
          console.log(`[Admin Welcomed] Successfully welcomed new admin ID: ${adm.userId}`);
        } catch (err) {
          console.error(`[Admin Welcome Error] Failed to welcome admin ${adm.userId}:`, err);
        }
      }
    }

    // Dynamic restart of the Python bot to reload newly added parameters/token
    startPythonBot();

    res.json({ success: true, message: "Settings saved successfully to JSON store." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Robust fetch helper with timeout and standardized browser headers to bypass WAF / strict server security rules
async function xuiFetch(url: string, options: any = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,fa;q=0.8",
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function normalizeXuiUrl(url: string): string {
  let cleaned = `${url}`.trim();
  // Remove any trailing slashes
  cleaned = cleaned.replace(/\/+$/, "");

  // If there's an invalid or incomplete protocol (like ps://, ttps://, s://, tp://, etc.)
  if (cleaned.includes("://")) {
    const parts = cleaned.split("://");
    const protocolGroup = parts[0].toLowerCase();
    // If it's not http or https, normalize it to https or http
    if (protocolGroup !== "http" && protocolGroup !== "https") {
      if (protocolGroup.includes("http") || protocolGroup.endsWith("s") || protocolGroup.endsWith("ps")) {
        cleaned = "https://" + parts.slice(1).join("://");
      } else {
        cleaned = "http://" + parts.slice(1).join("://");
      }
    }
  } else {
    // No protocol, default to https://
    cleaned = "https://" + cleaned;
  }
  return cleaned;
}

// Robust helper to authenticate with XUI panel supporting both classic panels and modern panels requiring GET + CSRF token
async function loginXuiPanel(cleanedUrl: string, username: string, password: string): Promise<{ success: boolean; cookie: string | null; csrfToken?: string | null; error?: string }> {
  try {
    console.log(`[Diagnostic] Executing initial GET handshake to: ${cleanedUrl}`);
    // 1. Initial GET request to retrieve cookies and CSRF token if present
    const getRes = await xuiFetch(cleanedUrl, { method: "GET" }, 5000).catch(() => null);

    let initialCookie = "";
    let csrfToken = "";

    if (getRes && getRes.ok) {
      const getCookieHeader = getRes.headers.get("set-cookie") || "";
      initialCookie = getCookieHeader.split(";")[0] || "";
      const html = await getRes.text();
      const match = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/);
      if (match) {
        csrfToken = match[1];
        console.log(`[CSRF] CSRF token successfully extracted: ${csrfToken}`);
      }
    }

    // 2. Perform the POST login request
    const loginUrl = `${cleanedUrl}/login`;
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded"
    };
    if (initialCookie) {
      headers["Cookie"] = initialCookie;
    }
    if (csrfToken) {
      headers["X-Csrf-Token"] = csrfToken;
    }

    console.log(`[Diagnostic] Executing POST login to: ${loginUrl}`);
    const loginRes = await xuiFetch(loginUrl, {
      method: "POST",
      headers,
      body: params.toString()
    }, 6000);

    const bodyText = await loginRes.text();
    let bodyJson: any = {};
    try {
      bodyJson = JSON.parse(bodyText);
    } catch (e) {
      // Ignore
    }

    console.log(`[Diagnostic] XUI response status: ${loginRes.status}, body: ${bodyText.substring(0, 150)}`);

    if (loginRes.ok && bodyJson && bodyJson.success) {
      const loginCookieHeader = loginRes.headers.get("set-cookie") || "";
      const loginCookie = loginCookieHeader.split(";")[0] || initialCookie;
      return { success: true, cookie: loginCookie, csrfToken };
    } else {
      const errMsg = bodyJson?.msg || `کد خطا: ${loginRes.status}. نام کاربری یا رمز عبور پنل نادرست است.`;
      return { success: false, cookie: null, csrfToken: null, error: errMsg };
    }
  } catch (err: any) {
    console.error(`[Diagnostic] XUI login encountered error:`, err);
    return { success: false, cookie: null, csrfToken: null, error: err.message };
  }
}

// Node.js implementation of Python bot's add_vpn_client_api helper
async function addVpnClientApi(
  clientEmail: string,
  trafficGb: number,
  durationDays: number,
  settings: any,
  clientUuid?: string
): Promise<{ success: boolean; clientUuid?: string; subLink?: string; error?: string }> {
  try {
    // Check locally first
    const db = readJsonDb();
    const subs = db.subscription_keys || [];
    const _lMail = clientEmail.toLowerCase();
    for (let s of subs) {
      if ((s.clientName || "").toLowerCase() === _lMail || s.planId.toLowerCase() === _lMail) {
        return { success: false, error: "این نام کاربری از قبل در لیست کاربران سرور موجود است. لطفاً نام دیگری انتخاب کنید." };
      }
    }

    if (!settings.baseUrl || !settings.panelUsername || !settings.panelPassword) {
      return { success: false, error: "تنظیمات اتصال به پنل کامل نیست." };
    }
    const cleanedUrl = normalizeXuiUrl(settings.baseUrl);
    const loginResult = await loginXuiPanel(cleanedUrl, settings.panelUsername, settings.panelPassword);
    if (!loginResult.success || !loginResult.cookie) {
      return { success: false, error: "ورود به پنل با خطا مواجه شد: " + (loginResult.error || "خطای نامشخص") };
    }

    const uuid = clientUuid || Math.random().toString(36).substring(2, 10) + "-" + Math.random().toString(36).substring(2, 6);
    const totalBytes = Math.floor(trafficGb * 1024 * 1024 * 1024);
    const expiryTimeMs = Date.now() + durationDays * 24 * 60 * 60 * 1000;

    // Determine inbound_ids
    let inboundIds: number[] = [];
    if (Array.isArray(settings.activeInboundIds) && settings.activeInboundIds.length > 0) {
      inboundIds = settings.activeInboundIds.map((id: any) => Number(id)).filter(id => !isNaN(id));
    }

    // Fallback: fetch dynamically if none specified
    if (inboundIds.length === 0) {
      const listRes = await xuiFetch(`${cleanedUrl}/panel/api/inbounds/list`, {
        method: "GET",
        headers: { 
          "Cookie": loginResult.cookie
        }
      }, 5000);
      if (listRes.ok) {
        const listText = await listRes.text();
        const listJson = JSON.parse(listText);
        if (listJson && listJson.success && Array.isArray(listJson.obj)) {
          inboundIds = listJson.obj.map((item: any) => Number(item.id)).filter((id: number) => !isNaN(id));
          console.log(`[Sanaei API] Dynamically retrieved ${inboundIds.length} inbound IDs for user ${clientEmail}`);
        }
      }
    }

    // Check if client already exists on panel
    try {
      const checkRes = await xuiFetch(`${cleanedUrl}/panel/api/inbounds/getClientTraffics/${clientEmail}`, {
        method: "GET",
        headers: {
          "Cookie": loginResult.cookie,
          "Accept": "application/json"
        }
      }, 5000);
      if (checkRes.ok) {
        const checkJson = await checkRes.json();
        // If obj exists and corresponds to our email, it is taken
        if (checkJson && checkJson.success && checkJson.obj) {
          return { success: false, error: "این نام کاربری از قبل در لیست کاربران سرور موجود است. لطفاً نام دیگری انتخاب کنید." };
        }
      }
    } catch (err) {
      console.warn("[Sanaei API Sync] Could not check client existence:", err);
    }

    // Fetch all inbounds from panel to ensure valid IDs
    try {
      const listRes = await xuiFetch(`${cleanedUrl}/panel/api/inbounds/list`, {
        method: "GET",
        headers: {
          "Cookie": loginResult.cookie,
          "Accept": "application/json"
        }
      }, 5000);
      if (listRes.ok) {
        const listJson = await listRes.json();
        if (listJson && listJson.success && Array.isArray(listJson.obj)) {
          const validIds = listJson.obj.map((inb: any) => inb.id);
          if (inboundIds.length > 0) {
            inboundIds = inboundIds.filter(id => validIds.includes(id));
          }
          if (inboundIds.length === 0) {
            inboundIds = validIds;
          }
        }
      }
    } catch (err) {
      console.warn("[Sanaei API Sync] Could not fetch valid inbounds:", err);
    }

    if (inboundIds.length === 0) {
      inboundIds = [1];
    }

    clientUuid = clientUuid || crypto.randomUUID();
    const addUrl = `${cleanedUrl}/panel/api/clients/add`;
    const payload = {
      client: {
        id: clientUuid,
        email: clientEmail,
        limitIp: 0,
        totalGB: totalBytes,
        expiryTime: expiryTimeMs,
        enable: true,
        tgId: "",
        subId: clientEmail
      },
      inboundIds: inboundIds
    };

    const headers: Record<string, string> = {
      "Cookie": loginResult.cookie,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    if (loginResult.csrfToken) {
      headers["X-Csrf-Token"] = loginResult.csrfToken;
    }

    let lastError = "";
    try {
      const addRes = await xuiFetch(addUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      }, 8000);

      if (addRes.ok) {
        const addText = await addRes.text();
        const addJson = JSON.parse(addText);
        if (addJson && addJson.success) {
          console.log(`[Sanaei API Sync] Created user '${clientEmail}' globally on inbounds ${inboundIds.join(', ')} successfully.`);
          const subLink = `${cleanedUrl}/sub/${clientEmail}`;
          return { success: true, clientUuid, subLink }; // Ensure we use clientUuid
        } else {
          console.warn(`[Sanaei API Response] Creation error: ${addText}`);
          lastError = addJson?.msg || addText;
        }
      } else {
        lastError = `HTTP ${addRes.status}: ${await addRes.text().catch(() => "Unknown error")}`;
      }
    } catch (err: any) {
      console.error(`[Sanaei API Error] Failed to create global client: ${err.message}`);
      lastError = err.message;
    }

    return { success: false, error: "تعریف کلاینت موفق نبود. خطا: " + lastError };
  } catch (e: any) {
    console.error("[addVpnClientApi] helper crash:", e);
    return { success: false, error: e.message };
  }
}

// 2.5 Test XUI Panel connection
app.post("/api/xui/test-connection", async (req, res) => {
  try {
    const { baseUrl, panelUsername, panelPassword } = req.body;
    if (!baseUrl || !panelUsername || !panelPassword) {
      return res.json({ success: false, error: "تمامی فیلدهای احراز هویت شامل آدرس هاست، نام کاربری و رمز عبور پنل ۳x-ui باید پر شده باشند." });
    }

    const cleanedUrl = normalizeXuiUrl(baseUrl);
    const loginResult = await loginXuiPanel(cleanedUrl, panelUsername, panelPassword);

    if (loginResult.success && loginResult.cookie) {
      // Confirm read access rights on the list api
      try {
        const listRes = await xuiFetch(`${cleanedUrl}/panel/api/inbounds/list`, {
          method: "GET",
          headers: { 
            "Cookie": loginResult.cookie
          }
        }, 4000);
        if (listRes.ok) {
          const listText = await listRes.text();
          const listJson = JSON.parse(listText);
          if (listJson && listJson.success && Array.isArray(listJson.obj)) {
            const freshInbounds = listJson.obj.map((item: any) => {
              let totalClientsCount = 0;
              try {
                const settingsObj = typeof item.settings === "string" ? JSON.parse(item.settings) : item.settings;
                if (settingsObj && Array.isArray(settingsObj.clients)) {
                  totalClientsCount = settingsObj.clients.length;
                }
              } catch (e) {}

              const usedGb = ((Number(item.up || 0) + Number(item.down || 0)) / (1024 * 1024 * 1024)).toFixed(1);
              const limitGb = item.total ? (Number(item.total) / (1024 * 1024 * 1024)).toFixed(0) : "unlimited";

              return {
                id: item.id,
                remark: item.remark || `Inbound #${item.id}`,
                protocol: item.protocol || "vless",
                port: item.port || 1234,
                totalClients: totalClientsCount,
                trafficUsed: usedGb,
                trafficLimit: limitGb,
                status: item.enable ? "active" : "inactive"
              };
            });

            // Persist the synced inbounds to cache database
            const db = readJsonDb();
            db.inbounds = freshInbounds;
            writeJsonDb(db);

            return res.json({ 
              success: true, 
              message: "اتصال به پنل ۳x-ui با موفقیت برقرار شد و لیست اینباندها دریافت گردید!",
              inbounds: freshInbounds 
            });
          }
          return res.json({ success: true, message: "اتصال به پنل ۳x-ui با موفقیت برقرار شد و ارتباط فعال است!" });
        } else {
          return res.json({ success: false, error: "اتصال اولیه برقرار شد ولیکن دسترسی به لیست اینباندها با خطا مواجه شد. لطفاً دسترسی ادمین پنل را بررسی کنید." });
        }
      } catch (err: any) {
        return res.json({ success: true, message: "اتصال اولیه برقرار شد ولیکن دسترسی به لیست اینباندها با خطا مواجه شد. لطفاً دسترسی ادمین پنل را بررسی کنید." });
      }
    } else {
      return res.json({ 
        success: false, 
        error: loginResult.error || "خطا در احراز هویت. نام کاربری یا رمز عبور پنل نادرست است."
      });
    }
  } catch (error: any) {
    return res.json({ success: false, error: `خطا در اتصال به هاست پنل: ${error.message}` });
  }
});

// BROADCAST ENDPOINT
app.post("/api/broadcast", async (req, res) => {
  try {
    const { text, attachment, serverUrl } = req.body;
    if (!text && !attachment) {
      return res.status(400).json({ success: false, error: "متن پیام یا رسانه برای ارسال الزامی است." });
    }

    // Process attachment if provided
    let fileUrl = "";
    if (attachment && attachment.fileData) {
      try {
        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        let base64Data = attachment.fileData;
        if (base64Data.includes(";base64,")) {
          base64Data = base64Data.split(";base64,").pop() || "";
        }
        
        const buffer = Buffer.from(base64Data, "base64");
        const ext = path.extname(attachment.fileName) || (
          attachment.fileType === "image" ? ".jpg" : 
          attachment.fileType === "video" ? ".mp4" : 
          attachment.fileType === "voice" ? ".ogg" : ".bin"
        );
        const uniqueFileName = `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
        const filePath = path.join(uploadsDir, uniqueFileName);
        
        fs.writeFileSync(filePath, buffer);
        
        const originUrl = serverUrl || "https://ais-dev-cri25e3qykgpuufepdfpmw-413733104605.europe-west3.run.app";
        fileUrl = `${originUrl}/uploads/${uniqueFileName}`;
        console.log(`[Broadcast] File written to: ${filePath}, public url: ${fileUrl}`);
      } catch (err: any) {
        console.error("[Broadcast] Failed storing attachment file:", err);
      }
    }

    const db = readJsonDb();
    const settings = getSystemSettings(db);
    const botToken = settings.botToken;
    const users = db.users || [];
    let count = 0;

    if (botToken) {
      for (const u of users) {
        if (u.userId) {
          try {
            // Determine API method and payload based on attachment presence and type
            let apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
            let payload: any = {
              chat_id: u.userId,
              parse_mode: "HTML"
            };

            if (fileUrl) {
              const fileType = attachment?.fileType || "file";
              if (fileType === "image") {
                apiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
                payload.photo = fileUrl;
                payload.caption = text || "";
              } else if (fileType === "video") {
                apiUrl = `https://api.telegram.org/bot${botToken}/sendVideo`;
                payload.video = fileUrl;
                payload.caption = text || "";
              } else if (fileType === "voice") {
                apiUrl = `https://api.telegram.org/bot${botToken}/sendVoice`;
                payload.voice = fileUrl;
                payload.caption = text || "";
              } else {
                apiUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;
                payload.document = fileUrl;
                payload.caption = text || "";
              }
            } else {
              payload.text = text;
            }

            await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
               },
               body: JSON.stringify(payload)
            });
            count++;
            // Gentle sleep of 50ms to respect Telegram rate limits and socket recycling
            await new Promise((resolve) => setTimeout(resolve, 50));
          } catch (e: any) {
            console.error(`[Broadcast] Failed to send message to user ${u.userId}:`, e);
          }
        }
      }
    } else {
      count = users.length;
    }

    res.json({ success: true, count, message: "Broadcast dispatched." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. User operations range
app.post("/api/users", async (req, res) => {
  try {
    const { userId, username, walletBalance, joinDate, status } = req.body;
    const db = readJsonDb();
    
    const idx = db.users.findIndex(u => u.userId === Number(userId));
    const existing = idx >= 0 ? db.users[idx] : null;
    
    const nextUser = {
      userId: Number(userId),
      username,
      walletBalance: Number(walletBalance),
      activePlansCount: existing ? existing.activePlansCount : 0,
      joinDate: joinDate || new Date().toISOString().split("T")[0],
      status: status || "active"
    };

    if (idx >= 0) {
      db.users[idx] = nextUser;
    } else {
      db.users.unshift(nextUser);
    }
    
    writeJsonDb(db);
    res.json({ success: true, message: "User written/updated." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/users/adjust", async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const db = readJsonDb();
    
    const user = db.users.find(u => u.userId === Number(userId));
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    const nextBal = Math.max(0, Number(user.walletBalance) + Number(amount));
    const finalDiff = nextBal - Number(user.walletBalance);
    user.walletBalance = nextBal;
    
    if (!db.logs) db.logs = [];
    db.logs.push({
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
      userId: Number(userId),
      username: user.username || `user_${userId}`,
      action: "تغییر موجودی",
      details: `موجودی کاربر توسط مدیر به میزان ${finalDiff >= 0 ? "+" : ""}${finalDiff.toLocaleString()} تومان تغییر یافت. موجودی نهایی: ${nextBal.toLocaleString()} تومان.`
    });
    if (db.logs.length > 1000) {
      db.logs = db.logs.slice(-1000);
    }
    
    writeJsonDb(db);

    res.json({ success: true, nextBal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/users/ban", async (req, res) => {
  try {
    const { userId, status } = req.body;
    const db = readJsonDb();
    
    const user = db.users.find(u => u.userId === Number(userId));
    if (user) {
      user.status = status;
      writeJsonDb(db);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/users/delete", async (req, res) => {
  try {
    const { userId } = req.body;
    const db = readJsonDb();
    
    db.users = db.users.filter(u => u.userId !== Number(userId));
    db.subscription_keys = db.subscription_keys.filter(k => k.userId !== Number(userId));
    writeJsonDb(db);

    res.json({ success: true, message: "User completely cleared." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Manual Transaction operations
app.post("/api/transactions", async (req, res) => {
  try {
    const { id, userId, username, amount, receiptImage, status, date, description } = req.body;
    const db = readJsonDb();
    
    const nextTx = {
      id,
      userId: Number(userId),
      username,
      amount: Number(amount),
      receiptImage: receiptImage || "",
      status: status || "pending",
      date: date || new Date().toISOString(),
      description: description || ""
    };

    const idx = db.transactions.findIndex(t => t.id === id);
    if (idx >= 0) {
      db.transactions[idx] = nextTx;
    } else {
      db.transactions.unshift(nextTx);
    }

    writeJsonDb(db);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/transactions/approve", async (req, res) => {
  try {
    const { id, amount } = req.body;
    const db = readJsonDb();
    
    const tx = db.transactions.find(t => t.id === id);
    if (tx) {
      tx.status = "approved";
      if (amount !== undefined) {
        tx.amount = Number(amount);
      }
      
      const user = db.users.find(u => u.userId === Number(tx.userId));
      if (user) {
        user.walletBalance = Number(user.walletBalance) + Number(tx.amount);
      }
      
      if (!db.logs) db.logs = [];
      db.logs.push({
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString(),
        userId: Number(tx.userId),
        username: tx.username || `user_${tx.userId}`,
        action: "تایید شارژ",
        details: `رسید تراکنش به شناسه ${tx.id} و مبلغ ${Number(tx.amount).toLocaleString()} تومان توسط مدیر تایید شد و به کیف پول کاربر افزایش یافت.`
      });
      if (db.logs.length > 1000) {
        db.logs = db.logs.slice(-1000);
      }
      
      writeJsonDb(db);

      // Try to notify the user via Telegram Bot API on success
      try {
        const configStr = db.settings?.panel_config;
        if (configStr) {
          const cfg = JSON.parse(configStr);
          const botToken = cfg.botToken;
          if (botToken) {
            const messageText = `✅ <b>تراکنش شما تایید شد!</b>\n\n💰 مبلغ <b>${tx.amount.toLocaleString()} تومان</b> به کیف پول شما در ربات دالتون استور افزوده شد.\n\n💰 موجودی جدید: <b>${user ? user.walletBalance.toLocaleString() : "0"} تومان</b>\n\n🛍️ هم اکنون می‌توانید از منوی ربات اقدام به خرید اشتراک فرمایید!`;
            const https = require("https");
            const postData = JSON.stringify({
              chat_id: tx.userId,
              text: messageText,
              parse_mode: "HTML"
            });
            const options = {
              hostname: 'api.telegram.org',
              port: 443,
              path: `/bot${botToken}/sendMessage`,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
              }
            };
            const reqNotify = https.request(options);
            reqNotify.on('error', (e: any) => console.warn("Telegram approve notify error:", e));
            reqNotify.write(postData);
            reqNotify.end();
          }
        }
      } catch (notifyErr) {
        console.warn("Error notifying user of approval:", notifyErr);
      }

      res.json({ success: true, message: "Transaction approved and credited user wallet." });
    } else {
      res.status(404).json({ success: false, message: "Transaction not found." });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/transactions/reject", async (req, res) => {
  try {
    const { id } = req.body;
    const db = readJsonDb();
    
    const tx = db.transactions.find(t => t.id === id);
    if (tx) {
      tx.status = "rejected";
      
      if (!db.logs) db.logs = [];
      db.logs.push({
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString(),
        userId: Number(tx.userId),
        username: tx.username || `user_${tx.userId}`,
        action: "رد شارژ",
        details: `رسید تراکنش به شناسه ${tx.id} و مبلغ ${Number(tx.amount).toLocaleString()} تومان توسط مدیر رد شد.`
      });
      if (db.logs.length > 1000) {
        db.logs = db.logs.slice(-1000);
      }
      
      writeJsonDb(db);

      // Try to notify the user via Telegram Bot API on reject
      try {
        const configStr = db.settings?.panel_config;
        if (configStr) {
          const cfg = JSON.parse(configStr);
          const botToken = cfg.botToken;
          if (botToken) {
            const messageText = `❌ <b>تراکنش شما پذیرفته نشد!</b>\n\nفیش ارسالی شما با شناسه <code>${tx.id}</code> توسط مدیریت بررسی و رد گردید.\n\n⚠️ علت رد تراکنش ممکن است ناخوانا بودن رسید، مغایرت مبلغ و یا تکراری بودن فیش باشد. لطفا در صورت بروز مشکل با پشتیبان ارتباط برقرار کنید.`;
            const https = require("https");
            const postData = JSON.stringify({
              chat_id: tx.userId,
              text: messageText,
              parse_mode: "HTML"
            });
            const options = {
              hostname: 'api.telegram.org',
              port: 443,
              path: `/bot${botToken}/sendMessage`,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
              }
            };
            const reqNotify = https.request(options);
            reqNotify.on('error', (e: any) => console.warn("Telegram reject notify error:", e));
            reqNotify.write(postData);
            reqNotify.end();
          }
        }
      } catch (notifyErr) {
        console.warn("Error notifying user of rejection:", notifyErr);
      }
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/transactions/delete", async (req, res) => {
  try {
    const { id } = req.body;
    const db = readJsonDb();
    
    db.transactions = db.transactions.filter(t => t.id !== id);
    writeJsonDb(db);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/transactions/clear-history", async (req, res) => {
  try {
    const db = readJsonDb();
    db.transactions = [];
    writeJsonDb(db);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-create subscription key on 3x-ui panel directly
app.post("/api/subscription-keys/auto-create", async (req, res) => {
  try {
    const { userId, clientName, trafficLimitGb, expiryDays, planName } = req.body;
    const db = readJsonDb();
    const settings = getSystemSettings(db);

    if (!settings.panelConnectionActive) {
      return res.status(400).json({ success: false, error: "اتصال به پنل ۳x-ui در تنظیمات غیرفعال است." });
    }

    const durationDays = Number(expiryDays) || 30;
    const cleanClientName = (clientName || "user_" + Math.random().toString(36).substring(2, 7)).trim().replace(/\s+/g, "");

    const vpnResult = await addVpnClientApi(cleanClientName, Number(trafficLimitGb), durationDays, settings);

    if (vpnResult.success && vpnResult.subLink) {
      const randomId = "SUB-" + Math.floor(Math.random() * 9000 + 1000);
      const expireDate = new Date(Date.now() + Number(expiryDays) * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const newSub = {
        id: randomId,
        userId: Number(userId),
        planId: "manual_" + Math.random().toString(36).substring(2, 8),
        planName: planName || `Manual Plan (${trafficLimitGb}GB)`,
        clientName: cleanClientName,
        subLink: vpnResult.subLink,
        expireDate: expireDate,
        trafficLimitGb: Number(trafficLimitGb),
        trafficUsedGb: 0,
        createdAtMs: Date.now(),
        status: "active" as const
      };

      db.subscription_keys.push(newSub);

      const user = db.users.find(u => u.userId === Number(userId));
      if (user) {
        user.activePlansCount = db.subscription_keys.filter(k => k.userId === Number(userId) && k.status === "active").length;
      }

      writeJsonDb(db);
      return res.json({ 
        success: true, 
        subKey: newSub, 
        subscriptionKeys: db.subscription_keys, 
        users: db.users 
      });
    } else {
      return res.status(400).json({ success: false, error: "خطا در برقراری ارتباط با ۳x-ui: " + (vpnResult.error || "خطای نامشخص") });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Subscription Keys operations
app.post("/api/subscription-keys", async (req, res) => {
  try {
    const { id, userId, planId, planName, subLink, expireDate, trafficLimitGb, trafficUsedGb, status } = req.body;
    const db = readJsonDb();
    
    const nextSub = {
      id,
      userId: Number(userId),
      planId,
      planName,
      subLink,
      expireDate,
      trafficLimitGb: Number(trafficLimitGb),
      trafficUsedGb: Number(trafficUsedGb || 0),
      status: status || "active"
    };

    const idx = db.subscription_keys.findIndex(s => s.id === id);
    if (idx >= 0) {
      db.subscription_keys[idx] = nextSub;
    } else {
      db.subscription_keys.push(nextSub);
    }

    // Recalculate user subscription count
    const user = db.users.find(u => u.userId === Number(userId));
    if (user) {
      user.activePlansCount = db.subscription_keys.filter(k => k.userId === Number(userId) && k.status === "active").length;
    }

    writeJsonDb(db);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/subscription-keys/delete", async (req, res) => {
  try {
    const { id, userId } = req.body;
    const db = readJsonDb();
    
    db.subscription_keys = db.subscription_keys.filter(k => k.id !== id);
    
    const user = db.users.find(u => u.userId === Number(userId));
    if (user) {
      user.activePlansCount = db.subscription_keys.filter(k => k.userId === Number(userId) && k.status === "active").length;
    }

    writeJsonDb(db);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Custom menu buttons
app.post("/api/custom-buttons", async (req, res) => {
  try {
    const { id, text, replyText } = req.body;
    const db = readJsonDb();
    
    const nextBtn = { id, text, replyText };
    const idx = db.custom_buttons.findIndex(b => b.id === id);
    if (idx >= 0) {
      db.custom_buttons[idx] = nextBtn;
    } else {
      db.custom_buttons.push(nextBtn);
    }

    writeJsonDb(db);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/custom-buttons/delete", async (req, res) => {
  try {
    const { id } = req.body;
    const db = readJsonDb();
    
    db.custom_buttons = db.custom_buttons.filter(b => b.id !== id);
    writeJsonDb(db);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Inbounds status mapping
app.post("/api/inbounds/toggle", async (req, res) => {
  try {
    const { id, status } = req.body;
    const db = readJsonDb();
    
    const ib = db.inbounds.find(i => i.id === Number(id));
    if (ib) {
      ib.status = status;
      writeJsonDb(db);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dynamic VPN Plans Management & Purchase logic
app.post("/api/vpn-plans", async (req, res) => {
  try {
    const { id, name, durationDays, trafficGb, price, category, configStock } = req.body;
    const db = readJsonDb();
    if (!db.vpn_plans) db.vpn_plans = [];

    const nextPlan = {
      id,
      name,
      durationDays: Number(durationDays),
      trafficGb: Number(trafficGb),
      price: Number(price),
      category,
      configStock: Array.isArray(configStock) ? configStock : []
    };

    const idx = db.vpn_plans.findIndex(p => p.id === id);
    if (idx >= 0) {
      db.vpn_plans[idx] = nextPlan;
    } else {
      db.vpn_plans.push(nextPlan);
    }

    writeJsonDb(db);
    res.json({ success: true, vpnPlans: db.vpn_plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/vpn-plans/delete", async (req, res) => {
  try {
    const { id } = req.body;
    const db = readJsonDb();
    if (!db.vpn_plans) db.vpn_plans = [];

    db.vpn_plans = db.vpn_plans.filter(p => p.id !== id);
    writeJsonDb(db);
    res.json({ success: true, vpnPlans: db.vpn_plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/vpn-plans/buy", async (req, res) => {
  try {
    const { planId, userId, clientName } = req.body;
    const db = readJsonDb();
    if (!db.vpn_plans) db.vpn_plans = [];

    const planIdx = db.vpn_plans.findIndex(p => p.id === planId);
    if (planIdx === -1) {
      return res.status(404).json({ success: false, error: "پلن مورد نظر یافت نشد." });
    }
    const plan = db.vpn_plans[planIdx];

    const userIdx = db.users.findIndex(u => u.userId === Number(userId));
    if (userIdx === -1) {
      return res.status(404).json({ success: false, error: "کاربر یافت نشد." });
    }
    const user = db.users[userIdx];

    const settings = getSystemSettings(db);

    const ownerId = Number(settings.ownerId || 6536288293);
    const admins = Array.isArray(settings.admins) ? settings.admins : [];
    const isAdminOrOwner = Number(userId) === ownerId || admins.some((adm: any) => Number(adm.userId) === Number(userId)) || user.username === "daltoon_owner";

    if (!isAdminOrOwner && user.walletBalance < plan.price) {
      return res.status(400).json({ success: false, error: "موجودی کیف پول شما کافی نیست." });
    }

    const cleanClientName = (clientName || "user_" + Math.random().toString(36).substring(2, 7)).trim().replace(/\s+/g, "");

    const isMockSimulator = req.body.isSimulator === true || req.body.isSimulator === "true";
    let subLink = "";
    if (isMockSimulator) {
      subLink = `vless://${cleanClientName}_test_id@m.daltoon-server.ir:2052?security=reality&sni=google.com&fp=chrome#Daltoon_${cleanClientName}_Test`;
    } else if (settings.panelConnectionActive) {
      console.log(`[Buy API] Connection active, creating user '${cleanClientName}' on panel...`);
      const apiResult = await addVpnClientApi(cleanClientName, plan.trafficGb, plan.durationDays, settings);
      if (apiResult.success && apiResult.subLink) {
        subLink = apiResult.subLink;
      } else {
        return res.status(400).json({ success: false, error: "ساخت کلاینت در پنل ۳x-ui با خطا مواجه شد: " + (apiResult.error || "خطای نامشخص") });
      }
    } else {
      if (!plan.configStock || plan.configStock.length === 0) {
        return res.status(400).json({ success: false, error: "این پلن در حال حاضر فاقد کانفیگ در انبار است. ابتدا انبار آن را در بخش مدیریت سرور شارژ کنید." });
      }
      subLink = plan.configStock.shift() || "";
    }
    
    // Create subscription key
    const randomId = "SUB-" + Math.floor(Math.random() * 9000 + 1000);
    const expireDate = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    const newSub = {
      id: randomId,
      userId: Number(userId),
      planId: plan.id,
      planName: plan.name,
      subLink: subLink,
      expireDate: expireDate,
      trafficLimitGb: plan.trafficGb,
      trafficUsedGb: 0,
      createdAtMs: Date.now(),
      status: "active" as const
    };

    db.subscription_keys.push(newSub);
    
    // Deduct wallet balance
    if (!isAdminOrOwner) {
      user.walletBalance -= plan.price;
    }
    user.activePlansCount = db.subscription_keys.filter(k => k.userId === Number(userId) && k.status === "active").length;

    writeJsonDb(db);

    res.json({
      success: true,
      subKey: newSub,
      userWalletBalance: user.walletBalance,
      vpnPlans: db.vpn_plans,
      subscriptionKeys: db.subscription_keys,
      users: db.users
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Dashboard login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = readJsonDb();
    
    const settings = getSystemSettings(db);
      
    const dbUser = settings.dashboardUsername || "Daltoon";
    const dbPass = settings.dashboardPassword || "Daltoon10";
    const dbAdmins = settings.admins || [];
    
    // Check main super admin credentials
    const isMainAdmin = (username === dbUser && password === dbPass);
    
    // Check registered sub-admins (who can log in with dashboardPassword as well or predefined passwords)
    const matchedSubAdmin = dbAdmins.find((adm: any) => adm.username === username);
    const isSubAdmin = matchedSubAdmin && (password === dbPass || password === "admin123");
    
    if (isMainAdmin || isSubAdmin) {
      const userRole = isMainAdmin ? "super_admin" : (matchedSubAdmin?.role || "admin");
      res.json({
        success: true,
        token: "daltoon_auth_token_secret",
        user: {
          username,
          role: userRole
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: "نام کاربری یا رمز عبور اشتباه است."
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// X. Backup Management endpoints
app.get("/api/backup-download", (req, res) => {
  try {
    if (fs.existsSync(dbJsonPath)) {
      res.download(dbJsonPath, "Daltoon_Bot.json");
    } else {
      res.status(404).json({ error: "Database file not found." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/backup-restore", express.json({limit: '50mb'}), (req, res) => {
  try {
    const { backupData } = req.body;
    if (!backupData) {
      return res.status(400).json({ success: false, error: "فایل بکاپ ارسال نشد." });
    }
    
    let parsed;
    try {
      parsed = JSON.parse(backupData);
    } catch(e) {
      return res.status(400).json({ success: false, error: "فرمت فایل بکاپ معتبر نیست (باید JSON باشد)." });
    }

    if (typeof parsed !== "object") {
       return res.status(400).json({ success: false, error: "اطلاعات فایل بکاپ نامعتبر است." });
    }

    fs.writeFileSync(dbJsonPath, JSON.stringify(parsed, null, 2), "utf8");
    
    // Attempt dynamic python bot restart to apply configurations immediately
    startPythonBot();
    
    res.json({ success: true, message: "فایل بکاپ با موفقیت بازگردانی شد." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function performAutoBackup() {
  try {
    const db = readJsonDb();
    const configStr = db.settings?.panel_config;
    if (!configStr) return;
    
    const settings = JSON.parse(configStr);
    
    if (!settings.autoBackupEnabled) return;
    if (!settings.autoBackupInterval) return;
    
    const ownerId = Number(settings.ownerId || 6536288293);
    const botToken = settings.botToken;
    if (!botToken || botToken === "DUMMY_TOKEN") return;

    if (!fs.existsSync(dbJsonPath)) return;

    const fileBuffer = fs.readFileSync(dbJsonPath);
    const blob = new Blob([fileBuffer], { type: 'application/json' });
    const formData = new FormData();
    formData.append("chat_id", String(ownerId));
    
    const dateStr = new Date().toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
    const periods: any = { hourly: "ساعتی", daily: "روزانه", weekly: "هفتگی", monthly: "ماهانه" };
    const caption = `📦 پشتیبان‌گیری خودکار\n\n🕒 تاریخ: ${dateStr}\nتنظیمات: ${periods[settings.autoBackupInterval] || settings.autoBackupInterval}\n\n#DaltoonBot`;
    
    formData.append("caption", caption);
    formData.append("document", blob, "Daltoon_Bot.json");

    await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: formData as any
    });
    
    db.settings.lastAutoBackup = String(Date.now());
    writeJsonDb(db);
    console.log(`[Auto Backup] Successfully sent backup to owner ${ownerId}`);
  } catch (err: any) {
    console.error(`[Auto Backup Error]`, err.message);
  }
}

async function checkAutoBackup() {
  try {
    const db = readJsonDb();
    const configStr = db.settings?.panel_config;
    if (!configStr) return;
    
    const settings = JSON.parse(configStr);
    
    if (!settings.autoBackupEnabled || !settings.autoBackupInterval) return;

    const lastBackup = Number(db.settings.lastAutoBackup) || 0;
    const now = Date.now();
    
    const nowT = new Date(new Date(now).toLocaleString("en-US", { timeZone: "Asia/Tehran" }));
    const lastT = new Date(new Date(lastBackup).toLocaleString("en-US", { timeZone: "Asia/Tehran" }));

    const nowFa = new Date(now).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" });
    const lastFa = new Date(lastBackup).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" });
    
    let shouldBackup = false;

    if (lastBackup === 0) {
      shouldBackup = true;
    } else if (now - lastBackup > 32 * 24 * 60 * 60 * 1000) {
      shouldBackup = true;
    } else {
      if (settings.autoBackupInterval === 'hourly') {
        if (nowT.getHours() !== lastT.getHours() || nowFa !== lastFa) {
          shouldBackup = true;
        }
      } else if (settings.autoBackupInterval === 'daily') {
        if (nowFa !== lastFa) {
          shouldBackup = true;
        }
      } else if (settings.autoBackupInterval === 'weekly') {
        if (now - lastBackup >= 7 * 24 * 60 * 60 * 1000) {
          shouldBackup = true;
        } else if (nowT.getDay() === 6 && nowFa !== lastFa) { // Saturday
          shouldBackup = true;
        }
      } else if (settings.autoBackupInterval === 'monthly') {
        const nowParts = nowFa.split("/");
        const lastParts = lastFa.split("/");
        // Year or Month changed
        if (nowParts[0] !== lastParts[0] || nowParts[1] !== lastParts[1]) {
          shouldBackup = true;
        }
      }
    }
    
    if (shouldBackup) {
      await performAutoBackup();
    }
  } catch(e) {}
}

// 9. System auto-update endpoints
app.get("/api/system/version", (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      res.json({ success: true, version: pkg.version || "1.0.0" });
    } else {
      res.json({ success: true, version: "2.0.0" });
    }
  } catch (err: any) {
    res.json({ success: false, error: err.message, version: "2.0.0" });
  }
});

app.get("/api/system/check-update", async (req, res) => {
  try {
    const { execSync } = require('child_process');
    // Fetch latest from remote (this is light and safe)
    execSync('git fetch', { stdio: 'ignore' });
    
    // Check if local branch is behind origin/main (or origin/master)
    // We get the number of commits we are behind
    const branchInfo = execSync('git rev-list HEAD...@{u} --count', { encoding: 'utf8' }).trim();
    
    // Check local package version
    const fs = require('fs');
    const path = require('path');
    const pkgPath = path.join(process.cwd(), 'package.json');
    let version = "2.0.0";
    if (fs.existsSync(pkgPath)) {
      version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || version;
    }
    
    const updateAvailable = parseInt(branchInfo, 10) > 0;
    
    res.json({ success: true, updateAvailable, version });
  } catch (err: any) {
    // Graceful fallback if not a git repository
    res.json({ success: false, updateAvailable: false, error: err.message });
  }
});

app.post("/api/system/update", async (req, res) => {
  try {
    const { exec } = require('child_process');
    
    res.json({ success: true, message: "به‌روزرسانی در پس‌زمینه آغاز شد. سیستم به‌زودی راه‌اندازی مجدد می‌شود..." });
    
    // Run update sequence asynchronously
    setTimeout(() => {
      console.log("[Auto-Update] Starting background update sequence...");
      exec('git stash && git pull && chmod +x daltoon-dashboard install.sh 2>/dev/null || true && npm install && npm run build && pm2 restart all', (error: any, stdout: string, stderr: string) => {
        if (error) {
          console.error("[Auto-Update Error]", error.message);
        } else {
          console.log("[Auto-Update] Update completed successfully.");
        }
      });
    }, 1000);
    
  } catch (err: any) {
    console.error("[Auto-Update Error]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Integrate Vite developer server in development environment
// --- CRON JOBS ---
async function autoCleanExpiredFreeTrials() {
  try {
    const db = readJsonDb();
    const now = new Date();
    // Allow 1 day buffer or strict? The user said "تست های رایگان بعد از تموم شدن مستقیم پاک بشن"
    // So if expireDate is yesterday or earlier, delete.
    now.setHours(0, 0, 0, 0);

    const keysToKeep = [];
    const keysToDelete = [];

    for (let k of db.subscription_keys || []) {
      if (k.planName && k.planName.includes("تست رایگان")) {
        const expDate = new Date(k.expireDate);
        if (expDate < now) {
          keysToDelete.push(k);
          continue;
        }
      }
      keysToKeep.push(k);
    }

    if (keysToDelete.length === 0) return;

    console.log(`[Auto Cleanup] Found ${keysToDelete.length} expired free trials. Deleting...`);

    const parsedSettings = getSystemSettings(db);
    if (parsedSettings && parsedSettings.panelConnectionActive && parsedSettings.baseUrl) {
      const cleanedUrl = normalizeXuiUrl(parsedSettings.baseUrl);
      const loginResult = await loginXuiPanel(cleanedUrl, parsedSettings.panelUsername, parsedSettings.panelPassword);

      if (loginResult.success && loginResult.cookie) {
        const headers: Record<string, string> = {
          "Cookie": loginResult.cookie,
          "Accept": "application/json"
        };
        if (loginResult.csrfToken) headers["X-Csrf-Token"] = loginResult.csrfToken;

        for (let k of keysToDelete) {
           let uuid = "";
           if (k.subLink) {
              const match = k.subLink.match(/(vless|vmess|trojan):\/\/([^@]+)@/);
              if (match && match[2]) uuid = match[2];
           }

           if (uuid) {
               // Global delete client (Sanaei modern API)
               await xuiFetch(`${cleanedUrl}/panel/api/client/${uuid}/del`, { method: "POST", headers }, 4000).catch(()=>{});
               
               // Fallback: delete client by UUID from each inbound specifically (Sanaei traditional API)
               try {
                 const inbRes = await xuiFetch(`${cleanedUrl}/panel/api/inbounds/list`, { method: "GET", headers }, 4000);
                 if (inbRes.ok) {
                   const inbJson = await inbRes.json();
                   if (inbJson.success && Array.isArray(inbJson.obj)) {
                     for (let inb of inbJson.obj) {
                       await xuiFetch(`${cleanedUrl}/panel/api/inbounds/${inb.id}/delClient/${uuid}`, { method: "POST", headers }, 3000).catch(()=>{});
                     }
                   }
                 }
               } catch(err) {}
           }
        }
      }
    }

    db.subscription_keys = keysToKeep;
    
    for (let u of db.users || []) {
       u.activePlansCount = (db.subscription_keys || []).filter((sk: any) => sk.userId === u.userId && sk.status === "active" && !sk.planName.includes("تست رایگان")).length;
    }

    writeJsonDb(db);
    console.log(`[Auto Cleanup] Successfully deleted ${keysToDelete.length} expired free trials from Panel and Local DB.`);
  } catch (err) {
    console.error("[Auto Cleanup Error]", err);
  }
}

async function sendTelegramMessage(botToken: string, chatId: string | number, text: string, replyMarkup?: any) {
  if (!botToken || botToken === "DUMMY_TOKEN") return;
  try {
    const fetchRef = globalThis.fetch || fetch;
    const body: any = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    await fetchRef(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error(`[Telegram Warning] Fail to send to ${chatId}:`, err);
  }
}

async function autoSyncTrafficUsage() {
  try {
    const db = readJsonDb();
    const settings = getSystemSettings(db);
    
    // Only continue if panel is connected
    if (!settings.panelConnectionActive || !settings.baseUrl) {
      return;
    }

    const cleanedUrl = normalizeXuiUrl(settings.baseUrl);
    const loginResult = await loginXuiPanel(cleanedUrl, settings.panelUsername, settings.panelPassword);

    if (!loginResult.success || !loginResult.cookie) {
      console.log("[Auto Sync Usage] Failed to connect to X-UI panel.");
      return;
    }

    const headers: Record<string, string> = {
      "Cookie": loginResult.cookie,
      "Accept": "application/json"
    };

    // Try to get clientTraffics API directly for accurate unique stats
    let trafficJson = null;
    try {
        const ctRes = await xuiFetch(`${cleanedUrl}/panel/api/inbounds/getClientTraffics`, { method: "GET", headers }, 8000);
        if (ctRes.ok) trafficJson = await ctRes.json();
    } catch(e) {}

    const trafficMap: Record<string, { up: number, down: number, total: number, expiryTime?: number, totalGb?: number }> = {};
    
    if (trafficJson && trafficJson.success && Array.isArray(trafficJson.obj)) {
      for (let cs of trafficJson.obj) {
        if (cs.email) {
          const lMail = cs.email.toLowerCase();
          if (!trafficMap[lMail]) trafficMap[lMail] = { up: 0, down: 0, total: 0 };
          trafficMap[lMail].up += Number(cs.up) || 0;
          trafficMap[lMail].down += Number(cs.down) || 0;
          trafficMap[lMail].total += (Number(cs.up) || 0) + (Number(cs.down) || 0);
          if (cs.expiryTime) trafficMap[lMail].expiryTime = Number(cs.expiryTime);
          if (cs.total) trafficMap[lMail].totalGb = Number(cs.total) / (1024 * 1024 * 1024);
        }
      }
    } else {
      // Get all inbounds fallback
      const inbRes = await xuiFetch(`${cleanedUrl}/panel/api/inbounds/list`, { method: "GET", headers }, 10000);
      if (!inbRes.ok) return;
      
      const inbJson = await inbRes.json();
      if (!inbJson.success || !Array.isArray(inbJson.obj)) return;

      const seenStats = new Set<string>();

      for (let inb of inbJson.obj) {
        let clientStats = inb.clientStats || [];
        for (let cs of clientStats) {
          if (cs.email) {
            // deduplicate if id exists
            if (cs.id !== undefined && cs.id !== null) {
              const statKey = `${cs.id}_${cs.email}`;
              if (seenStats.has(statKey)) continue;
              seenStats.add(statKey);
            }
            const lMail = cs.email.toLowerCase();
            if (!trafficMap[lMail]) trafficMap[lMail] = { up: 0, down: 0, total: 0 };
            trafficMap[lMail].up += Number(cs.up) || 0;
            trafficMap[lMail].down += Number(cs.down) || 0;
            trafficMap[lMail].total += (Number(cs.up) || 0) + (Number(cs.down) || 0);
            if (cs.expiryTime) trafficMap[lMail].expiryTime = Number(cs.expiryTime);
            if (cs.total) trafficMap[lMail].totalGb = Number(cs.total) / (1024 * 1024 * 1024);
          }
        }
      }
    }

    let updatedCount = 0;
    
    for (let k of db.subscription_keys || []) {
      const matchName = (k.clientName || k.planName || k.name || "").toLowerCase();
      if (matchName && trafficMap[matchName]) {
        const usedGb = trafficMap[matchName].total / (1024 * 1024 * 1024);
        if (Math.abs((k.trafficUsedGb || 0) - usedGb) > 0.01) {
          k.trafficUsedGb = Number(usedGb.toFixed(2));
          updatedCount++;
        }
        
        if (trafficMap[matchName].totalGb && trafficMap[matchName].totalGb! > 0) {
           const capGb = trafficMap[matchName].totalGb!;
           if (Math.abs((k.trafficLimitGb || 0) - capGb) > 0.01) {
               k.trafficLimitGb = Number(capGb.toFixed(2));
               updatedCount++;
           }
        }

        if (trafficMap[matchName].expiryTime && trafficMap[matchName].expiryTime! > 0) {
            const newExpiryISO = new Date(trafficMap[matchName].expiryTime!).toISOString();
            if (k.expireDate !== newExpiryISO) {
                k.expireDate = newExpiryISO;
                updatedCount++;
            }
        }
      }

      // Check Expiry Warning Feature (1GB remaining or 1 Day remaining)
      const isAutoWarningEnabled = String(db.settings?.autoWarningConfigBtn || "true") !== "false";
      let expDateObj = null;
      let remainingDays = 999;
      const remainingGb = (k.trafficLimitGb || 50) - (k.trafficUsedGb || 0);
      
      try {
        expDateObj = new Date(k.expireDate);
        remainingDays = Math.ceil((expDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      } catch(e) {}
      
      if (isAutoWarningEnabled && !k.expiryWarningSent) {
        if ((remainingGb <= 1 && remainingGb > 0) || (remainingDays <= 1 && remainingDays > 0)) {
           console.log(`[Official Warning] User ${k.userId} subscription "${k.planName || k.clientName}" is running out.`);
           const msg = `⚠️ <b>هشدار اتمام سرویس</b>\n\nکاربر گرامی، سرویس شما در حال اتمام است.\n\n🌐 نام سرویس: ${k.planName || "بدون نام"}\n🔰 کد سرویس: <code>${k.clientName}</code>\n🔻 حجم باقیمانده: ${remainingGb.toFixed(2)} GB\n⏳ روز باقیمانده: ${remainingDays} روز\n\nلطفاً نسبت به تمدید سرویس خود اقدام نمایید.`;
           const inlineKeyboard = {
             inline_keyboard: [
               [{ text: "🔗 دریافت لینک اتصال", callback_data: `vless_link_${k.id}` }],
               [{ text: "🎫 پشتیبانی", callback_data: "mm_btnTicketSupport" }]
             ]
           };
           await sendTelegramMessage(settings.botToken, k.userId, msg, inlineKeyboard);
           k.expiryWarningSent = true;
           updatedCount++;
        }
      }

      // Check No-Connection Warning Alert
      const isNoConnAlertEnabled = String(db.settings?.autoWarningNoConnectionBtn || "true") !== "false";
      if (isNoConnAlertEnabled && !k.noConnectionWarningSent && Math.abs(k.trafficUsedGb || 0) < 0.001) {
        if (expDateObj) {
           // We infer creation date from expire date and limit duration. For simplicity, just check if 1 day passed since 'now' and start date if possible.
           // However, without a clean createdAt, we can approximate: if duration is standard 30 and remaining is <= 29.
           // Better yet, just check if `k.createdAtMs` exists. Since we don't have it, we'll mark existing ones to avoid spam.
           if (!k.createdAtMs) {
               // Assign current time to old ones to avoid spamming everyone suddenly
               k.createdAtMs = Date.now();
               updatedCount++;
           } else {
               const daysSinceCreation = (Date.now() - k.createdAtMs) / (1000 * 60 * 60 * 24);
               if (daysSinceCreation >= 1) {
                   console.log(`[Official Warning] User ${k.userId} hasn't connected for 1 day.`);
                   let jalaliDate = k.expireDate;
                   try {
                     jalaliDate = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(k.expireDate));
                   } catch(e) {}
                   const msg = `🔔 <b>پیام سیستم:</b>\n\n🤔 <b>آیا مشکلی در اتصال به VPN دارید؟</b>\n\nسرویس شما 1 روز پیش فعال شده اما هنوز به آن متصل نشده‌اید.\n\n🖌️ نام سرویس: ${k.planName || "بدون نام"}\n🔰 کد سرویس: <code>${k.clientName}</code>\n🔺حجم بسته: ${(k.trafficLimitGb || 0).toFixed(2)} GB\n🔻حجم باقی مانده: ${remainingGb.toFixed(2)} GB\n📅 تاریخ انقضا: ${jalaliDate}\n\n🔧 <b>اگر در اتصال مشکل دارید:</b>\n• راهنمای اتصال را مطالعه کنید\n• اپلیکیشن VPN خود را بررسی کنید\n• در صورت نیاز به پشتیبانی پیام دهید`;
                   const inlineKeyboard = {
                     inline_keyboard: [
                       [{ text: "🔗 لینک اشتراک", callback_data: `vless_link_${k.id}` }],
                       [{ text: "🎫 تیکت به پشتیبانی", callback_data: "mm_btnTicketSupport" }]
                     ]
                   };
                   await sendTelegramMessage(settings.botToken, k.userId, msg, inlineKeyboard);
                   k.noConnectionWarningSent = true;
                   updatedCount++;
               }
           }
        }
      }

      // Check First Connection Alert
      const isFirstConnAlertEnabled = String(db.settings?.autoWarningFirstConnectionBtn || "true") !== "false";
      if (isFirstConnAlertEnabled && !k.firstConnectionMessageSent && (k.trafficUsedGb || 0) > 0.001) {
          console.log(`[Official Warning] User ${k.userId} made their first connection.`);
          let jalaliDate = k.expireDate;
          try {
             jalaliDate = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(k.expireDate));
          } catch(e) {}
          const msg = `🔔 <b>پیام سیستم:</b>\n\nسرویس شما با موفقیت متصل شد\n\n🔰 کد سرویس: <code>${k.clientName}</code>\n🔺حجم بسته: ${(k.trafficLimitGb || 0).toFixed(2)} GB\n🔻حجم باقی مانده: ${remainingGb.toFixed(2)} GB\n📅 تاریخ انقضا: ${jalaliDate}\n🔹 نام سرویس: ${k.planName || "بدون نام"}`;
          const inlineKeyboard = {
             inline_keyboard: [
               [{ text: "🔗 لینک اشتراک", callback_data: `vless_link_${k.id}` }],
               [{ text: "🎫 پشتیبانی", callback_data: "mm_btnTicketSupport" }]
             ]
          };
          await sendTelegramMessage(settings.botToken, k.userId, msg, inlineKeyboard);
          k.firstConnectionMessageSent = true;
          updatedCount++;
      }
    }

    // Now recalculate colleague accounts' usedTrafficGb based on allocated limits
    if (db.colleague_accounts && Array.isArray(db.colleague_accounts)) {
      for (const colAcc of db.colleague_accounts) {
        const colKeys = (db.subscription_keys || []).filter((k: any) => k.colleagueAccountId === colAcc.id);
        const totalUsed = colKeys.reduce((sum: number, k: any) => sum + (k.trafficLimitGb || 0), 0);
        const totalRealUsed = colKeys.reduce((sum: number, k: any) => sum + (k.trafficUsedGb || 0), 0);
        
        if (Math.abs((colAcc.usedTrafficGb || 0) - totalUsed) > 0.01) {
            colAcc.usedTrafficGb = Number(totalUsed.toFixed(2));
            updatedCount++;
        }
        if (Math.abs((colAcc.realUsedTrafficGb || 0) - totalRealUsed) > 0.01) {
            colAcc.realUsedTrafficGb = Number(totalRealUsed.toFixed(2));
            updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      writeJsonDb(db);
      console.log(`[Auto Sync Usage] Updated traffic usage for ${updatedCount} subscriptions.`);
    }
  } catch (err) {
    console.error("[Auto Sync Usage Error]", err);
  }
}

async function startServer() {
  // Start the background cron job for auto cleaning expired trials
  setInterval(autoCleanExpiredFreeTrials, 10 * 60 * 1000);
  setTimeout(autoCleanExpiredFreeTrials, 10000); // Also run shortly after startup

  // Start background cron job for auto syncing traffic every 10 seconds
  setInterval(autoSyncTrafficUsage, 10 * 1000);
  setTimeout(autoSyncTrafficUsage, 5000); // Also run shortly after startup

  // Start background cron job for auto backup check every minute
  setInterval(checkAutoBackup, 60 * 1000);
  setTimeout(checkAutoBackup, 5000); // Check once shortly after startup

  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Mount dev Vite middleware mode.");
    
    // Create Vite server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    
    // Force Vite request processing
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    console.log(`[Server] Serving production files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Daltoon Full-Stack Server] Ready at: http://localhost:${PORT}`);
  });
}

startServer();
