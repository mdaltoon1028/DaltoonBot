import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Bot, 
  Settings, 
  Server, 
  RefreshCw, 
  Globe, 
  Heart,
  Link2
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
import SettingsPanel from "./components/SettingsPanel";
import ConnectionGuide from "./components/ConnectionGuide";
import XuiConnector from "./components/XuiConnector";

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

  const [customButtons, setCustomButtons] = useState<CustomButton[]>(() => {
    const cached = localStorage.getItem("daltoon_custom_buttons");
    if (cached) return JSON.parse(cached);
    return [
      { id: "cb_gift", text: "🎁 تست رایگان ۲ ساعته", replyText: "کاربر گرامی، بدین وسیله یک اکانت تست ۲ ساعته با حجم ۲۰۰ مگابایت برای شما تولید شد:\n\nvless://f39281a1-9b1d-4050-b498-3882aef1277a@m.daltoon-server.ir:2052?security=reality&sni=google.com&fp=chrome#Daltoon-GiftTest" },
      { id: "cb_channel", text: "📢 کانال تلگرام", replyText: "دوست گرامی! برای عضویت در گروه حل مشکلات و مطلع شدن از آخرین اخبار و پایداری شبکه روی پیوند زیر ضربه بزنید:\n\n👉 @daltoon_channel" }
    ];
  });

  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "transactions" | "simulator" | "settings" | "guide" | "xui_connector">("dashboard");
  const [simulatedUserId, setSimulatedUserId] = useState<number>(6536288293); // Admin is initial active
  const [apiOnline, setApiOnline] = useState(true);

  const t = translations[lang];

  // Sync to localStorage
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
    localStorage.setItem("daltoon_custom_buttons", JSON.stringify(customButtons));
  }, [customButtons]);

  // Fetch complete SQLite database state on mount
  useEffect(() => {
    async function fetchDb() {
      try {
        const response = await fetch("/api/data");
        const json = await response.json();
        if (json.success) {
          if (json.users && json.users.length > 0) setUsers(json.users);
          if (json.transactions) setTransactions(json.transactions);
          if (json.keys) setKeys(json.keys);
          if (json.inbounds && json.inbounds.length > 0) setInbounds(json.inbounds);
          if (json.customButtons && json.customButtons.length > 0) setCustomButtons(json.customButtons);
          if (json.settings && json.settings.botToken) setSettings(json.settings);
          console.log("[Full-Stack Sync] SQLite bot_database.db synced successfully.");
        }
      } catch (err) {
        console.warn("[Full-Stack Sync] Failed connecting to Express Database. Running on local simulator cache.", err);
      }
    }
    fetchDb();
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
    const confirmMsg = lang === "fa" 
      ? "آیا از حذف این کاربر اطمینان دارید؟ تمام کانفیگ‌های مرتبط با این کاربر نیز از دیتابیس حذف خواهند شد."
      : "Are you sure you want to delete this user? All associated VPN configs will also be deleted from the database.";
    if (confirm(confirmMsg)) {
      setUsers(prev => prev.filter(u => u.userId !== userId));
      setKeys(prev => prev.filter(k => k.userId !== userId));
      fetch("/api/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      }).catch(err => console.warn("Failed syncing deleted user:", err));
    }
  };

  const deleteSubscriptionKey = (keyId: string) => {
    const confirmMsg = lang === "fa"
      ? "آیا از حذف این کانفیگ و ابطال اشتراک اطمینان دارید؟"
      : "Are you sure you want to delete this subscription log and revoke access?";
    if (confirm(confirmMsg)) {
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
    }
  };

  const approveTransaction = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status !== "pending") return;

    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return { ...t, status: "approved" as const, description: (t.description || "") + (lang === "fa" ? " - تایید و شارژ شد" : " - Approved and credited") };
      }
      return t;
    }));
    adjustUserWallet(tx.userId, tx.amount);

    fetch("/api/transactions/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: txId })
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
    }).catch(err => console.warn("Failed syncing rejected transaction:", err));
  };

  const deleteTransaction = (txId: string) => {
    const confirmMsg = lang === "fa"
      ? "آیا از حذف این درخواست رسید از تاریخچه اطمینان دارید؟"
      : "Are you sure you want to delete this transaction ledger entry?";
    if (confirm(confirmMsg)) {
      setTransactions(prev => prev.filter(t => t.id !== txId));
      fetch("/api/transactions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: txId })
      }).catch(err => console.warn("Failed syncing deleted transaction:", err));
    }
  };

  const clearTransactionHistory = () => {
    const confirmMsg = lang === "fa"
      ? "آیا از پاک کردن کامل تاریخچه تراکنش‌ها و فیش‌ها اطمینان دارید؟ این عمل غیرقابل بازگشت است."
      : "Are you sure you want to completely clear the card receipt and transaction ledger? This action cannot be undone.";
    if (confirm(confirmMsg)) {
      setTransactions([]);
      fetch("/api/transactions/clear-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }).catch(err => console.warn("Failed syncing cleared transactional logs:", err));
    }
  };

  const saveSettings = (newSettings: PanelSettings) => {
    setSettings(newSettings);
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings)
    }).catch(err => console.warn("Failed syncing setting parameter overrides:", err));
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

  const handleResetData = () => {
    const warningText = lang === "fa" 
      ? "آیا از بازنشانی کامل دیتابیس و تنظیمات اولیه اطمینان دارید؟ تمام تغییرات شما از بین خواهد رفت." 
      : "Are you sure you want to restore default initial database? This clears local changes.";
    if (confirm(warningText)) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Metrics calculators
  const pendingTx = transactions.filter(t => t.status === "pending");
  const totalVolume = transactions
    .filter(t => t.status === "approved")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="min-h-screen bg-[#070913] text-gray-100 flex flex-col font-sans select-none antialiased" dir={lang === "fa" ? "rtl" : "ltr"}>
      
      {/* Upper Navigation Header */}
      <header className="bg-[#0b0f19] border-b border-[#1f2937] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl tracking-wide text-white">{t.appTitle}</h1>
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

            <div className="flex items-center gap-2 text-xs bg-slate-900 border border-[#1f2937] px-3 py-1.5 rounded-lg font-mono">
              <span className={`h-2 w-2 rounded-full ${apiOnline ? "bg-emerald-400 inline-block animate-pulse" : "bg-rose-500"}`}></span>
              {t.portLabel}: <span className="text-indigo-300 font-semibold">3000 (LOCAL)</span>
            </div>

            <button
              onClick={handleResetData}
              className="p-1.5 px-3 rounded-lg border border-slate-700/60 bg-slate-900 text-xs text-gray-400 hover:text-white hover:border-slate-600 transition flex items-center gap-1.5 cursor-pointer"
              title="Reset Cache Database"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t.resetBtn}
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
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

            <button
              onClick={() => setActiveTab("xui_connector")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "xui_connector" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                  : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >
              <Server className="w-4 h-4 text-slate-300" />
              {lang === "fa" ? "اتصال به پنل ۳x-ui و دکمه‌ها" : "3x-ui Panel & Buttons"}
            </button>

            <button
              onClick={() => setActiveTab("guide")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "guide" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                  : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >
              <Link2 className="w-4 h-4 text-slate-300" />
              {t.tabGuide}
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
              plans={initialPlans}
              transactions={transactions}
              keys={keys}
              activeUserId={simulatedUserId}
              setActiveUserId={setSimulatedUserId}
              updateUserBalance={adjustUserWallet}
              addNewTransaction={addNewTransaction}
              addNewSubscriptionKey={addNewSubscriptionKey}
              lang={lang}
              customButtons={customButtons}
            />
          )}

          {activeTab === "settings" && (
            <SettingsPanel 
              settings={settings}
              onSaveSettings={saveSettings}
              lang={lang}
            />
          )}

          {activeTab === "xui_connector" && (
            <XuiConnector 
              lang={lang}
              customButtons={customButtons}
              setCustomButtons={setCustomButtons}
            />
          )}

          {activeTab === "guide" && (
            <ConnectionGuide 
              lang={lang}
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
