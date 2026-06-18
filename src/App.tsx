import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Bot, 
  Settings, 
  RefreshCw, 
  Globe, 
  Server,
  Heart,
  LogOut,
  Command
} from "lucide-react";

// Types & Data
import { PanelSettings, InboundInfo, User, Transaction, VpnPlan, SubscriptionKey, CustomButton } from "./types";
import { Language, translations } from "./locales";
import { 
  initialSettings, 
  initialInbounds, 
  initialUsers, 
  initialPlans, 
  initialTransactions, 
  initialSubscriptionKeys 
} from "./data";

// Sub Components
import DashboardOverview from "./components/DashboardOverview";
import UserManagement from "./components/UserManagement";
import TransactionApproval from "./components/TransactionApproval";
import BotSimulator from "./components/BotSimulator";
import ServerManagement from "./components/ServerManagement";
import SettingsPanel from "./components/SettingsPanel";
import BotButtonsPanel from "./components/BotButtonsPanel";
import { LoginScreen } from "./components/LoginScreen";

const LionAndSunFlag = () => (
  <div className="inline-flex items-center select-none" title="پرچم شیر و خورشید ایران">
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="rounded-full overflow-hidden shadow-[0_0_12px_rgba(99,102,241,0.3)] border border-slate-700/60 bg-white">
      <defs>
        <clipPath id="circle-flag-clip">
          <circle cx="18" cy="18" r="18" />
        </clipPath>
      </defs>
      <g clipPath="url(#circle-flag-clip)">
        {/* Green Band (top) */}
        <rect x="0" y="0" width="36" height="12" fill="#008B38" />
        {/* White Band (middle) */}
        <rect x="0" y="12" width="36" height="12" fill="#FFFFFF" />
        {/* Red Band (bottom) */}
        <rect x="0" y="24" width="36" height="12" fill="#DA291C" />
        
        {/* Elegant White Circular Emblem Plate Overlay */}
        <circle cx="18" cy="18" r="10" fill="#FFFFFF" className="shadow-xs" />
        
        {/* High-Fidelity Correct Left-Facing Gold Lion and Sun Emblem group */}
        <g transform="translate(18, 18) scale(0.85)">
          {/* Sun background & rays */}
          <circle cx="1.8" cy="-1.5" r="3.2" fill="#FFA000" />
          <path d="M 1.8 -1.5 L 1.8 -9
                   M -0.2 -2 L -3.8 -7
                   M 3.8 -2 L 7.4 -7
                   M -0.8 -0.5 L -5.8 -4
                   M 4.4 -0.5 L 9.4 -4
                   M 1.8 -1.5 L -1.2 -7
                   M 1.8 -1.5 L 4.8 -7" stroke="#FFA000" strokeWidth="0.8" strokeLinecap="round" />
          
          {/* Pedestal Ground Line */}
          <path d="M -9 6 L 9 6" stroke="#C59000" strokeWidth="0.9" strokeLinecap="round" />
          
          {/* Detailed Lion Tail */}
          <path d="M 5 2 C 7.5 -0.5, 6.5 -5, 4.5 -4.5 C 3.5 -4, 4.5 -2, 4 -2.5" stroke="#D4AF37" strokeWidth="1" fill="none" strokeLinecap="round" />
          <circle cx="4" cy="-5" r="0.6" fill="#D4AF37" />

          {/* back legs for depth */}
          <path d="M 3.5 2.5 L 4.5 6" stroke="#9E7815" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M -1.8 3 L -2.5 6" stroke="#9E7815" strokeWidth="1.5" strokeLinecap="round" />
          
          {/* Lion Body (facing left) */}
          <path d="M -5.2 2.8 C -5.2 0.8, -1.5 0.5, 1 1 C 3 1.2, 5.2 1.5, 5.2 3 C 5.2 4.2, 3.2 5, -1 5 C -3.8 5, -5.2 4, -5.2 2.8 Z" fill="#D4AF37" />
          
          {/* Front standing leg */}
          <path d="M -3.5 3 L -4.2 6" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 2.2 3.5 L 2.8 6" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" />
          
          {/* Mane and Head */}
          <circle cx="-4.5" cy="1" r="1.8" fill="#D4AF37" />
          <circle cx="-3.8" cy="0.4" r="1.3" fill="#FFC107" />
          
          {/* Sword raising right arm */}
          <path d="M -4 2 C -4 0.5, -4.8 -1.2, -4.5 -2" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          
          {/* Sabre (Sword) - Raised high, curving backward over the head correctly */}
          <path d="M -4.5 -2 C -7.5 -5.2, -5.5 -10, -2.5 -11.5" stroke="#ECEFF1" strokeWidth="1.1" strokeLinecap="round" fill="none" />
          <path d="M -4.5 -2 C -7.5 -5.2, -5.5 -10, -2.5 -11.5" stroke="#37474F" strokeWidth="0.4" strokeLinecap="round" fill="none" />
          {/* Sword hilt */}
          <path d="M -5.2 -1.6 L -3.8 -2.4" stroke="#FFA000" strokeWidth="1" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  </div>
);

export default function App() {
  // State initialization with localStorage persistence
  const [lang, setLang] = useState<Language>(() => {
    const cached = localStorage.getItem("daltoon_lang");
    return (cached === "fa" || cached === "en") ? cached : "fa"; // Default to Persian as requested
  });

  const [settings, setSettings] = useState<PanelSettings>(() => {
    const cached = localStorage.getItem("daltoon_settings");
    return cached ? JSON.parse(cached) : initialSettings;
  });

  const [inbounds, setInbounds] = useState<InboundInfo[]>(() => {
    const cached = localStorage.getItem("daltoon_inbounds");
    return cached ? JSON.parse(cached) : initialInbounds;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const cached = localStorage.getItem("daltoon_users");
    return cached ? JSON.parse(cached) : initialUsers;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const cached = localStorage.getItem("daltoon_transactions");
    return cached ? JSON.parse(cached) : initialTransactions;
  });

  const [keys, setKeys] = useState<SubscriptionKey[]>(() => {
    const cached = localStorage.getItem("daltoon_keys");
    return cached ? JSON.parse(cached) : initialSubscriptionKeys;
  });

  const [vpnPlans, setVpnPlans] = useState<VpnPlan[]>(() => {
    const cached = localStorage.getItem("daltoon_vpn_plans");
    return cached ? JSON.parse(cached) : initialPlans;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("daltoon_dashboard_auth") === "true";
  });

  const [customButtons, setCustomButtons] = useState<CustomButton[]>(() => {
    const cached = localStorage.getItem("daltoon_custom_buttons");
    if (cached) return JSON.parse(cached);
    return [
      { id: "cb_gift", text: "🎁 تست رایگان ۲ ساعته", replyText: "کاربر گرامی، بدین وسیله یک اکانت تست ۲ ساعته با حجم ۲۰۰ مگابایت برای شما تولید شد:\n\nvless://f39281a1-9b1d-4050-b498-3882aef1277a@m.daltoon-server.ir:2052?security=reality&sni=google.com&fp=chrome#Daltoon-GiftTest" },
      { id: "cb_channel", text: "📢 کانال تلگرام", replyText: "دوست گرامی! برای عضویت در گروه حل مشکلات و مطلع شدن از آخرین اخبار و پایداری شبکه روی پیوند زیر ضربه بزنید:\n\n👉 @daltoon_channel" }
    ];
  });

  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "transactions" | "simulator" | "servers" | "buttons" | "settings" | "guide" | "xui_connector">(() => {
    const cached = localStorage.getItem("daltoon_active_tab");
    return (cached as any) || "dashboard";
  });
  const [simulatedUserId, setSimulatedUserId] = useState<number>(() => {
    const cached = localStorage.getItem("daltoon_simulated_user_id");
    return cached ? Number(cached) : 6536288293;
  });
  const [apiOnline, setApiOnline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = translations[lang];

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("daltoon_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("daltoon_simulated_user_id", String(simulatedUserId));
  }, [simulatedUserId]);

  useEffect(() => {
    localStorage.setItem("daltoon_lang", lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("daltoon_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("daltoon_inbounds", JSON.stringify(inbounds));
  }, [inbounds]);

  useEffect(() => {
    localStorage.setItem("daltoon_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("daltoon_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("daltoon_keys", JSON.stringify(keys));
  }, [keys]);

  useEffect(() => {
    localStorage.setItem("daltoon_vpn_plans", JSON.stringify(vpnPlans));
  }, [vpnPlans]);

  useEffect(() => {
    localStorage.setItem("daltoon_custom_buttons", JSON.stringify(customButtons));
  }, [customButtons]);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/data");
      const json = await response.json();
      if (json.success) {
        if (json.users) setUsers(json.users);
        if (json.transactions) setTransactions(json.transactions);
        if (json.keys) setKeys(json.keys);
        if (json.vpnPlans) setVpnPlans(json.vpnPlans);
        if (json.inbounds) setInbounds(json.inbounds);
        if (json.customButtons) setCustomButtons(json.customButtons);
        if (json.settings && json.settings.botToken) setSettings(json.settings);
        console.log("[Full-Stack Sync] SQLite bot_database.db refreshed successfully.");
        
        setToastMessage(lang === "fa" ? "✅ اطلاعات داشبورد با موفقیت بروزرسانی شد." : "✅ Dashboard data refreshed successfully.");
        setTimeout(() => {
          setToastMessage(null);
        }, 3000);
      }
    } catch (err) {
      console.warn("[Full-Stack Sync] Failed connecting to Express Database.", err);
      setToastMessage(lang === "fa" ? "❌ خطا در دریافت اطلاعات از سرور." : "❌ Failed refreshing data from server.");
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch complete SQLite database state on mount and update every 2 minutes automatically
  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      refreshData();
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  // Database mutations & action handlers (with API sync triggers)
  const toggleInbound = (id: number) => {
    const nextStatus = inbounds.find(ib => ib.id === id)?.status === "active" ? "inactive" : "active";
    setInbounds(prev => prev.map(ib => {
      if (ib.id === id) {
        return { ...ib, status: nextStatus };
      }
      return ib;
    }));
    fetch("/api/inbounds/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus })
    }).catch(err => console.warn("Failed syncing toggled inbound:", err));
  };

  const adjustUserWallet = (userId: number, amount: number) => {
    setUsers(prev => prev.map(u => {
      if (u.userId === userId) {
        const nextBal = Math.max(0, u.walletBalance + amount);
        return { ...u, walletBalance: nextBal };
      }
      return u;
    }));
    fetch("/api/users/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount })
    }).catch(err => console.warn("Failed syncing adjusted wallet:", err));
  };

  const toggleUserBan = (userId: number) => {
    let nextStatus: "active" | "banned" = "active";
    setUsers(prev => prev.map(u => {
      if (u.userId === userId) {
        nextStatus = u.status === "active" ? "banned" : "active";
        return { ...u, status: nextStatus };
      }
      return u;
    }));
    setTimeout(() => {
      fetch("/api/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus })
      }).catch(err => console.warn("Failed syncing banned user status:", err));
    }, 100);
  };

  const addNewUser = (user: User) => {
    if (users.some(u => u.userId === user.userId)) {
      alert(lang === "fa" ? "این شناسه کاربری تلگرام قبلاً در دیتابیس ثبت شده است." : "This Telegram User ID already exists in the bot database.");
      return;
    }
    setUsers(prev => [user, ...prev]);
    fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    }).catch(err => console.warn("Failed syncing new user:", err));
  };

  const deleteUser = (userId: number) => {
    setUsers(prev => prev.filter(u => u.userId !== userId));
    setKeys(prev => prev.filter(k => k.userId !== userId));
    fetch("/api/users/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    }).catch(err => console.warn("Failed syncing deleted user:", err));
  };

  const deleteSubscriptionKey = (keyId: string) => {
    const keyObj = keys.find(k => k.id === keyId);
    setKeys(prev => prev.filter(k => k.id !== keyId));
    setUsers(prev => prev.map(u => {
      if (keyObj && u.userId === keyObj.userId) {
        return { ...u, activePlansCount: Math.max(0, u.activePlansCount - 1) };
      }
      return u;
    }));
    if (keyObj) {
      fetch("/api/subscription-keys/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: keyId, userId: keyObj.userId })
      }).catch(err => console.warn("Failed syncing deleted sub config:", err));
    }
  };

  const approveTransaction = (txId: string, correctedAmount?: number) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status !== "pending") return;

    const finalAmount = correctedAmount !== undefined ? correctedAmount : tx.amount;

    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return { 
          ...t, 
          status: "approved" as const, 
          amount: finalAmount, 
          description: (t.description || "") + (lang === "fa" ? " - تایید و شارژ شد" : " - Approved and credited") 
        };
      }
      return t;
    }));
    setUsers(prev => prev.map(u => {
      if (u.userId === tx.userId) {
        return { ...u, walletBalance: u.walletBalance + finalAmount };
      }
      return u;
    }));

    fetch("/api/transactions/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: txId, amount: finalAmount })
    }).then(() => {
      setToastMessage(lang === "fa" ? `✅ فیش با موفقیت تایید و ${finalAmount.toLocaleString()} تومان شارژ شد.` : `✅ Receipt approved & ${finalAmount.toLocaleString()} Tomans credited.`);
      setTimeout(() => setToastMessage(null), 3500);
    }).catch(err => console.warn("Failed syncing approved transaction:", err));
  };

  const rejectTransaction = (txId: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return { ...t, status: "rejected" as const, description: (t.description || "") + (lang === "fa" ? " - فیش نامعتبر رد شد" : " - Invalid slip rejected") };
      }
      return t;
    }));
    fetch("/api/transactions/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: txId })
    }).then(() => {
      setToastMessage(lang === "fa" ? "❌ فیش پرداخت رد شد." : "❌ Payment receipt was rejected.");
      setTimeout(() => setToastMessage(null), 3000);
    }).catch(err => console.warn("Failed syncing rejected transaction:", err));
  };

  const deleteTransaction = (txId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== txId));
    fetch("/api/transactions/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: txId })
    }).catch(err => console.warn("Failed syncing deleted transaction:", err));
  };

  const clearTransactionHistory = () => {
    setTransactions([]);
    fetch("/api/transactions/clear-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }).catch(err => console.warn("Failed syncing cleared transactional logs:", err));
  };

  const saveSettings = (newSettings: PanelSettings) => {
    setSettings(newSettings);
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings)
    }).then(() => {
      setToastMessage(lang === "fa" ? "✅ تنظیمات با موفقیت ذخیره شد." : "✅ Settings saved successfully.");
      setTimeout(() => setToastMessage(null), 3000);
    }).catch(err => {
      console.warn("Failed syncing setting parameter overrides:", err);
      setToastMessage(lang === "fa" ? "❌ خطا در ذخیره تنظیمات." : "❌ Failed to save settings.");
      setTimeout(() => setToastMessage(null), 3000);
    });
  };

  const handleOpenSimulatedChat = (userId: number) => {
    setSimulatedUserId(userId);
    setActiveTab("simulator");
  };

  const addNewTransaction = (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tx)
    }).catch(err => console.warn("Failed syncing added transaction:", err));
  };

  const addNewSubscriptionKey = (key: SubscriptionKey) => {
    setKeys(prev => [key, ...prev]);
    setUsers(prev => prev.map(u => {
      if (u.userId === key.userId) {
        return { ...u, activePlansCount: u.activePlansCount + 1 };
      }
      return u;
    }));
    fetch("/api/subscription-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(key)
    }).catch(err => console.warn("Failed syncing added VPN sub config key:", err));
  };

  const handleResetData = async () => {
    try {
      await fetch("/api/database/reset", { method: "POST" });
    } catch (e) {
      console.warn("Failed reset command on server", e);
    }
    localStorage.clear();
    window.location.reload();
  };

  // Metrics calculators
  const pendingTx = transactions.filter(t => t.status === "pending");
  const totalVolume = transactions
    .filter(t => t.status === "approved")
    .reduce((acc, curr) => acc + curr.amount, 0);

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLoginSuccess={() => setIsAuthenticated(true)} 
        lang={lang} 
        setLang={setLang} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070913] text-gray-100 flex flex-col font-sans select-none antialiased" dir={lang === "fa" ? "rtl" : "ltr"}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a]/95 text-white text-xs md:text-sm font-semibold rounded-xl px-5 py-3 border border-indigo-500/30 shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center gap-2 backdrop-blur-md animate-fade-in transition duration-300">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
      
      {/* Upper Navigation Header */}
      <header className="bg-[#0b0f19] border-b border-[#1f2937] px-4 md:px-6 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl tracking-wide text-white">{t.appTitle}</h1>
                <LionAndSunFlag />
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase">
                  v2.0 PRO
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">{t.appSubtitle}</p>
            </div>
          </div>

          {/* Sync / State actions Panel */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Language Selection Buttons */}
            <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setLang("fa")}
                className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                  lang === "fa" 
                    ? "bg-indigo-600 text-white shadow" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                فارسی
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                  lang === "en" 
                    ? "bg-indigo-600 text-white shadow" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            {/* Left aligned reset & actions */}
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="p-1.5 px-3 rounded-lg border border-slate-700/60 bg-slate-900 text-xs text-gray-400 hover:text-white hover:border-slate-600 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : "animate-spin-hover"}`} />
              {isRefreshing ? (lang === "fa" ? "درحال بروزرسانی..." : "Refreshing...") : t.resetBtn}
            </button>

            {/* Logout button */}
            <button
              onClick={() => {
                localStorage.removeItem("daltoon_dashboard_auth");
                setIsAuthenticated(false);
              }}
              className="p-1.5 px-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 hover:text-white hover:bg-rose-500/20 transition flex items-center gap-1.5 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              {lang === "fa" ? "خروج" : "Logout"}
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-5 space-y-5">
        
        {/* Navigation Tabs Bar */}
        <div className="flex overflow-x-auto border-b border-[#1f2937] no-scrollbar scroll-smooth">
          <div className={`p-1 bg-slate-950 rounded-xl border border-slate-900 flex ${lang === "fa" ? "space-x-reverse" : "space-x"} space-x-1 min-w-max`}>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "dashboard" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                  : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-300" />
              {t.tabOverview}
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "users" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >
              <Users className="w-4 h-4 text-slate-300" />
              {t.tabUsers}
            </button>

            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition relative ${
                activeTab === "transactions" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >
              <CheckSquare className="w-4 h-4 text-slate-300" />
              {t.tabApprovals}
              {pendingTx.length > 0 && (
                <span className={`absolute -top-1 ${lang === "fa" ? "-left-1" : "-right-1"} bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-bounce`}>
                  {pendingTx.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "simulator" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >
              <Bot className="w-4 h-4 text-slate-300" />
              {t.tabSimulator}
            </button>

            <button
              onClick={() => setActiveTab("servers")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "servers" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >
              <Server className="w-4 h-4 text-slate-300" />
              {t.tabServers}
            </button>

            <button
              onClick={() => setActiveTab("buttons")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "buttons" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >
              <Command className="w-4 h-4 text-slate-300" />
              {t.tabBotButtons}
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "settings" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >
              <Settings className="w-4 h-4 text-slate-300" />
              {t.tabSettings}
            </button>
          </div>
        </div>

        {/* Tab Content Renderer Selector */}
        <div className="min-h-[400px]">
          {activeTab === "dashboard" && (
            <DashboardOverview 
              inbounds={inbounds}
              toggleInbound={toggleInbound}
              usersCount={users.length}
              activeSubsCount={keys.filter(k => k.status === "active").length}
              totalIncome={totalVolume}
              pendingTransactionsCount={pendingTx.length}
              transactions={transactions}
              lang={lang}
            />
          )}

          {activeTab === "users" && (
            <UserManagement 
              users={users}
              keys={keys}
              adjustUserWallet={adjustUserWallet}
              toggleUserBan={toggleUserBan}
              addNewUser={addNewUser}
              deleteUser={deleteUser}
              deleteSubscriptionKey={deleteSubscriptionKey}
              addNewSubscriptionKey={addNewSubscriptionKey}
              openSimulatedChat={handleOpenSimulatedChat}
              lang={lang}
            />
          )}

          {activeTab === "transactions" && (
            <TransactionApproval 
              transactions={transactions}
              approveTransaction={approveTransaction}
              rejectTransaction={rejectTransaction}
              deleteTransaction={deleteTransaction}
              clearTransactionHistory={clearTransactionHistory}
              lang={lang}
            />
          )}

          {activeTab === "simulator" && (
            <BotSimulator 
              users={users}
              plans={vpnPlans}
              setVpnPlans={setVpnPlans}
              transactions={transactions}
              keys={keys}
              setKeys={setKeys}
              setUsers={setUsers}
              activeUserId={simulatedUserId}
              setActiveUserId={setSimulatedUserId}
              updateUserBalance={adjustUserWallet}
              addNewTransaction={addNewTransaction}
              addNewSubscriptionKey={addNewSubscriptionKey}
              lang={lang}
              customButtons={customButtons}
              settings={settings}
            />
          )}

          {activeTab === "servers" && (
            <ServerManagement 
              vpnPlans={vpnPlans}
              setVpnPlans={setVpnPlans}
              lang={lang}
            />
          )}

          {activeTab === "buttons" && (
            <BotButtonsPanel 
              settings={settings}
              onSaveSettings={saveSettings}
              lang={lang}
              customButtons={customButtons}
              setCustomButtons={setCustomButtons}
            />
          )}

          {activeTab === "settings" && (
            <SettingsPanel 
              settings={settings}
              onSaveSettings={saveSettings}
              lang={lang}
              customButtons={customButtons}
              setCustomButtons={setCustomButtons}
            />
          )}
        </div>

      </main>

      {/* Styled Minimalist Footer bar */}
      <footer className="bg-[#0b0f19] border-t border-[#1f2937] py-6 text-center text-xs text-gray-500 mt-12 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-6 gap-3">
          <p>{t.footerText}</p>
          <p className="flex items-center gap-1">
            {t.craftedWith} <Heart className="w-3 h-3 text-rose-500 mx-1" />
          </p>
        </div>
      </footer>
    </div>
  );
}
