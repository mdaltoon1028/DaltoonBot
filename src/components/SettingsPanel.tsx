import React, { useState, useEffect } from "react";
import { PanelSettings, CustomButton, VpnPlan, InboundInfo } from "../types";
import { Language, translations } from "../locales";
import { 
  Settings, 
  Key, 
  Database, 
  CreditCard, 
  Lock, 
  Save, 
  Check, 
  FileText, 
  Cpu,
  PlusCircle,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Command,
  Send,
  Power,
  Activity,
  RefreshCw
} from "lucide-react";

interface SettingsPanelProps {
  settings: PanelSettings;
  onSaveSettings: (settings: PanelSettings) => void;
  lang: Language;
  customButtons: CustomButton[];
  setCustomButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
  inbounds: InboundInfo[];
  setInbounds: React.Dispatch<React.SetStateAction<InboundInfo[]>>;
}

export default function SettingsPanel({
  settings,
  onSaveSettings,
  lang,
  customButtons,
  setCustomButtons,
  inbounds,
  setInbounds
}: SettingsPanelProps) {
  const t = translations[lang];
  // Form state
  const [botToken, setBotToken] = useState(settings.botToken || "");
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || "");
  const [panelUrl, setPanelUrl] = useState(settings.panelUrl || "");
  const [panelUsername, setPanelUsername] = useState(settings.panelUsername || "");
  const [panelPassword, setPanelPassword] = useState(settings.panelPassword || "");
  const [ownerId, setOwnerId] = useState(settings.ownerId ? settings.ownerId.toString() : "");
  
  const [purchaseSuccessNote, setPurchaseSuccessNote] = useState(settings.purchaseSuccessNote || "");
  
  // Real-time 3x-ui connection states
  const [panelConnectionActive, setPanelConnectionActive] = useState<boolean>(!!settings.panelConnectionActive);
  const [testStatus, setTestStatus] = useState<{ type: "success" | "error" | "loading" | "idle"; message: string }>({ type: "idle", message: "" });
  
  const [checkedInboundIds, setCheckedInboundIds] = useState<number[]>(() => {
    return settings.activeInboundIds || [];
  });

  const handleTestConnection = async (forceUrlCheck?: string, forceUserCheck?: string, forcePassCheck?: string) => {
    setTestStatus({ type: "loading", message: lang === "fa" ? "در حال اتصال به پنل و بررسی احراز هویت..." : "Connecting to panel and validating authentication..." });
    try {
      const response = await fetch("/api/xui/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: forceUrlCheck || baseUrl,
          panelUsername: forceUserCheck || panelUsername,
          panelPassword: forcePassCheck || panelPassword
        })
      });
      const data = await response.json();
      if (data.success) {
        setTestStatus({ type: "success", message: data.message });
        if (Array.isArray(data.inbounds)) {
          setInbounds(data.inbounds);
          // If no active inbounds were selected, auto-select all found ones
          if (checkedInboundIds.length === 0) {
            setCheckedInboundIds(data.inbounds.map((ib: any) => ib.id));
          }
        }
        return true;
      } else {
        setTestStatus({ type: "error", message: data.error });
        return false;
      }
    } catch (err: any) {
      setTestStatus({ type: "error", message: lang === "fa" ? "خطا در برقراری ارتباط با هاست سرور." : "Could not connect to host server." });
      return false;
    }
  };

  // Broadcast text states
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastStatus, setBroadcastStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Dashboard credentials, Port, and Admins management
  const [dashboardUsername, setDashboardUsername] = useState(settings.dashboardUsername || "Daltoon");
  const [dashboardPassword, setDashboardPassword] = useState(settings.dashboardPassword || "Daltoon10");
  const [serverPort, setServerPort] = useState(settings.serverPort || 3000);
  const [adminsList, setAdminsList] = useState<Array<{id: string, userId: number, username: string, role: "admin" | "super_admin", createdAt: string}>>(() => {
    return settings.admins || [];
  });
  const [newAdminUser, setNewAdminUser] = useState("");
  const [newAdminId, setNewAdminId] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "super_admin">("admin");

  const handleAddAdmin = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newAdminUser.trim() || !newAdminId.trim()) return;

    const added: typeof adminsList[0] = {
      id: "adm-" + Date.now(),
      userId: Number(newAdminId) || 0,
      username: newAdminUser.replace("@", "").trim(),
      role: newAdminRole,
      createdAt: new Date().toISOString().split("T")[0]
    };

    const nextAdmins = [...adminsList, added];
    setAdminsList(nextAdmins);
    setNewAdminUser("");
    setNewAdminId("");

    // Auto-save on admin addition
    onSaveSettings({
      ...settings,
      botToken,
      baseUrl,
      panelUrl,
      panelUsername,
      panelPassword,
      ownerId: parseInt(ownerId) || 0,
      cardNumber,
      cardHolder: bankOwner,
      bankName,
      welcomeText,
      supportText,
      tgChannel,
      supportHandle,
      hideSupport,
      hideBuy,
      hideProfile,
      hideWallet,
      panelConnectionActive,
      activeInboundIds: checkedInboundIds,
      dashboardUsername,
      dashboardPassword,
      serverPort: Number(serverPort) || 3000,
      purchaseSuccessNote,
      admins: nextAdmins
    });
  };

  const handleRemoveAdmin = (id: string) => {
    const nextAdmins = adminsList.filter(adm => adm.id !== id);
    setAdminsList(nextAdmins);

    // Auto-save on admin removal
    onSaveSettings({
      ...settings,
      botToken,
      baseUrl,
      panelUrl,
      panelUsername,
      panelPassword,
      ownerId: parseInt(ownerId) || 0,
      cardNumber,
      cardHolder: bankOwner,
      bankName,
      welcomeText,
      supportText,
      tgChannel,
      supportHandle,
      hideSupport,
      hideBuy,
      hideProfile,
      hideWallet,
      panelConnectionActive,
      activeInboundIds: checkedInboundIds,
      dashboardUsername,
      dashboardPassword,
      serverPort: Number(serverPort) || 3000,
      purchaseSuccessNote,
      admins: nextAdmins
    });
  };

  const handleSendBroadcast = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    setIsBroadcasting(true);
    setBroadcastStatus(null);
    try {
      const response = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: broadcastText.trim() })
      });
      const data = await response.json();
      if (data.success) {
        setBroadcastStatus({
          type: "success",
          msg: lang === "fa" 
            ? `📣 پیام همگانی با موفقیت برای تمامی کاربران فعال ارسال شد (${data.count || 0} پیام ارسالی).` 
            : `📣 Broadcast message dispatched successfully to all ${data.count || 0} registered users!`
        });
        setBroadcastText("");
      } else {
        setBroadcastStatus({
          type: "error",
          msg: data.error || "Failed sending broadcast."
        });
      }
    } catch (err) {
      setBroadcastStatus({
        type: "error",
        msg: "Failed connecting to server."
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Custom Bot Configurable fields
  const [cardNumber, setCardNumber] = useState(settings.cardNumber || "");
  const [bankName, setBankName] = useState(settings.bankName || "");
  const [bankOwner, setBankOwner] = useState(settings.cardHolder || "");

  const [welcomeText, setWelcomeText] = useState(settings.welcomeText || `<b>🛍️ به فروشگاه دالتون استور (Daltoon Store) خوش آمدید!</b>\n\nبهترین و معتبرترین پلن‌ها و اشتراک‌ها را با تحویل آنی و ضمانت بازگشت وجه تهیه فرمایید.\n\n🆔 شناسه تلگرام شما: <code>{tg_id}</code>\n💰 موجودی کیف پول: <code>{wallet_balance}</code> تومان\n\n👇 لطفا گزینه مورد نظر خود را از منوی زیر انتخاب نمایید:`);
  
  const [supportText, setSupportText] = useState(settings.supportText || `📞 <b>پشتیبانی دالتون استور (Daltoon Store):</b>\n\nمشتری گرامی! در صورت وجود هرگونه سوال، پیگیری خرید یا پشتیبانی قبل و بعد از فروش در خدمت شما هستیم.\n\n👤 پشتیبانی تلگرام: @daltoon_support\n📢 کانال تلگرام دالتون استور: @daltoon_store\n\nپاسخگویی فعال: ۲۴ ساعته شبانه‌روز`);

  const [tgChannel, setTgChannel] = useState(settings.tgChannel || "@daltoon_channel");
  const [supportHandle, setSupportHandle] = useState(settings.supportHandle || "@daltoon_owner");

  const [hideSupport, setHideSupport] = useState(!!settings.hideSupport);
  const [hideBuy, setHideBuy] = useState(!!settings.hideBuy);
  const [hideProfile, setHideProfile] = useState(!!settings.hideProfile);
  const [hideWallet, setHideWallet] = useState(!!settings.hideWallet);
  
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      botToken,
      baseUrl,
      panelUrl,
      panelUsername,
      panelPassword,
      ownerId: parseInt(ownerId) || 0,
      cardNumber,
      cardHolder: bankOwner,
      bankName,
      welcomeText,
      supportText,
      tgChannel,
      supportHandle,
      hideSupport,
      hideBuy,
      hideProfile,
      hideWallet,
      panelConnectionActive,
      activeInboundIds: checkedInboundIds,
      dashboardUsername,
      dashboardPassword,
      serverPort: Number(serverPort) || 3000,
      purchaseSuccessNote,
      admins: adminsList
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div id="settings-tab" className="max-w-4xl mx-auto space-y-6">

      {/* Broadcast Message Card */}
      <div className="bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-indigo-500/20 p-5 rounded-xl space-y-4 shadow-sm">
        <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          {lang === "fa" ? "📣 ارسال اطلاعیه همگانی (برادکست)" : "📣 Send Telegram Broadcast Message"}
        </h3>
        <p className="text-xs text-gray-400">
          {lang === "fa" 
            ? "متن اطلاعیه، پیام یا بنر تبلیغاتی خود را بنویسید تا مستقیماً به چت تمام اعضای تعامل‌یافته با بازخورد سریع ربات ارسال گردد." 
            : "Compose and dispatch an official announcement, discount code, or network status update to all registered Telegram bot users."}
        </p>

        <div className="space-y-3">
          <textarea
            rows={3}
            placeholder={lang === "fa" ? "مثلا: 🚨 به روزرسانی سرورها انجام شد؛ برای دریافت اکانت جدید به پشتیبانی مراجعه فرمایید." : "e.g., Server maintenance completed successfully!"}
            className="w-full bg-[#111827] border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 font-sans"
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
          />

          {broadcastStatus && (
            <div className={`p-3 rounded-lg text-xs leading-relaxed ${
              broadcastStatus.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {broadcastStatus.msg}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSendBroadcast}
              disabled={isBroadcasting || !broadcastText.trim()}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                broadcastText.trim()
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isBroadcasting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  {lang === "fa" ? "در حال ارسال..." : "Broadcasting..."}
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  {lang === "fa" ? "ارسال پیام به تمامی اعضا" : "Broadcast Message to All"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Telegram Bot Details */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            {t.botSettingsTitle}
          </h3>
          <p className="text-xs text-gray-400">{t.botSettingsDesc}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.botTokenLabel}</label>
              <input
                type="text"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-indigo-300 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.ownerAdminIdLabel}</label>
              <input
                type="text"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white font-mono focus:ring-1 focus:ring-indigo-500"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.webhookStatusLabel}</label>
              <div className="flex items-center gap-2 bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-emerald-400 font-semibold font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {t.pollingActive}
              </div>
            </div>


          </div>
        </div>

        {/* Sanaei 3x-ui Panel direct API integration setup */}
        <div className="bg-gradient-to-br from-[#0c1020] to-[#121c35] border border-indigo-500/20 p-6 rounded-2xl space-y-6 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  {lang === "fa" ? "🔌 تنظیمات و احراز هویت پنل ۳x-ui" : "🔌 Sanaei 3x-ui Panel Direct API Connection"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {lang === "fa" 
                    ? "اطلاعات پنل سنایی نسخه ۳x-ui را برای ساخت خودکار و فوری اکانت‌های سابسکریپشن کلاینت وارد کنید."
                    : "Configure direct integration with your Sanaei 3x-ui panel to automate instant outbound client subscription deliveries."}
                </p>
              </div>
            </div>

            {/* Toggle switch for panel mode */}
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={panelConnectionActive}
                onChange={(e) => setPanelConnectionActive(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="mr-2 ml-2 text-xs font-semibold text-gray-300">
                {lang === "fa" ? "وضعیت سرویس" : "Service Status"}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "آدرس کامل پنل (همراه با پورت و آدرس اخصاصی)" : "Panel Base URL (including Port & Path prefix)"}
              </label>
              <input
                type="text"
                className="w-full bg-[#13192e] border border-gray-700 rounded-lg p-2.5 text-sm text-indigo-300 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="e.g. https://m.daltoon-server.ir:8443/Daltoon"
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  setPanelUrl(e.target.value); // Sync with panelUrl
                }}
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {lang === "fa" ? "نکته: حتماً پروتکل (http/https)، پورت و در صورت وجود، آدرس فرعی (مثل Daltoon/) را بنویسید." : "Note: Must include protocol, port, and any URL path prefix exactly as defined in your panel."}
              </span>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "نام کاربری پنل (Username)" : "Panel Username"}
              </label>
              <input
                type="text"
                className="w-full bg-[#13192e] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                placeholder="admin"
                value={panelUsername}
                onChange={(e) => setPanelUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "کلمه عبور پنل (Password) یا توکن" : "Panel Password or Token"}
              </label>
              <input
                type="password"
                className="w-full bg-[#13192e] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                placeholder="••••••••"
                value={panelPassword}
                onChange={(e) => setPanelPassword(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleTestConnection()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 border border-indigo-400/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testStatus.type === "loading" ? "animate-spin" : ""}`} />
                {lang === "fa" ? "استعلام و اتصال به پنل" : "Check & Connect Panel"}
              </button>
            </div>
          </div>

          {/* Test connection status alert feedback box */}
          {testStatus.type !== "idle" && (
            <div className={`p-3 rounded-lg text-xs leading-relaxed ${
              testStatus.type === "success" 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                : testStatus.type === "loading"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 animate-pulse"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
            }`}>
              <div className="flex items-center gap-1.5 font-medium">
                {testStatus.type === "success" && <Check className="w-4 h-4 shrink-0 text-emerald-400" />}
                {testStatus.type === "loading" && <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0"></span>}
                <span>{testStatus.message}</span>
              </div>
            </div>
          )}

          {/* Direct 3x-ui Inbounds selection checklist */}
          {panelConnectionActive && (
            <div className="bg-slate-950/50 rounded-xl p-4 border border-indigo-500/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    {lang === "fa" ? "اینباندهای فعال برای ساخت اکانت کلاینت" : "Selected Active Outbounds for Clients"}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {lang === "fa" 
                      ? "تیک بزنید تا اکانت کلاینت به طور همزمان روی تمامی اینباندهای تیک‌خورده ساخته شود." 
                      : "Check the inbounds that the customer should be automatically configured on."}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCheckedInboundIds(inbounds.map(ib => ib.id))}
                    className="text-[9px] px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded cursor-pointer transition"
                  >
                    {lang === "fa" ? "گزینش همه" : "Select All"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckedInboundIds([])}
                    className="text-[9px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded cursor-pointer transition"
                  >
                    {lang === "fa" ? "لغو همه" : "Deselect All"}
                  </button>
                </div>
              </div>

              {inbounds.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-500">
                    {lang === "fa" 
                      ? "⚠️ هیچ اینباندی دریافت نشد. برای لود مجدد، روی دکمه «استعلام و اتصال به پنل» بالا کلیک کنید." 
                      : "⚠️ No inbounds retrieved yet. Click 'Check & Connect Panel' to sync live ones."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto no-scrollbar pr-1 pt-1">
                  {inbounds.map((ib) => {
                    const isChecked = checkedInboundIds.includes(ib.id);
                    return (
                      <label 
                        key={ib.id} 
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                          isChecked 
                            ? "bg-indigo-950/20 border-indigo-500/40 shadow-xs shadow-indigo-500/5 hover:border-indigo-500/60" 
                            : "bg-[#111827] border-gray-800 hover:border-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCheckedInboundIds(prev => [...prev, ib.id]);
                            } else {
                              setCheckedInboundIds(prev => prev.filter(id => id !== ib.id));
                            }
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-xs text-white truncate font-display">{ib.remark}</span>
                            <span className="px-1.5 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-[8px] font-bold font-mono rounded uppercase">
                              {ib.protocol}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-2 text-[9px] text-gray-500 font-mono leading-tight">
                            <div>Port: <span className="text-indigo-400 font-bold">{ib.port}</span></div>
                            <div>Clients: <span className="text-white">{ib.totalClients}</span></div>
                            <div className="col-span-2">Used: <span className="text-amber-400">{ib.trafficUsed} GB</span> / {ib.trafficLimit === "unlimited" ? (lang === "fa" ? "نامحدود" : "unlimited") : `${ib.trafficLimit} GB`}</div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dashboard Security and Admin Management */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-400" />
            {lang === "fa" ? "امنیت داشبورد و کنترل ادمین‌ها" : "Dashboard Security & Admins Control"}
          </h3>
          <p className="text-xs text-gray-400">
            {lang === "fa" 
              ? "نام کاربری، رمز عبور ورود، پورت اجرایی سرور و ادمین‌های مجاز بات دالتون را تنظیم نمایید:" 
              : "Set dashboard login, server listening port, and registered Telegram bot/dashboard sub-admins:"}
          </p>
          
          {/* Main Credentials & Port Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-800 pb-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{lang === "fa" ? "نام کاربری ورود داشبورد" : "Dashboard Login User"}</label>
              <input
                type="text"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 font-mono"
                value={dashboardUsername}
                onChange={(e) => setDashboardUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{lang === "fa" ? "رمز عبور ورود داشبورد" : "Dashboard Login Pass"}</label>
              <input
                type="text"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 font-mono"
                value={dashboardPassword}
                onChange={(e) => setDashboardPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "پورت سرور لینوکس" : "Linux Server Port"}
              </label>
              <input
                type="number"
                min="1"
                max="65535"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-indigo-300 focus:ring-1 focus:ring-indigo-500 font-mono"
                value={serverPort}
                onChange={(e) => setServerPort(Number(e.target.value))}
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {lang === "fa" ? "تغییر پورت پس از راه‌اندازی مجدد سرور لینوکس اعمال می‌شود." : "Requires server binary restart to take effect."}
              </span>
            </div>
          </div>

          {/* Admin Management Section */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-semibold text-gray-300">
              {lang === "fa" ? "👥 مدیریت ادمین‌های بات و دالتون استور" : "👥 Manage Bot & Dashboard Admins"}
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Add form */}
              <div className="lg:col-span-5 bg-[#0b101d] border border-gray-800/60 p-4 rounded-xl space-y-3.5">
                <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
                  {lang === "fa" ? "👤 ثبت ادمین جدید" : "👤 Register New Admin"}
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">{lang === "fa" ? "نام کاربری ادمین (بدون @)" : "Admin Username (No @)"}</label>
                    <input
                      type="text"
                      className="w-full bg-[#13192e] border border-slate-800 rounded-lg p-2 text-xs text-white"
                      placeholder="e.g. daltoon_admin"
                      value={newAdminUser}
                      onChange={(e) => setNewAdminUser(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">{lang === "fa" ? "شناسه عددی تلگرام ادمین" : "Telegram User ID"}</label>
                    <input
                      type="text"
                      className="w-full bg-[#13192e] border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                      placeholder="e.g. 504192821"
                      value={newAdminId}
                      onChange={(e) => setNewAdminId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">{lang === "fa" ? "سطح دسترسی" : "Admin Privilege Role"}</label>
                    <select
                      className="w-full bg-[#13192e] border border-slate-800 rounded-lg p-2 text-xs text-white outline-none cursor-pointer"
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value as "admin" | "super_admin")}
                    >
                      <option value="admin">{lang === "fa" ? "ادمین معمولی" : "General Admin"}</option>
                      <option value="super_admin">{lang === "fa" ? "سوپر ادمین" : "Super Admin"}</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddAdmin}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    {lang === "fa" ? "افزودن به لیست ادمین‌ها" : "Add to Admins List"}
                  </button>
                </div>
              </div>

              {/* List table */}
              <div className="lg:col-span-7 bg-[#0b101d] border border-gray-800/60 p-4 rounded-xl flex flex-col justify-between max-h-[290px] overflow-y-auto">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-400 flex justify-between items-center uppercase tracking-wider">
                    <span>{lang === "fa" ? "لیست ادمین‌های فعال" : "Registered Admins List"}</span>
                    <span className="bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-mono">{adminsList.length}</span>
                  </span>

                  <div className="space-y-2 mt-2 max-h-[190px] overflow-y-auto no-scrollbar pr-1">
                    {adminsList.map((adm) => (
                      <div key={adm.id} className="bg-[#111827] border border-gray-800/80 p-2.5 rounded-lg flex items-center justify-between gap-3 shadow-xs">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white flex items-center gap-1">
                            <span>@{adm.username}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold tracking-wider uppercase ${
                              adm.role === "super_admin" 
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25"
                            }`}>
                              {adm.role}
                            </span>
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {adm.userId} • {adm.createdAt}</p>
                        </div>

                        {adminsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmin(adm.id)}
                            className="text-rose-400 hover:text-white hover:bg-rose-500/15 p-1 rounded transition cursor-pointer shrink-0"
                            title="Remove Admin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card instruction parameters */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            {t.cardPaymentTitle}
          </h3>
          <p className="text-xs text-gray-400">{t.cardPaymentDesc}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.cardNumberLabel}</label>
              <input
                type="text"
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm font-semibold text-white font-mono focus:ring-1 focus:ring-indigo-500"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.bankNameLabel}</label>
              <input
                type="text"
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.holderNameLabel}</label>
              <input
                type="text"
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                value={bankOwner}
                onChange={(e) => setBankOwner(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Telegram Bot Message & Layout Customization */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            {lang === "fa" ? "سفارشی‌سازی متن‌ها و دکمه‌های ربات تلگرام" : "Telegram Bot Message & Button Customization"}
          </h3>
          <p className="text-xs text-gray-400">
            {lang === "fa" 
              ? "بدون نیاز به ویرایش فایل‌های پایتون در سرور لینوکس، متن‌های اصلی و دکمه‌های فعال ربات را سفارشی کنید." 
              : "Customize primary bot responses and visibility of buttons without editing Python files directly."}
          </p>

          <div className="space-y-4 pt-2">
            {/* Telegram Channel and Support Handle config block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-800/60 pb-4 mb-2">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                  {lang === "fa" ? "📢 آیدی کانال تلگرام (مثال: @daltoon_channel)" : "📢 Telegram Channel ID (e.g., @daltoon_channel)"}
                </label>
                <input
                  type="text"
                  placeholder="@daltoon_channel"
                  className="w-full bg-[#1b2230] border border-gray-700/80 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 font-medium"
                  value={tgChannel}
                  onChange={(e) => setTgChannel(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                  {lang === "fa" ? "👤 آیدی پشتیبان فنی تلگرام (مثال: @daltoon_owner)" : "👤 Technical Support Handle (e.g., @daltoon_owner)"}
                </label>
                <input
                  type="text"
                  placeholder="@daltoon_owner"
                  className="w-full bg-[#1b2230] border border-gray-700/80 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 font-medium"
                  value={supportHandle}
                  onChange={(e) => setSupportHandle(e.target.value)}
                />
              </div>
            </div>

            {/* Welcome text */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "متن خوش‌آمدگویی استارت ربات (/start)" : "Welcome Message Text (/start)"}
              </label>
              <textarea
                rows={4}
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-yellow-100 focus:ring-1 focus:ring-indigo-500 font-mono"
                value={welcomeText}
                onChange={(e) => setWelcomeText(e.target.value)}
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {lang === "fa" 
                  ? "نکته: می‌توانید از کدهای {tg_id} برای نمایش آیدی کاربری و {wallet_balance} برای نمایش مانده اعتبار استفاده کنید. قالب‌بندی HTML مجاز است."
                  : "Tip: Use {tg_id} for user's ID and {wallet_balance} for wallet credit. HTML tags are supported."}
              </span>
            </div>

            {/* Support text */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "متن دکمه پشتیبانی فنی" : "Support Button Content"}
              </label>
              <textarea
                rows={4}
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-indigo-200 focus:ring-1 focus:ring-indigo-500 font-mono"
                value={supportText}
                onChange={(e) => setSupportText(e.target.value)}
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {lang === "fa" ? "نکته: قالب‌بندی HTML مجاز است." : "Tip: HTML tags are supported."}
              </span>
            </div>

            {/* Purchase success note text */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "📝 توضیحات پیوست پس از تحویل اکانت به مشتری" : "📝 Config Delivery Success Note"}
              </label>
              <textarea
                rows={3}
                placeholder={lang === "fa" ? "مثلا: کانال آموزش کلاینت‌ها: @daltoon_setup" : "e.g., Client Tutorial Channel: @daltoon_setup"}
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-emerald-200 focus:ring-1 focus:ring-indigo-500 font-mono"
                value={purchaseSuccessNote}
                onChange={(e) => setPurchaseSuccessNote(e.target.value)}
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {lang === "fa" 
                  ? "نکته: این متن به عنوان راهنما، بلافاصله در زیر کانفیگ صادر شده به مشتری تحویل داده می‌شود."
                  : "Tip: This text will be appended automatically beneath the premium config link upon successful customer checkout."}
              </span>
            </div>

            {/* Configuration button visibility parameters */}
            <div className="border-t border-gray-800 pt-4 mt-2">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-3 font-medium">
                {lang === "fa" ? "مخفی کردن منوهای پیش‌فرض ربات (در صورت نیاز به حذف):" : "Hide Default Bot Buttons (to disable/replace):"}
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 bg-[#1f2937] p-3 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 select-none">
                  <input
                    type="checkbox"
                    className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    checked={hideBuy}
                    onChange={(e) => setHideBuy(e.target.checked)}
                  />
                  <div>
                    <span className="block text-sm font-medium text-white">🛍️ {lang === "fa" ? "مخفی کردن خرید کانفیگ" : "Hide Buy Config"}</span>
                    <span className="block text-[10px] text-gray-500">{lang === "fa" ? "دکمه خرید پلن‌ها پنهان می‌شود" : "Hides the config sales list button"}</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-[#1f2937] p-3 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 select-none">
                  <input
                    type="checkbox"
                    className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    checked={hideProfile}
                    onChange={(e) => setHideProfile(e.target.checked)}
                  />
                  <div>
                    <span className="block text-sm font-medium text-white">👤 {lang === "fa" ? "مخفی کردن اطلاعات حساب" : "Hide My Profile"}</span>
                    <span className="block text-[10px] text-gray-500">{lang === "fa" ? "دکمه پروفایل کاربری پنهان می‌شود" : "Hides user stats and keys list button"}</span>
                  </div>
                </label>

              </div>
            </div>
          </div>
        </div>

        {/* Save footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1f2937]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-500" />
            <span className="text-[10px] uppercase font-mono text-gray-500">{lang === "fa" ? "دیتابیس درگاه محلی: sqlite3 'bot_database.db'" : "Local Cache DB: sqlite3 'bot_database.db'"}</span>
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> {t.parametersFlushed}
              </span>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold cursor-pointer transition shadow-lg"
            >
              <Save className="w-4 h-4" />
              {t.btnSaveConfig}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
