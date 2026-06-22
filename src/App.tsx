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
  Command,
  Gift,
  Menu,
  Briefcase,
  X,
  Clock,
  Tag,
  MessageSquare
} from "lucide-react";

// Types & Data
import { PanelSettings, InboundInfo, User, Transaction, VpnPlan, SubscriptionKey, CustomButton, GiftCode, PromoCode, Ticket, PlanCategory } from "./types";
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
import ColleaguesManagement from "./components/ColleaguesManagement";
import SettingsPanel from "./components/SettingsPanel";
import BotButtonsPanel from "./components/BotButtonsPanel";
import GiftCodeManager from "./components/GiftCodeManager";
import TicketManager from "./components/TicketManager";
import BotLogs from "./components/BotLogs";
import { LoginScreen } from "./components/LoginScreen";
import ConfirmationModal from "./components/ConfirmationModal";
import SetupModal from "./components/SetupModal";

const LionAndSunFlag = () => {
  return (
    <div className="inline-flex items-center select-none" title="درَفش شَهباز (پرچم کوروش بزرگ)">
      <svg width="34" height="34" viewBox="0 0 100 100" fill="none" className="rounded-md overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.6)] border border-yellow-600/50 transition duration-300 hover:scale-110 shrink-0">
        <defs>
          <radialGradient id="royalRed" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#9C0000" />
            <stop offset="60%" stopColor="#6E0000" />
            <stop offset="100%" stopColor="#3A0000" />
          </radialGradient>
          <linearGradient id="goldSovereign" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF4D0" />
            <stop offset="30%" stopColor="#FFD54F" />
            <stop offset="70%" stopColor="#FB8C00" />
            <stop offset="100%" stopColor="#8D6E63" />
          </linearGradient>
          <linearGradient id="goldInner" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E5A93B" />
            <stop offset="50%" stopColor="#FFD54F" />
            <stop offset="100%" stopColor="#FFE082" />
          </linearGradient>
          <filter id="goldGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Deep rich crimson/burgundy background */}
        <rect width="100" height="100" fill="url(#royalRed)" />

        {/* Texture detail line pattern overlay (subtle royal pattern) */}
        <rect fill="none" stroke="url(#goldSovereign)" strokeWidth="0.8" className="opacity-70" x="2.5" y="2.5" width="95" height="95" />
        <rect fill="none" stroke="url(#goldSovereign)" strokeWidth="0.3" className="opacity-40" x="5.5" y="5.5" width="89" height="89" />

        {/* --- BORDER OF GOLDEN TRIANGLES (POINTING INWARDS) --- */}
        {/* Top edge pointing down */}
        {Array.from({ length: 15 }).map((_, i) => {
          const step = 88 / 15;
          const x1 = 6 + i * step;
          const x2 = 6 + (i + 1) * step;
          const xc = x1 + step / 2;
          return <polygon key={`t-${i}`} points={`${x1},5.5 ${x2},5.5 ${xc},9.5`} fill="url(#goldSovereign)" />;
        })}
        {/* Bottom edge pointing up */}
        {Array.from({ length: 15 }).map((_, i) => {
          const step = 88 / 15;
          const x1 = 6 + i * step;
          const x2 = 6 + (i + 1) * step;
          const xc = x1 + step / 2;
          return <polygon key={`b-${i}`} points={`${x1},94.5 ${x2},94.5 ${xc},90.5`} fill="url(#goldSovereign)" />;
        })}
        {/* Left edge pointing right */}
        {Array.from({ length: 15 }).map((_, i) => {
          const step = 88 / 15;
          const y1 = 6 + i * step;
          const y2 = 6 + (i + 1) * step;
          const yc = y1 + step / 2;
          return <polygon key={`l-${i}`} points={`5.5,${y1} 5.5,${y2} 9.5,${yc}`} fill="url(#goldSovereign)" />;
        })}
        {/* Right edge pointing left */}
        {Array.from({ length: 15 }).map((_, i) => {
          const step = 88 / 15;
          const y1 = 6 + i * step;
          const y2 = 6 + (i + 1) * step;
          const yc = y1 + step / 2;
          return <polygon key={`r-${i}`} points={`94.5,${y1} 94.5,${y2} 90.5,${yc}`} fill="url(#goldSovereign)" />;
        })}

        {/* --- ROYAL GOLD SHAHBAZ (THE CYRUS STANDARD EAGLE-FALCON) --- */}
        <g filter="url(#goldGlow)">
          {/* 1. Golden Disc above Head */}
          <circle cx="50" cy="22.5" r="4.5" fill="url(#goldSovereign)" />
          <circle cx="50" cy="22.5" r="3.2" fill="url(#goldInner)" />

          {/* 2. Shahbaz main body */}
          {/* Head & elegant beak facing right */}
          <path d="M 48 29 C 48 29, 45 30, 45 33 C 45 35, 47 36, 49 35.5 C 50.5 35, 52 35.5, 53.5 35 C 55 34.5, 56.5 33, 56.5 31 C 56.5 29, 54.5 29, 54.5 29 C 54.5 29, 56.5 27, 54.5 27 C 52.5 27, 51.5 28.5, 48 29 Z" fill="url(#goldSovereign)" />
          {/* Eye detail */}
          <circle cx="51.5" cy="31" r="0.8" fill="#540202" />
          <circle cx="51.5" cy="31" r="0.3" fill="#FFFED0" />

          {/* Detailed crown or small crest feathers on neck */}
          <path d="M 47.5 28 C 47.5 28, 46 26.5, 48 27 C 50 27.5, 48 29, 48 29 Z" fill="url(#goldInner)" />

          {/* 3. Horizontal Wing spreads left & right (Symmetric feather layers) */}
          {/* Left Wing upper curve */}
          <path d="M 48 37 C 35 34, 25 31, 14 36 C 14 36, 17 48, 26 48 L 47 43 Z" fill="url(#goldSovereign)" />
          {/* Left Wing feather details */}
          <path d="M 14.5 38.5 Q 24 38, 45.5 44" stroke="#783400" strokeWidth="0.5" fill="none" opacity="0.6" />
          <path d="M 16.5 41 Q 25 41, 44 45.5" stroke="#783400" strokeWidth="0.5" fill="none" opacity="0.6" />
          <path d="M 18.5 43.5 Q 26 43, 42.5 47" stroke="#783400" strokeWidth="0.5" fill="none" opacity="0.6" />

          {/* Beautiful gold stylized inner layers of feathers */}
          {Array.from({ length: 6 }).map((_, i) => {
            const rot = i * 2.5;
            return (
              <path
                key={`lw-${i}`}
                d="M 47 42 C 43 45, 25 43, 17 45.5 C 19 48, 30 49, 46 44.5 C 46 44.5, 46 43, 47 42 Z"
                fill="url(#goldInner)"
                transform={`rotate(${rot} 47 42)`}
                opacity="0.9"
              />
            );
          })}

          {/* Right Wing upper curve */}
          <path d="M 52 37 C 65 34, 75 31, 86 36 C 86 36, 83 48, 74 48 L 53 43 Z" fill="url(#goldSovereign)" />
          {/* Right Wing feather details */}
          <path d="M 85.5 38.5 Q 76 38, 54.5 44" stroke="#783400" strokeWidth="0.5" fill="none" opacity="0.6" />
          <path d="M 83.5 41 Q 75 41, 56 45.5" stroke="#783400" strokeWidth="0.5" fill="none" opacity="0.6" />
          <path d="M 81.5 43.5 Q 74 43, 57.5 47" stroke="#783400" strokeWidth="0.5" fill="none" opacity="0.6" />

          {/* Right wing feather layers */}
          {Array.from({ length: 6 }).map((_, i) => {
            const rot = -i * 2.5;
            return (
              <path
                key={`rw-${i}`}
                d="M 53 42 C 57 45, 75 43, 83 45.5 C 81 48, 70 49, 54 44.5 C 54 44.5, 54 43, 53 42 Z"
                fill="url(#goldInner)"
                transform={`rotate(${rot} 53 42)`}
                opacity="0.9"
              />
            );
          })}

          {/* 4. Elegant ribbed tall body torso */}
          <path d="M 46 36 C 46 36, 44 47, 43 62 C 43 62, 50 67, 57 62 C 56 47, 54 36, 54 36 Z" fill="url(#goldSovereign)" stroke="#5D4037" strokeWidth="0.3" />
          
          {/* Torso golden horizontal ribbing details */}
          {Array.from({ length: 9 }).map((_, i) => {
            const y = 39 + i * 2.6;
            const w = 8 - Math.abs(5 - i) * 0.45;
            return (
              <path
                key={`rib-${i}`}
                d={`M ${50 - w/2} ${y} Q 50 ${y + 0.8} ${50 + w/2} ${y}`}
                stroke="#5D4037"
                strokeWidth="0.65"
                fill="none"
              />
            );
          })}

          {/* 5. Imperial flared Tail Standard */}
          <path d="M 46.5 63 C 46.5 63, 44 76, 41 78.5 C 44 79, 56 79, 59 78.5 C 56 76, 53.5 63, 53.5 63 Z" fill="url(#goldSovereign)" />
          {/* Tail vertical gold details */}
          <g opacity="0.8">
            <line x1="50" y1="63" x2="50" y2="78.5" stroke="#783400" strokeWidth="0.6" />
            <line x1="48" y1="63.5" x2="45.5" y2="77.5" stroke="#783400" strokeWidth="0.5" />
            <line x1="52" y1="63.5" x2="54.5" y2="77.5" stroke="#783400" strokeWidth="0.5" />
            <line x1="46" y1="64" x2="42.5" y2="76" stroke="#783400" strokeWidth="0.4" />
            <line x1="54" y1="64" x2="57.5" y2="76" stroke="#783400" strokeWidth="0.4" />
          </g>
          {/* Intersecting design curve at base of tail */}
          <path d="M 41 78.5 Q 50 75.5 59 78.5" stroke="url(#goldInner)" strokeWidth="0.8" fill="none" />

          {/* 6. Powerful legs/talons holding golden circular elements */}
          {/* Left leg */}
          <path d="M 45 56 Q 36 67, 24.5 73.5" stroke="url(#goldSovereign)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M 45 56 Q 36 67, 24.5 73.5" stroke="url(#goldInner)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <circle cx="23" cy="74.5" r="4" fill="url(#goldSovereign)" stroke="#5D4037" strokeWidth="0.4" />
          <circle cx="23" cy="74.5" r="2.5" fill="url(#goldInner)" />

          {/* Right leg */}
          <path d="M 55 56 Q 64 67, 75.5 73.5" stroke="url(#goldSovereign)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M 55 56 Q 64 67, 75.5 73.5" stroke="url(#goldInner)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <circle cx="77" cy="74.5" r="4" fill="url(#goldSovereign)" stroke="#5D4037" strokeWidth="0.4" />
          <circle cx="77" cy="74.5" r="2.5" fill="url(#goldInner)" />
        </g>
      </svg>
    </div>
  );
};


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
  const [planCategories, setPlanCategories] = useState<PlanCategory[]>([]);

  const [colleaguePackages, setColleaguePackages] = useState<any[]>(() => {
    const cached = localStorage.getItem("daltoon_colleague_packages");
    return cached ? JSON.parse(cached) : [];
  });

  const [colleagueAccounts, setColleagueAccounts] = useState<any[]>(() => {
    const cached = localStorage.getItem("daltoon_colleague_accounts");
    return cached ? JSON.parse(cached) : [];
  });

  const [logs, setLogs] = useState<any[]>(() => {
    const cached = localStorage.getItem("daltoon_logs");
    return cached ? JSON.parse(cached) : [];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const isAuth = localStorage.getItem("daltoon_dashboard_auth") === "true";
    const lastInteraction = parseInt(localStorage.getItem("daltoon_last_interaction") || "0", 10);
  // Auto-logout if more than 24 hours passed since last interaction
    if (isAuth && (Date.now() - lastInteraction > 86400000)) {
      localStorage.removeItem("daltoon_dashboard_auth");
      return false;
    }
    return isAuth;
  });

  const [customButtons, setCustomButtons] = useState<CustomButton[]>(() => {
    const cached = localStorage.getItem("daltoon_custom_buttons");
    if (cached) return JSON.parse(cached);
    return [
      { id: "cb_gift", text: "🎁 تست رایگان ۲ ساعته", replyText: "کاربر گرامی، بدین وسیله یک اکانت تست ۲ ساعته با حجم ۲۰۰ مگابایت برای شما تولید شد:\n\nvless://f39281a1-9b1d-4050-b498-3882aef1277a@example.com:2052?security=reality&sni=google.com&fp=chrome#GiftTest" },
      { id: "cb_channel", text: "📢 کانال تلگرام", replyText: "دوست گرامی! برای عضویت در گروه حل مشکلات و مطلع شدن از آخرین اخبار و پایداری شبکه روی پیوند زیر ضربه بزنید:\n\n👉 @example_channel" }
    ];
  });

  const [giftCodes, setGiftCodes] = useState<GiftCode[]>(() => {
    const cached = localStorage.getItem("daltoon_gift_codes");
    return cached ? JSON.parse(cached) : [];
  });

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => {
    const cached = localStorage.getItem("daltoon_promo_codes");
    return cached ? JSON.parse(cached) : [];
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const cached = localStorage.getItem("daltoon_tickets");
    return cached ? JSON.parse(cached) : [];
  });

  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "transactions" | "simulator" | "servers" | "colleagues" | "buttons" | "giftcodes" | "promocodes" | "tickets" | "logs" | "settings" | "guide" | "xui_connector">(() => {
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
  
  const [appVersion, setAppVersion] = useState("2.0.0");
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated && settings && (!settings.botToken || settings.botToken.trim() === "" || settings.botToken === "DUMMY_TOKEN")) {
      setShowSetupModal(true);
    } else {
      setShowSetupModal(false);
    }
  }, [isAuthenticated, settings?.botToken]);

  useEffect(() => {
    fetch("/api/system/check-update")
      .then(res => res.json())
      .then(data => {
        if (data.version) setAppVersion(data.version);
        if (data.updateAvailable) setUpdateAvailable(true);
      })
      .catch(err => console.warn("Check update failed", err));
  }, []);

  const handleUpdate = () => {
    setShowUpdateConfirm(true);
  };

  const executeUpdate = () => {
    setShowUpdateConfirm(false);
    setIsUpdating(true);
    setToastMessage(lang === "fa" ? "در حال بروزرسانی..." : "Updating...");
    fetch("/api/system/update", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setToastMessage(lang === "fa" ? "✅ بروزرسانی موفق. در حال راه‌اندازی مجدد..." : "✅ Update success. Restarting...");
          setTimeout(() => window.location.reload(), 4000);
        } else {
          setToastMessage(lang === "fa" ? "❌ خطا در بروزرسانی: " + (data.error || "") : "❌ Update failed.");
          setIsUpdating(false);
        }
      })
      .catch((err) => {
        setToastMessage(lang === "fa" ? "❌ خطا در برقراری ارتباط برای بروزرسانی" : "❌ Communication error during update.");
        setIsUpdating(false);
      });
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(() => {
    return parseInt(localStorage.getItem("daltoon_last_interaction") || String(Date.now()), 10);
  });

  // Inactivity timeout (24 hours)
  useEffect(() => {
    const checkTimeout = () => {
      if (isAuthenticated && Date.now() - lastInteraction > 86400000) {
        console.log("[Daltoon Session] Expired after 24h inactivity");
        localStorage.removeItem("daltoon_dashboard_auth");
        setIsAuthenticated(false);
      }
    };
    const interval = setInterval(checkTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAuthenticated, lastInteraction]);

  useEffect(() => {
    let timeout: any;
    const handleActivity = () => {
      if (timeout) return;
      timeout = setTimeout(() => {
        const now = Date.now();
        setLastInteraction(now);
        localStorage.setItem("daltoon_last_interaction", String(now));
        timeout = null;
      }, 5000); // Only update once every 5 seconds
    };
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);
    
    // Initial save
    localStorage.setItem("daltoon_last_interaction", String(Date.now()));
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  // Close sidebar on tab change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeTab]);

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

  useEffect(() => {
    localStorage.setItem("daltoon_gift_codes", JSON.stringify(giftCodes));
  }, [giftCodes]);

  useEffect(() => {
    localStorage.setItem("daltoon_promo_codes", JSON.stringify(promoCodes));
  }, [promoCodes]);

  useEffect(() => {
    localStorage.setItem("daltoon_tickets", JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem("daltoon_colleague_packages", JSON.stringify(colleaguePackages));
  }, [colleaguePackages]);

  useEffect(() => {
    localStorage.setItem("daltoon_colleague_accounts", JSON.stringify(colleagueAccounts));
  }, [colleagueAccounts]);

  useEffect(() => {
    localStorage.setItem("daltoon_logs", JSON.stringify(logs));
  }, [logs]);

  const refreshData = async (isAuto: boolean = false) => {
    if (!isAuto) setIsRefreshing(true);
    try {
      const response = await fetch("/api/data");
      const json = await response.json();
      if (json.success) {
        // Deep comparison optimization to prevent unnecessary re-renders and localStorage writes
        const updateIfChanged = (setter: any, current: any, next: any) => {
          if (JSON.stringify(current) !== JSON.stringify(next)) {
            setter(next);
          }
        };

        if (json.users) updateIfChanged(setUsers, users, json.users);
        if (json.transactions) updateIfChanged(setTransactions, transactions, json.transactions);
        if (json.keys) updateIfChanged(setKeys, keys, json.keys);
        if (json.vpnPlans) updateIfChanged(setVpnPlans, vpnPlans, json.vpnPlans);
        if (json.plan_categories) updateIfChanged(setPlanCategories, planCategories, json.plan_categories);
        if (json.inbounds) updateIfChanged(setInbounds, inbounds, json.inbounds);
        if (json.customButtons) updateIfChanged(setCustomButtons, customButtons, json.customButtons);
        if (json.giftCodes) updateIfChanged(setGiftCodes, giftCodes, json.giftCodes);
        if (json.promoCodes) updateIfChanged(setPromoCodes, promoCodes, json.promoCodes);
        if (json.tickets) updateIfChanged(setTickets, tickets, json.tickets);
        if (json.colleaguePackages) updateIfChanged(setColleaguePackages, colleaguePackages, json.colleaguePackages);
        if (json.colleagueAccounts) updateIfChanged(setColleagueAccounts, colleagueAccounts, json.colleagueAccounts);
        if (json.logs) updateIfChanged(setLogs, logs, json.logs);
        
        if (json.settings && 'botToken' in json.settings) {
          updateIfChanged(setSettings, settings, json.settings);
        }
        
        if (!isAuto) {
          console.log("[Full-Stack Sync] JSON database refreshed successfully.");
          setToastMessage(lang === "fa" ? "✅ اطلاعات داشبورد با موفقیت بروزرسانی شد." : "✅ Dashboard data refreshed successfully.");
          setTimeout(() => {
            setToastMessage(null);
          }, 3000);
        }
      }
    } catch (err) {
      console.warn("[Full-Stack Sync] Failed connecting to Express Database.", err);
      if (!isAuto) {
        setToastMessage(lang === "fa" ? "❌ خطا در دریافت اطلاعات از سرور." : "❌ Failed refreshing data from server.");
        setTimeout(() => {
          setToastMessage(null);
        }, 3000);
      }
    } finally {
      if (!isAuto) setIsRefreshing(false);
    }
  };

  // Fetch complete SQLite database state on mount and update automatically
  useEffect(() => {
    refreshData(false);
  }, []);

  useEffect(() => {
    if (settings?.autoRefreshInterval && settings.autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        refreshData(true);
      }, settings.autoRefreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [settings?.autoRefreshInterval]);

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

  const handleAddPromoCode = (code: string, type: "percent" | "extend_days", value: number, maxUsage: number) => {
    const nextCode = {
      id: Math.random().toString(36).substring(2, 9),
      code,
      type,
      value,
      maxUsage,
      totalUsage: 0,
      usedBy: [],
      createdAt: new Date().toISOString()
    };
    setPromoCodes(prev => [nextCode, ...prev]);

    fetch("/api/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextCode)
    }).then(() => refreshData())
      .catch(err => console.warn(err));
  };

  const handleDeletePromoCode = (id: string) => {
    setPromoCodes(prev => prev.filter(p => p.id !== id));
    fetch("/api/promo-codes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    }).then(() => refreshData())
      .catch(err => console.warn(err));
  };

  const handleReplyTicket = (ticketId: string, replyMessage: string) => {
    fetch("/api/tickets/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, reply: replyMessage })
    }).then(res => res.json())
      .then(data => {
        if (data.success) {
          refreshData();
        }
      })
      .catch(err => console.warn(err));
  };

  const handleCloseTicket = (ticketId: string) => {
    fetch("/api/tickets/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId })
    }).then(res => res.json())
      .then(data => {
        if (data.success) {
          refreshData();
        }
      })
      .catch(err => console.warn(err));
  };

  const handleDeleteTicket = (ticketId: string) => {
    fetch("/api/tickets/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId })
    }).then(res => res.json())
      .then(data => {
        if (data.success) {
          refreshData();
        }
      })
      .catch(err => console.warn(err));
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

  const toggleSubscriptionKey = (keyId: string) => {
    const key = keys.find(k => k.id === keyId);
    if (!key) return;
    const nextStatus = key.status === "active" ? "suspended" : "active";
    
    setKeys(prev => prev.map(k => {
      if (k.id === keyId) return { ...k, status: nextStatus };
      return k;
    }));

    // If user's active count changes
    setUsers(prev => prev.map(u => {
      if (u.userId === key.userId) {
        let count = keys.filter(sk => sk.userId === u.userId && sk.status === "active").length;
        if (nextStatus === "active") count++; else count--;
        return { ...u, activePlansCount: Math.max(0, count) };
      }
      return u;
    }));

    fetch("/api/subscription-keys/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: keyId, status: nextStatus })
    }).catch(err => console.warn("Failed syncing toggled sub config:", err));
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

  const handleSetupComplete = (updates: Partial<PanelSettings>) => {
    const newSettings = { ...settings, ...updates };
    saveSettings(newSettings);
    setShowSetupModal(false);
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
      
      {showSetupModal && <SetupModal lang={lang} onComplete={handleSetupComplete} />}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a]/95 text-white text-xs md:text-sm font-semibold rounded-xl px-5 py-3 border border-indigo-500/30 shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center gap-2 backdrop-blur-md animate-fade-in transition duration-300">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
      
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div 
        className={`fixed top-0 bottom-0 ${lang === "fa" ? "right-0 border-l" : "left-0 border-r"} w-72 bg-[#0b0f19] border-[#1f2937] z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl ${
          isSidebarOpen ? "translate-x-0" : (lang === "fa" ? "translate-x-full" : "-translate-x-full")
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#1f2937]">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-white tracking-wider flex items-center gap-2 whitespace-nowrap">
              <span>{t.appTitle}</span>
              <LionAndSunFlag />
            </h2>
            <button 
              onClick={() => {
                refreshData();
                setIsSidebarOpen(false);
              }}
              className="p-1.5 ms-2 bg-gray-800/50 hover:bg-gray-700/60 rounded-full text-indigo-400 hover:text-indigo-300 transition shadow-sm border border-gray-700/50"
              title={lang === 'fa' ? 'بروزرسانی داده‌ها' : 'Refresh Data'}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-white" : ""}`} />
            </button>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white transition cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition ${
                activeTab === "dashboard" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              {t.tabOverview}
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition ${
                activeTab === "users" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-4 h-4" />
              {t.tabUsers}
            </button>

            <button
              onClick={() => setActiveTab("transactions")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition relative ${
                activeTab === "transactions" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              {t.tabApprovals}
              {pendingTx.length > 0 && (
                <span className={`absolute ${lang === "fa" ? "left-4" : "right-4"} bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce`}>
                  {pendingTx.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("simulator")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition ${
                activeTab === "simulator" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Bot className="w-4 h-4" />
              {t.tabSimulator}
            </button>

            <button
              onClick={() => setActiveTab("servers")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition ${
                activeTab === "servers" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Server className="w-4 h-4" />
              {t.tabServers}
            </button>

            <button
              onClick={() => setActiveTab("colleagues")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition ${
                activeTab === "colleagues" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              {t.tabColleagues}
            </button>

            <button
              onClick={() => setActiveTab("buttons")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition ${
                activeTab === "buttons" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Command className="w-4 h-4" />
              {t.tabBotButtons}
            </button>
            <button
              onClick={() => setActiveTab("giftcodes")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition ${
                activeTab === "giftcodes" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Gift className="w-4 h-4" />
              {lang === "fa" ? "کدهای هدیه" : "Gift Codes"}
            </button>

            <button
              onClick={() => setActiveTab("tickets")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition relative ${
                activeTab === "tickets" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {lang === "fa" ? "سیستم تیکت" : "Support Tickets"}
              {tickets.filter(t => t.status === "open").length > 0 && (
                <span className={`absolute ${lang === "fa" ? "left-4" : "right-4"} bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse`}>
                  {tickets.filter(t => t.status === "open").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition ${
                activeTab === "logs" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Clock className="w-4 h-4" />
              {lang === "fa" ? "وضعیت سیستم" : "System Status"}
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition ${
                activeTab === "settings" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="w-4 h-4" />
              {t.tabSettings}
            </button>
        </div>

        <div className="p-4 border-t border-[#1f2937]">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => {
                localStorage.removeItem("daltoon_dashboard_auth");
                setIsAuthenticated(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              {lang === "fa" ? "خروج" : "Logout"}
            </button>

            {updateAvailable && (
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer border border-emerald-500/30 animate-pulse"
              >
                {isUpdating ? (lang === "fa" ? "کمی صبر..." : "Wait...") : (lang === "fa" ? "آپدیت ⬇" : "Update ⬇")}
              </button>
            )}
          </div>
          
          <div className="text-center space-y-1">
            <div className="text-gray-500 text-xs font-mono">v{appVersion} PRO</div>
            <div className="text-gray-400 text-xs">
              {lang === "fa" ? "توسعه دهنده توسط " : "Developer by "}
              <a href="https://t.me/mDaltoon" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                mDaltoon
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Upper Navigation Header */}
      <header dir={lang === "fa" ? "rtl" : "ltr"} className="bg-[#0b0f19] border-b border-[#1f2937] px-4 md:px-6 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Brand Header & Hamburger */}
          <div className="flex items-center gap-3 flex-1 justify-start">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-400 hover:text-white transition cursor-pointer">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="cursor-pointer flex items-center gap-2 flex-shrink-0" onClick={() => setIsSidebarOpen(true)}>
                <h1 className="font-display font-bold text-lg sm:text-xl md:text-2xl tracking-wide text-white whitespace-nowrap">{t.appTitle}</h1>
                <LionAndSunFlag />
              </div>
            </div>
          </div>

          {/* Sync / State actions Panel */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            {/* Language Selection Buttons */}
            <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs flex-shrink-0">
              <button
                onClick={() => setLang("fa")}
                className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                  lang === "fa" 
                    ? "bg-indigo-600 text-white shadow" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                فا
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
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-5 space-y-5">

        {/* Tab Content Renderer Selector */}
        <div className="min-h-[400px]">
          {activeTab === "dashboard" && (
            <DashboardOverview 
              inbounds={inbounds}
              toggleInbound={toggleInbound}
              usersCount={users.length}
              activeSubsCount={keys.filter(k => k.status === "active" && !k.planName.includes("تست رایگان")).length}
              totalIncome={totalVolume}
              pendingTransactionsCount={pendingTx.length}
              transactions={transactions}
              logs={logs}
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
              toggleSubscriptionKey={toggleSubscriptionKey}
              addNewSubscriptionKey={addNewSubscriptionKey}
              openSimulatedChat={handleOpenSimulatedChat}
              lang={lang}
              settings={settings}
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
              tickets={tickets}
              setTickets={setTickets}
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
              planCategories={planCategories}
              setPlanCategories={setPlanCategories}
              lang={lang}
              settings={settings}
              onSaveSettings={saveSettings}
              inbounds={inbounds}
              setInbounds={setInbounds}
            />
          )}

          {activeTab === "colleagues" && (
            <div className="p-4 md:p-6 pb-24">
              <ColleaguesManagement
                 packages={colleaguePackages}
                 accounts={colleagueAccounts}
                 setPackages={setColleaguePackages}
                 setAccounts={setColleagueAccounts}
                 lang={lang}
              />
            </div>
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

          {activeTab === "giftcodes" && (
            <GiftCodeManager 
              giftCodes={giftCodes}
              onAddCode={async (code, amount, maxUsage) => {
                const response = await fetch("/api/gift-codes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code, amount, maxUsage })
                });
                const data = await response.json();
                if (data.success) {
                  setGiftCodes(prev => [...prev, data.item]);
                }
              }}
              onEditCode={async (id, code, amount, maxUsage) => {
                const response = await fetch("/api/gift-codes/edit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id, code, amount, maxUsage })
                });
                const data = await response.json();
                if (data.success) {
                  setGiftCodes(prev => prev.map(c => c.id === id ? data.item : c));
                }
              }}
              onDeleteCode={async (id) => {
                const response = await fetch("/api/gift-codes/delete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id })
                });
                const data = await response.json();
                if (data.success) {
                  setGiftCodes(prev => prev.filter(c => c.id !== id));
                }
              }}
              promoCodes={promoCodes}
              onAddPromoCode={handleAddPromoCode}
              onDeletePromoCode={handleDeletePromoCode}
              settings={settings}
              onSaveSettings={saveSettings}
              lang={lang}
            />
          )}

          {activeTab === "tickets" && (
            <TicketManager
              tickets={tickets}
              onReplyTicket={handleReplyTicket}
              onCloseTicket={handleCloseTicket}
              onDeleteTicket={handleDeleteTicket}
              lang={lang}
            />
          )}

          {activeTab === "logs" && (
            <BotLogs logs={logs} lang={lang} />
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

          <ConfirmationModal 
            isOpen={showUpdateConfirm}
            message={lang === "fa" ? "آیا از بروزرسانی سیستم مطمئن هستید؟ توجه: سیستم مدتی در دسترس نخواهد بود." : "Are you sure you want to update the system? Note: It will be unavailable during restart."}
            onConfirm={executeUpdate}
            onCancel={() => setShowUpdateConfirm(false)}
            lang={lang}
          />
        </div>

      </main>
    </div>
  );
}
