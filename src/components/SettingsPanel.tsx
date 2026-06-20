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
}

export default function SettingsPanel({
  settings,
  onSaveSettings,
  lang,
  customButtons,
  setCustomButtons
}: SettingsPanelProps) {
  const t = translations[lang];
  // Form state
  const [botToken, setBotToken] = useState(settings.botToken || "");
  const [ownerId, setOwnerId] = useState(settings.ownerId ? settings.ownerId.toString() : "");
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || "");
  
  const [purchaseSuccessNote, setPurchaseSuccessNote] = useState(settings.purchaseSuccessNote || "");
  
  // Broadcast text states
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastStatus, setBroadcastStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Dashboard credentials, Port, and Admins management
  const [dashboardUsername, setDashboardUsername] = useState(settings.dashboardUsername || "Daltoon");
  const [dashboardPassword, setDashboardPassword] = useState(settings.dashboardPassword || "Daltoon10");
  const [serverPort, setServerPort] = useState<number | string>(settings.serverPort || 3000);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | string>(settings.autoRefreshInterval !== undefined ? settings.autoRefreshInterval : 0);


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
      ownerId: parseInt(ownerId) || 0,
      geminiApiKey,
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
      dashboardUsername,
      dashboardPassword,
      serverPort: Number(serverPort) || 3000,
      autoRefreshInterval: Number(autoRefreshInterval) || 0,
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
      ownerId: parseInt(ownerId) || 0,
      geminiApiKey,
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
      dashboardUsername,
      dashboardPassword,
      serverPort: Number(serverPort) || 3000,
      autoRefreshInterval: Number(autoRefreshInterval) || 0,
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

  const [welcomeText, setWelcomeText] = useState(settings.welcomeText || `<b>🛍️ به فروشگاه دالتون بات (Daltoon Bot) خوش آمدید!</b>\n\nبهترین و معتبرترین پلن‌ها و اشتراک‌ها را با تحویل آنی و ضمانت بازگشت وجه تهیه فرمایید.\n\n🆔 شناسه تلگرام شما: <code>{tg_id}</code>\n💰 موجودی کیف پول: <code>{wallet_balance}</code> تومان\n\n👇 لطفا گزینه مورد نظر خود را از منوی زیر انتخاب نمایید:`);
  
  const [supportText, setSupportText] = useState(settings.supportText || `📞 <b>پشتیبانی دالتون بات (Daltoon Bot):</b>\n\nمشتری گرامی! در صورت وجود هرگونه سوال، پیگیری خرید یا پشتیبانی قبل و بعد از فروش در خدمت شما هستیم.\n\n👤 پشتیبانی تلگرام: @daltoon_support\n📢 کانال تلگرام دالتون بات: @daltoon_store\n\nپاسخگویی فعال: ۲۴ ساعته شبانه‌روز`);

  const [tgChannel, setTgChannel] = useState(settings.tgChannel || "@daltoon_channel");
  const [supportHandle, setSupportHandle] = useState(settings.supportHandle || "@daltoon_owner");

  const [hideSupport, setHideSupport] = useState(!!settings.hideSupport);
  const [hideBuy, setHideBuy] = useState(!!settings.hideBuy);
  const [hideProfile, setHideProfile] = useState(!!settings.hideProfile);
  const [hideWallet, setHideWallet] = useState(!!settings.hideWallet);

  // Advanced Payment Gateways and Extras
  const [gatewayPlisioWallet, setGatewayPlisioWallet] = useState(settings.gatewayPlisioWallet || "");
  const [gatewayNowpaymentsKey, setGatewayNowpaymentsKey] = useState(settings.gatewayNowpaymentsKey || "");
  const [gatewayCryptomusKey, setGatewayCryptomusKey] = useState(settings.gatewayCryptomusKey || "");
  const [gatewayCryptomusMerchantId, setGatewayCryptomusMerchantId] = useState(settings.gatewayCryptomusMerchantId || "");
  const [gatewayHeleketWallet, setGatewayHeleketWallet] = useState(settings.gatewayHeleketWallet || "");
  const [gatewayStarsStatus, setGatewayStarsStatus] = useState(settings.gatewayStarsStatus !== undefined ? settings.gatewayStarsStatus : true);
  const [autoWarningConfigBtn, setAutoWarningConfigBtn] = useState(settings.autoWarningConfigBtn !== undefined ? settings.autoWarningConfigBtn : true);

  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      botToken,
      ownerId: parseInt(ownerId) || 0,
      geminiApiKey,
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
      dashboardUsername,
      dashboardPassword,
      serverPort: Number(serverPort) || 3000,
      autoRefreshInterval: Number(autoRefreshInterval) || 0,
      purchaseSuccessNote,
      admins: adminsList,
      gatewayPlisioWallet,
      gatewayNowpaymentsKey,
      gatewayCryptomusKey,
      gatewayCryptomusMerchantId,
      gatewayHeleketWallet,
      gatewayStarsStatus,
      autoWarningConfigBtn
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

            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.geminiApiKeyLabel}</label>
              <input
                type="text"
                placeholder="AIzaSy..."
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-indigo-300 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
              <span className="text-[10px] text-gray-400 mt-1 block">{t.geminiApiKeyDesc}</span>
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
                onChange={(e) => setServerPort(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {lang === "fa" ? "تغییر پورت پس از اجرای مجدد." : "Requires restart."}
              </span>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "رفرش خودکار داشبورد (ثانیه)" : "Auto Refresh (Seconds)"}
              </label>
              <input
                type="number"
                min="0"
                max="3600"
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-indigo-300 focus:ring-1 focus:ring-indigo-500 font-mono"
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {lang === "fa" ? "صفر یعنی غیرفعال" : "0 means disabled"}
                {autoRefreshInterval !== "" && Number(autoRefreshInterval) > 0 && typeof autoRefreshInterval === "number" && (
                  <span className="text-emerald-400 font-medium block mt-1">
                    {lang === "fa" 
                      ? `${Math.floor(autoRefreshInterval / 60) > 0 ? `${Math.floor(autoRefreshInterval / 60)} دقیقه ` : ""}${autoRefreshInterval % 60 > 0 ? `${autoRefreshInterval % 60} ثانیه` : ""}`
                      : `${Math.floor(autoRefreshInterval / 60) > 0 ? `${Math.floor(autoRefreshInterval / 60)} min ` : ""}${autoRefreshInterval % 60 > 0 ? `${autoRefreshInterval % 60} sec` : ""}`}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Admin Management Section */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-semibold text-gray-300">
              {lang === "fa" ? "👥 مدیریت ادمین‌های بات و دالتون بات" : "👥 Manage Bot & Dashboard Admins"}
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

        {/* Electronic Payment Gateways */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            {lang === "fa" ? "درگاه‌های پرداخت الکترونیک و سرویس‌ها" : "Electronic Gateways & Services"}
          </h3>
          <p className="text-xs text-gray-400">
            {lang === "fa" 
              ? "مدیریت حرفه‌ای کلیدهای پرداخت ارزی، کریپتو و تنظیمات اتوماسیون (تمامی کلیدها به صورت امن نگهداری می‌شوند)." 
              : "Professional management of crypto keys and automation mechanisms."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "آدرس کیف پول Plisio (تتر TRC20/TON)" : "Plisio Wallet Base"}
              </label>
              <input
                type="text"
                placeholder="TXABC..."
                className="w-full bg-[#1f2937] border border-gray-700/80 rounded-lg p-2.5 text-xs text-indigo-300 focus:ring-1 focus:ring-indigo-500 font-mono"
                value={gatewayPlisioWallet}
                onChange={(e) => setGatewayPlisioWallet(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "کد امنیتی NowPayments (API Key)" : "NowPayments API Key"}
              </label>
              <input
                type="text"
                placeholder="NP-xxxxxxxx..."
                className="w-full bg-[#1f2937] border border-gray-700/80 rounded-lg p-2.5 text-xs text-indigo-300 focus:ring-1 focus:ring-indigo-500 font-mono"
                value={gatewayNowpaymentsKey}
                onChange={(e) => setGatewayNowpaymentsKey(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "کد امنیتی Cryptomus (API Key)" : "Cryptomus Key"}
              </label>
              <input
                type="password"
                placeholder="************"
                className="w-full bg-[#1f2937] border border-gray-700/80 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 font-mono"
                value={gatewayCryptomusKey}
                onChange={(e) => setGatewayCryptomusKey(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "نشان تجاری Cryptomus (Merchant ID)" : "Cryptomus Merchant"}
              </label>
              <input
                type="text"
                placeholder="xxxx-xxxx-xxxx"
                className="w-full bg-[#1f2937] border border-gray-700/80 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 font-mono"
                value={gatewayCryptomusMerchantId}
                onChange={(e) => setGatewayCryptomusMerchantId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "درگاه پرداخت Heleket (توکن / آدرس)" : "Heleket Token"}
              </label>
              <input
                type="text"
                placeholder="HK-ABC..."
                className="w-full bg-[#1f2937] border border-gray-700/80 rounded-lg p-2.5 text-xs text-indigo-300 focus:ring-1 focus:ring-indigo-500 font-mono"
                value={gatewayHeleketWallet}
                onChange={(e) => setGatewayHeleketWallet(e.target.value)}
              />
            </div>

            <div className="flex flex-col justify-center space-y-4 pt-2 border-t border-[#1f2937] md:border-t-0 md:pt-0">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-indigo-500 bg-gray-700 border-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-800"
                  checked={gatewayStarsStatus}
                  onChange={(e) => setGatewayStarsStatus(e.target.checked)}
                />
                <span className="text-xs text-gray-300 font-medium">
                  {lang === "fa" ? "پشتیبانی از درگاه Telegram Stars (ستاره‌های تلگرام)" : "Enable Gateway: Telegram Stars"}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-rose-500 bg-gray-700 border-gray-600 focus:ring-rose-500 focus:ring-offset-gray-800"
                  checked={autoWarningConfigBtn}
                  onChange={(e) => setAutoWarningConfigBtn(e.target.checked)}
                />
                <span className="text-xs text-gray-300 font-medium whitespace-nowrap">
                  {lang === "fa" ? "فعال‌سازی ارسال اخطار اتمام سرویس (۱ گیگ یا ۱ روز مانده)" : "Send expiry limits warning before 1 Day/1GB"}
                </span>
              </label>
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
