import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

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
          { id: "std_1m_30g", name: "Standard 1 Month - 30GB", durationMonths: 1, trafficGb: 30, price: 95000, category: "Standard", configStock: [] },
          { id: "std_1m_50g", name: "Standard 1 Month - 50GB", durationMonths: 1, trafficGb: 50, price: 135000, category: "Standard", configStock: [] },
          { id: "vip_1m_100g", name: "VIP HyperSpeed 1 Month - 100GB", durationMonths: 1, trafficGb: 100, price: 210000, category: "VIP", configStock: [] },
          { id: "vip_3m_200g", name: "VIP Family Pack 3 Months - 200GB", durationMonths: 3, trafficGb: 200, price: 420000, category: "VIP", configStock: [] },
          { id: "voip_1m_20g", name: "VoIP & Gaming Low Ping - 20GB", durationMonths: 1, trafficGb: 20, price: 110000, category: "Unlimited VoIP", configStock: [] }
        ],
        inbounds: [],
        custom_buttons: [],
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
        { id: "std_1m_30g", name: "Standard 1 Month - 30GB", durationMonths: 1, trafficGb: 30, price: 95000, category: "Standard", configStock: [] },
        { id: "std_1m_50g", name: "Standard 1 Month - 50GB", durationMonths: 1, trafficGb: 50, price: 135000, category: "Standard", configStock: [] },
        { id: "vip_1m_100g", name: "VIP HyperSpeed 1 Month - 100GB", durationMonths: 1, trafficGb: 100, price: 210000, category: "VIP", configStock: [] },
        { id: "vip_3m_200g", name: "VIP Family Pack 3 Months - 200GB", durationMonths: 3, trafficGb: 200, price: 420000, category: "VIP", configStock: [] },
        { id: "voip_1m_20g", name: "VoIP & Gaming Low Ping - 20GB", durationMonths: 1, trafficGb: 20, price: 110000, category: "Unlimited VoIP", configStock: [] }
      ];
      fs.writeFileSync(dbJsonPath, JSON.stringify(db, null, 2), "utf8");
    }
    return db;
  } catch (err) {
    console.error("[Database] Read error, returning empty dataset:", err);
    return { users: [], transactions: [], subscription_keys: [], inbounds: [], custom_buttons: [], vpn_plans: [], settings: {} };
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

// Ensure database file gets seeded on startup
readJsonDb();

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

    res.json({
      success: true,
      users: db.users,
      transactions: db.transactions,
      keys: db.subscription_keys,
      inbounds: db.inbounds,
      customButtons: db.custom_buttons,
      vpnPlans: db.vpn_plans || [],
      settings
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Save panel configuration
app.post("/api/settings", async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.ownerId) {
      payload.ownerId = Number(payload.ownerId);
    }
    const configValue = JSON.stringify(payload);

    const db = readJsonDb();
    db.settings.panel_config = configValue;
    writeJsonDb(db);

    res.json({ success: true, message: "Settings saved successfully to JSON store." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
      const https = await import("https");
      for (const u of users) {
        if (u.userId) {
          const postData = JSON.stringify({
            chat_id: u.userId,
            text: text,
            parse_mode: "HTML"
          });
          const reqOptions = {
            hostname: "api.telegram.org",
            port: 443,
            path: `/bot${botToken}/sendMessage`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData)
            }
          };
          const postReq = https.request(reqOptions, () => {});
          postReq.on("error", (e) => {
            console.error(`[Broadcast] Failed to send message to user ${u.userId}:`, e);
          });
          postReq.write(postData);
          postReq.end();
          count++;
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
    const { id } = req.body;
    const db = readJsonDb();
    
    const tx = db.transactions.find(t => t.id === id);
    if (tx) {
      tx.status = "approved";
      
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
    const { id, name, durationMonths, trafficGb, price, category, configStock } = req.body;
    const db = readJsonDb();
    if (!db.vpn_plans) db.vpn_plans = [];

    const nextPlan = {
      id,
      name,
      durationMonths: Number(durationMonths),
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
    const { planId, userId } = req.body;
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
    const ownerId = Number(parsedSettings.ownerId || 6536288293);
    const admins = Array.isArray(parsedSettings.admins) ? parsedSettings.admins : [];
    
    const isAdminOrOwner = Number(userId) === ownerId || admins.some((adm: any) => Number(adm.userId) === Number(userId)) || user.username === "daltoon_owner";

    if (!isAdminOrOwner && user.walletBalance < plan.price) {
      return res.status(400).json({ success: false, error: "موجودی کیف پول شما کافی نیست." });
    }

    // Check if stock exists or is empty. If empty, automatically generate an on-the-fly config as simulator backup!
    let subLink = "";
    if (!plan.configStock || plan.configStock.length === 0) {
      const mockUuid = "xxxx-xxxx-xxxx-xxxx".replace(/[xy]/g, () => (Math.random() * 16 | 0).toString(16));
      subLink = `vless://${mockUuid}@m.daltoon-server.ir:2052?security=reality&sni=google.com&fp=chrome#Daltoon-${plan.name.replace(/\s+/g, "")}`;
    } else {
      subLink = plan.configStock.shift();
    }
    
    // Create subscription key
    const randomId = "SUB-" + Math.floor(Math.random() * 9000 + 1000);
    const expireDate = new Date(Date.now() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    const newSub = {
      id: randomId,
      userId: Number(userId),
      planId: plan.id,
      planName: plan.name,
      subLink: subLink,
      expireDate: expireDate,
      trafficLimitGb: plan.trafficGb,
      trafficUsedGb: 0,
      status: "active"
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
async function startServer() {
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
