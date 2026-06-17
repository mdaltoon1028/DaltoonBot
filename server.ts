import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Set up server port
const PORT = 3000;
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Path to JSON-based DB store
const dbJsonPath = path.resolve(process.cwd(), "bot_database.json");
console.log(`[Database] Connecting to JSON file database at: ${dbJsonPath}`);

// Define types for pure JSON database to align perfectly with schema
interface DbSchema {
  users: any[];
  transactions: any[];
  subscription_keys: any[];
  inbounds: any[];
  custom_buttons: any[];
  settings: Record<string, string>;
}

// Function to read JSON Database, seeding with default templates if not found
function readJsonDb(): DbSchema {
  try {
    if (!fs.existsSync(dbJsonPath)) {
      console.log("[Database] JSON database not found. Seeding initial templates...");
      const defaultDb: DbSchema = {
        users: [
          { userId: 6536288293, username: "daltoon_owner", walletBalance: 75000, activePlansCount: 2, joinDate: "2026-06-15", status: "active" },
          { userId: 504192821, username: "reza_parsa", walletBalance: 0, activePlansCount: 0, joinDate: "2026-06-16", status: "active" },
          { userId: 802148210, username: "madi_is_here", walletBalance: 15000, activePlansCount: 1, joinDate: "2026-06-16", status: "active" }
        ],
        transactions: [
          { id: "TX-00912", userId: 6536288293, username: "daltoon_owner", amount: 15000, receiptImage: "", status: "approved", date: "2026-06-15T14:32:00Z", description: "شارژ تستی پنل" },
          { id: "TX-32981", userId: 504192821, username: "reza_parsa", amount: 50000, receiptImage: "", status: "pending", date: "2026-06-17T01:22:00Z", description: "خرید شارژ با فیش بانکی" },
          { id: "TX-21048", userId: 802148210, username: "madi_is_here", amount: 25000, receiptImage: "", status: "rejected", date: "2026-06-16T11:05:00Z", description: "رسید نامعتبر - رد شد" }
        ],
        subscription_keys: [
          {
            id: "SUB-1102", userId: 6536288293, planId: "standard_30", planName: "Standard 30GB (1 Month)",
            subLink: "vless://93a7e4b2-e1d5-4923-9da5-db7c6bd123fc@m.daltoon-server.ir:2052?security=reality&sni=google.com&fp=chrome&pbk=Ea_V80fD78H_mG4_Qd-8&sid=1c7d2e3f&spx=%2F#IR-MCI-Direct",
            expireDate: "2026-07-15", trafficLimitGb: 30.0, trafficUsedGb: 14.5, status: "active"
          },
          {
            id: "SUB-9981", userId: 6536288293, planId: "vip_70", planName: "VIP Premium 70GB (2 Months)",
            subLink: "vmess://eyJhZGRyIjoibS5kYWx0b29uLXNlcnZlci5pciIsInBvcnQiOjIwODIsImlkIjoiOTNhN2U0YjItZTFkNS00OTIzLTlkYTUtZGI3YzZiZDEyM2ZjIiwiYWlkIjowLCJuZXQiOiJ3cyIsInBhdGgiOiIvRGFsdG9vbiIsInR5cGUiOiJub25lIiwidGxzIjoibm9uZSJ9",
            expireDate: "2026-08-15", trafficLimitGb: 70.0, trafficUsedGb: 48.2, status: "active"
          },
          {
            id: "SUB-4029", userId: 802148210, planId: "basic_15", planName: "Basic 15GB (1 Month)",
            subLink: "vless://4a27c00e-3cc4-436f-b1e7-bc1829e2f183@m.daltoon-server.ir:80?path=%2F&security=none&type=ws#Wi-Fi-Asiatech",
            expireDate: "2026-07-16", trafficLimitGb: 15.0, trafficUsedGb: 8.1, status: "active"
          }
        ],
        inbounds: [
          { id: 1, remark: "IR-MCI-Direct-VLESS 🚀", protocol: "vless", port: 2052, totalClients: 42, trafficUsed: "148.5", trafficLimit: "1000", status: "active" },
          { id: 12, remark: "IR-MTN-Tunnel-VMESS ⚡", protocol: "vmess", port: 2082, totalClients: 85, trafficUsed: "412.3", trafficLimit: "2000", status: "active" },
          { id: 16, remark: "MCI-VIP-Trojan 💎", protocol: "trojan", port: 443, totalClients: 19, trafficUsed: "88.1", trafficLimit: "500", status: "active" },
          { id: 19, remark: "Wi-Fi-Asiatech-Direct 🛜", protocol: "vless", port: 80, totalClients: 33, trafficUsed: "110.4", trafficLimit: "1000", status: "active" },
          { id: 24, remark: "IR-MCI-VoIP-Optimized 📞", protocol: "vless", port: 8080, totalClients: 11, trafficUsed: "24.9", trafficLimit: "300", status: "active" }
        ],
        custom_buttons: [
          { id: "cb_gift", text: "🎁 تست رایگان ۲ ساعته", replyText: "کاربر گرامی، بدین وسیله یک اکانت تست ۲ ساعته با حجم ۲۰۰ مگابایت برای شما تولید شد:\n\nvless://f39281a1-9b1d-4050-b498-3882aef1277a@m.daltoon-server.ir:2052?security=reality&sni=google.com&fp=chrome#Daltoon-GiftTest" },
          { id: "cb_channel", text: "📢 کانال تلگرام", replyText: "دوست گرامی! برای عضویت در گروه حل مشکلات و مطلع شدن از آخرین اخبار روی پیوند زیر ضربه بزنید:\n\n👉 @daltoon_channel" }
        ],
        settings: {
          panel_config: JSON.stringify({
            botToken: "6469257181:AAEFfE_C_zG_CM2F7x5dhPXd1IjEv2AuGjw",
            baseUrl: "https://m.daltoon-server.ir:8443/Daltoon",
            panelUrl: "http://localhost:2053",
            panelUsername: "Daltoon",
            panelPassword: "Daltoon10",
            activeInboundIds: [1, 12, 16],
            ownerId: 6536288293
          })
        }
      };
      fs.writeFileSync(dbJsonPath, JSON.stringify(defaultDb, null, 2), "utf8");
      return defaultDb;
    }
    const raw = fs.readFileSync(dbJsonPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[Database] Read error, returning empty dataset:", err);
    return { users: [], transactions: [], subscription_keys: [], inbounds: [], custom_buttons: [], settings: {} };
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

// 1. Get complete aggregated database snapshot
app.get("/api/data", async (req, res) => {
  try {
    const db = readJsonDb();
    const settings = db.settings.panel_config 
      ? JSON.parse(db.settings.panel_config)
      : {
          botToken: "",
          baseUrl: "",
          panelUrl: "",
          panelUsername: "",
          panelPassword: "",
          activeInboundIds: [],
          ownerId: 0
        };

    res.json({
      success: true,
      users: db.users,
      transactions: db.transactions,
      keys: db.subscription_keys,
      inbounds: db.inbounds,
      customButtons: db.custom_buttons,
      settings
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Save panel configuration
app.post("/api/settings", async (req, res) => {
  try {
    const { botToken, baseUrl, panelUrl, panelUsername, panelPassword, activeInboundIds, ownerId } = req.body;
    const configValue = JSON.stringify({
      botToken,
      baseUrl,
      panelUrl,
      panelUsername,
      panelPassword,
      activeInboundIds,
      ownerId: Number(ownerId)
    });

    const db = readJsonDb();
    db.settings.panel_config = configValue;
    writeJsonDb(db);

    res.json({ success: true, message: "Settings saved successfully to JSON store." });
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
