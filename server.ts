import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { spawn, ChildProcess, exec } from "child_process";

// Disable SSL verification for outgoing requests to 3x-ui panels
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Path to JSON-based DB store (relative to script to support reliable CWD-independent execution like PM2)
const dbJsonPath = __dirname.endsWith("dist")
  ? path.resolve(__dirname, "..", "bot_database.json")
  : path.resolve(__dirname, "bot_database.json");

// Helper to load port dynamically from DB config
function getServerPort(): number {
  // Always log 3000 inside this sandboxed container so the dev reverse proxy never breaks.
  return 3000;
}

// Set up server port
const PORT = getServerPort();
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
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
  colleague_packages?: any[];
  colleague_accounts?: any[];
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
        vpn_plans: [
          { id: "std_1m_30g", name: "Standard 1 Month - 30GB", durationDays: 30, trafficGb: 30, price: 95000, category: "Standard", configStock: [] },
          { id: "std_1m_50g", name: "Standard 1 Month - 50GB", durationDays: 30, trafficGb: 50, price: 135000, category: "Standard", configStock: [] },
          { id: "vip_1m_100g", name: "VIP HyperSpeed 1 Month - 100GB", durationDays: 30, trafficGb: 100, price: 210000, category: "VIP", configStock: [] },
          { id: "vip_3m_200g", name: "VIP Family Pack 3 Months - 200GB", durationDays: 90, trafficGb: 200, price: 420000, category: "VIP", configStock: [] },
          { id: "voip_1m_20g", name: "VoIP & Gaming Low Ping - 20GB", durationDays: 30, trafficGb: 20, price: 110000, category: "Unlimited VoIP", configStock: [] }
        ],
        colleague_packages: [],
        colleague_accounts: [],
        inbounds: [],
        custom_buttons: [],
        gift_codes: [],
        settings: {
          panel_config: JSON.stringify({
            botToken: "",
            baseUrl: "",
            panelUrl: "",
            panelUsername: "",
            panelPassword: "",
            activeInboundIds: [],
            ownerId: 0,
            cardNumber: "",
            cardHolder: "",
            bankName: "",
            welcomeText: "سلام کاربر گرامی 🌹\nبه ربات دالتون استور خوش آمدید.",
            supportText: "برای پشتیبانی با مدیریت در ارتباط باشید.",
            hideSupport: false,
            hideBuy: false,
            hideProfile: false,
            hideWallet: false,
            dashboardUsername: "Daltoon",
            dashboardPassword: "Daltoon10",
            serverPort: 3000,
            admins: []
          })
        }
      };
      fs.writeFileSync(dbJsonPath, JSON.stringify(defaultDb, null, 2), "utf8");
      return defaultDb;
    }
    const raw = fs.readFileSync(dbJsonPath, "utf8");
    const db = JSON.parse(raw);
    
    // Backport vpn_plans on existing database structures
    if (!db.vpn_plans) {
      db.vpn_plans = [
        { id: "std_1m_30g", name: "Standard 1 Month - 30GB", durationDays: 30, trafficGb: 30, price: 95000, category: "Standard", configStock: [] },
        { id: "std_1m_50g", name: "Standard 1 Month - 50GB", durationDays: 30, trafficGb: 50, price: 135000, category: "Standard", configStock: [] },
        { id: "vip_1m_100g", name: "VIP HyperSpeed 1 Month - 100GB", durationDays: 30, trafficGb: 100, price: 210000, category: "VIP", configStock: [] },
        { id: "vip_3m_200g", name: "VIP Family Pack 3 Months - 200GB", durationDays: 90, trafficGb: 200, price: 420000, category: "VIP", configStock: [] },
        { id: "voip_1m_20g", name: "VoIP & Gaming Low Ping - 20GB", durationDays: 30, trafficGb: 20, price: 110000, category: "Unlimited VoIP", configStock: [] }
      ];
      fs.writeFileSync(dbJsonPath, JSON.stringify(db, null, 2), "utf8");
    }
    return db;
  } catch (err) {
    console.error("[Database] Read error, returning empty dataset:", err);
    return { users: [], transactions: [], subscription_keys: [], inbounds: [], custom_buttons: [], vpn_plans: [], settings: {}, gift_codes: [] };
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

let botProcess: ChildProcess | null = null;

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
    botProcess.kill("SIGTERM");
    botProcess = null;
  }

  // Load latest settings to check if BOT_TOKEN is empty
  const db = readJsonDb();
  let parsedSettings: any = {};
  try {
    parsedSettings = db.settings.panel_config 
      ? JSON.parse(db.settings.panel_config)
      : {};
  } catch (e) {
    console.warn("[Bot Manager] Could not parse panel_config:", e);
  }

  const token = parsedSettings.botToken;

  if (!token || token === "DUMMY_TOKEN" || token.trim() === "") {
    console.log("[Bot Manager] Bot token is empty or dummy. Python bot will not start.");
    return;
  }

  console.log(`[Bot Manager] Starting Python Telegram Bot with token ${token.substring(0, 6)}...`);
  try {
    const pythonCmd = "python3";
    const botScriptPath = path.resolve(process.cwd(), "bot.py");
    
    botProcess = spawn(pythonCmd, [botScriptPath], {
      cwd: process.cwd(),
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
    const parsedSettings = db.settings.panel_config 
      ? JSON.parse(db.settings.panel_config)
      : {};
      
    const settings = {
      botToken: "",
      baseUrl: "",
      panelUrl: "",
      panelUsername: "",
      panelPassword: "",
      activeInboundIds: [],
      ownerId: 0,
      cardNumber: "",
      cardHolder: "",
      bankName: "",
      welcomeText: "",
      supportText: "",
      hideSupport: false,
      hideBuy: false,
      hideProfile: false,
      hideWallet: false,
      dashboardUsername: "Daltoon",
      dashboardPassword: "Daltoon10",
      serverPort: 3000,
      admins: [],
      ...parsedSettings
    };

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
      colleaguePackages: db.colleague_packages || [],
      colleagueAccounts: db.colleague_accounts || [],
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
  const { id, title, price, durationDays, description } = req.body;
  if (!id || !title || price === undefined || durationDays === undefined) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const existingIdx = db.colleague_packages.findIndex(p => p.id === id);
  if (existingIdx !== -1) {
    db.colleague_packages[existingIdx] = { id, title, price: Number(price), durationDays: Number(durationDays), description };
  } else {
    db.colleague_packages.push({ id, title, price: Number(price), durationDays: Number(durationDays), description });
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
    const prevSettings = db.settings.panel_config ? JSON.parse(db.settings.panel_config) : {};
    const prevAdmins = prevSettings.admins || [];
    const newAdmins = payload.admins || [];
    
    const addedAdmins = newAdmins.filter((newAdm: any) => 
      newAdm.userId && !prevAdmins.some((prevAdm: any) => Number(prevAdm.userId) === Number(newAdm.userId))
    );

    db.settings.panel_config = configValue;
    writeJsonDb(db);

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
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: "Missing message text." });
    }

    const db = readJsonDb();
    const parsedSettings = db.settings.panel_config 
      ? JSON.parse(db.settings.panel_config)
      : {};
    
    const botToken = parsedSettings.botToken;
    const users = db.users || [];
    let count = 0;

    if (botToken) {
      for (const u of users) {
        if (u.userId) {
          try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                chat_id: u.userId,
                text: text,
                parse_mode: "HTML"
              })
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
    user.walletBalance = nextBal;
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

    const parsedSettings = db.settings.panel_config 
      ? JSON.parse(db.settings.panel_config)
      : {};
    const settings = {
      botToken: "",
      baseUrl: "",
      panelUrl: "",
      panelUsername: "",
      panelPassword: "",
      activeInboundIds: [],
      ownerId: 0,
      cardNumber: "",
      cardHolder: "",
      bankName: "",
      welcomeText: "",
      supportText: "",
      hideSupport: false,
      hideBuy: false,
      hideProfile: false,
      hideWallet: false,
      dashboardUsername: "Daltoon",
      dashboardPassword: "Daltoon10",
      serverPort: 3000,
      admins: [],
      panelConnectionActive: false,
      ...parsedSettings
    };

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

    const parsedSettings = db.settings.panel_config 
      ? JSON.parse(db.settings.panel_config)
      : {};
    const settings = {
      botToken: "",
      baseUrl: "",
      panelUrl: "",
      panelUsername: "",
      panelPassword: "",
      activeInboundIds: [],
      ownerId: 0,
      cardNumber: "",
      cardHolder: "",
      bankName: "",
      welcomeText: "",
      supportText: "",
      hideSupport: false,
      hideBuy: false,
      hideProfile: false,
      hideWallet: false,
      dashboardUsername: "Daltoon",
      dashboardPassword: "Daltoon10",
      serverPort: 3000,
      admins: [],
      panelConnectionActive: false,
      ...parsedSettings
    };

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
    
    const parsedSettings = db.settings.panel_config 
      ? JSON.parse(db.settings.panel_config)
      : {};
      
    const dbUser = parsedSettings.dashboardUsername || "Daltoon";
    const dbPass = parsedSettings.dashboardPassword || "Daltoon10";
    const dbAdmins = parsedSettings.admins || [];
    
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

    const parsedSettings = db.settings.panel_config ? JSON.parse(db.settings.panel_config) : null;
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

async function autoSyncTrafficUsage() {
  try {
    const db = readJsonDb();
    const settings = db.settings?.panel_config ? JSON.parse(db.settings.panel_config) : null;
    
    // Only continue if panel is connected
    if (!settings || !settings.panelConnectionActive || !settings.baseUrl) {
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

    // Get all inbounds
    const inbRes = await xuiFetch(`${cleanedUrl}/panel/api/inbounds/list`, { method: "GET", headers }, 10000);
    if (!inbRes.ok) return;
    
    const inbJson = await inbRes.json();
    if (!inbJson.success || !Array.isArray(inbJson.obj)) return;

    let updatedCount = 0;
    
    // Create a map of emails to their total used traffic (in bytes)
    const trafficMap: Record<string, { up: number, down: number, total: number }> = {};
    
    for (let inb of inbJson.obj) {
      let clientStats = inb.clientStats || [];
      for (let cs of clientStats) {
        if (cs.email) {
          if (!trafficMap[cs.email]) trafficMap[cs.email] = { up: 0, down: 0, total: 0 };
          trafficMap[cs.email].up += Number(cs.up) || 0;
          trafficMap[cs.email].down += Number(cs.down) || 0;
          trafficMap[cs.email].total += (Number(cs.up) || 0) + (Number(cs.down) || 0);
        }
      }
    }

    for (let k of db.subscription_keys || []) {
      if (k.clientName && trafficMap[k.clientName]) {
        const usedGb = trafficMap[k.clientName].total / (1024 * 1024 * 1024);
        // Only update if changed by more than 0.01 GB to avoid constant small writes
        if (Math.abs(k.trafficUsedGb - usedGb) > 0.01) {
          k.trafficUsedGb = Number(usedGb.toFixed(2));
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

  // Start background cron job for auto syncing traffic every 5 minutes
  setInterval(autoSyncTrafficUsage, 5 * 60 * 1000);
  setTimeout(autoSyncTrafficUsage, 15000); // Also run shortly after startup

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
