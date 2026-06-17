import React, { useState } from "react";
import { PanelSettings, CustomButton, VpnPlan } from "../types";
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
  Send
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
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || "");
  const [panelUrl, setPanelUrl] = useState(settings.panelUrl || "");
  const [panelUsername, setPanelUsername] = useState(settings.panelUsername || "");
  const [panelPassword, setPanelPassword] = useState(settings.panelPassword || "");
  const [ownerId, setOwnerId] = useState(settings.ownerId ? settings.ownerId.toString() : "");
  
  // Custom keyboard and notes states
  const [keyboardLayout, setKeyboardLayout] = useState<"horizontal" | "vertical" | "stepped">(settings.keyboardLayout || "stepped");
  const [purchaseSuccessNote, setPurchaseSuccessNote] = useState(settings.purchaseSuccessNote || "");

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

    setAdminsList(prev => [...prev, added]);
    setNewAdminUser("");
    setNewAdminId("");
  };

  const handleRemoveAdmin = (id: string) => {
    setAdminsList(prev => prev.filter(adm => adm.id !== id));
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
  
  const [btnTextBuy, setBtnTextBuy] = useState(settings.btnTextBuy || "🛍️ خرید کانفیگ (Our Plans)");
  const [btnTextProfile, setBtnTextProfile] = useState(settings.btnTextProfile || "👤 اطلاعات حساب (My Profile)");
  const [btnTextWallet, setBtnTextWallet] = useState(settings.btnTextWallet || "💳 شارژ کیف پول (Top-up Wallet)");
  const [btnTextSupport, setBtnTextSupport] = useState(settings.btnTextSupport || "📞 پشتیبانی فنی (Support)");
  
  const [saved, setSaved] = useState(false);

  // States for adding custom buttons inside settings
  const [btnText, setBtnText] = useState("");
  const [btnReplyText, setBtnReplyText] = useState("");
  const [buttonError, setButtonError] = useState("");
  const [buttonSuccess, setButtonSuccess] = useState(false);
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);


  const handleAddButton = async (e: React.MouseEvent) => {
    e.preventDefault();
    setButtonError("");
    setButtonSuccess(false);

    if (!btnText.trim()) {
      setButtonError(lang === "fa" ? "عنوان دکمه نمی‌تواند خالی باشد." : "Button text cannot be empty.");
      return;
    }
    if (!btnReplyText.trim()) {
      setButtonError(lang === "fa" ? "پاسخ ربات نمی‌تواند خالی باشد." : "Bot reply response text cannot be empty.");
      return;
    }

    // Check duplicates but exclude current editing button
    if (customButtons.some(b => b.text === btnText.trim() && b.id !== editingButtonId)) {
      setButtonError(lang === "fa" ? "این دکمه قبلاً ایجاد شده است." : "A button with this exact label already exists.");
      return;
    }

    const buttonIdToUse = editingButtonId || Math.random().toString(36).substring(2, 9);
    const targetBtn: CustomButton = {
      id: buttonIdToUse,
      text: btnText.trim(),
      replyText: btnReplyText.trim()
    };

    try {
      const response = await fetch("/api/custom-buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetBtn)
      });
      if (response.ok) {
        if (editingButtonId) {
          setCustomButtons(prev => prev.map(b => b.id === editingButtonId ? targetBtn : b));
          setEditingButtonId(null);
        } else {
          setCustomButtons(prev => [...prev, targetBtn]);
        }
        setBtnText("");
        setBtnReplyText("");
        setButtonSuccess(true);
        setTimeout(() => setButtonSuccess(false), 3000);
      } else {
        setButtonError(lang === "fa" ? "خطا در برقراری ارتباط با دیتابیس." : "Failed to sync with the database.");
      }
    } catch (err) {
      setButtonError(lang === "fa" ? "خطا در برقراری ارتباط با سرور." : "Network connection failed.");
    }
  };

  const handleDeleteButton = async (id: string) => {
    try {
      const response = await fetch("/api/custom-buttons/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        setCustomButtons(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete button:", err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      botToken,
      baseUrl,
      panelUrl,
      panelUsername,
      panelPassword,
      activeInboundIds: settings.activeInboundIds,
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
      btnTextBuy,
      btnTextProfile,
      btnTextWallet,
      btnTextSupport,
      dashboardUsername,
      dashboardPassword,
      serverPort: Number(serverPort) || 3000,
      keyboardLayout,
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

            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                {lang === "fa" ? "📥 چیدمان کلیدهای کیبورد تلگرام (کاستوم)" : "📥 Telegram Menu Keyboard Layout"}
              </label>
              <select
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500"
                value={keyboardLayout}
                onChange={(e) => setKeyboardLayout(e.target.value as any)}
              >
                <option value="stepped">{lang === "fa" ? "🔘 پلکانی (staggered - پیش فرض)" : "🔘 Stepped (Staggered - default)"}</option>
                <option value="horizontal">{lang === "fa" ? "↔️ افقی (horizontal - گرید)" : "↔️ Horizontal (Grid)"}</option>
                <option value="vertical">{lang === "fa" ? "↕️ عمودی (vertical - لیست ستونی)" : "↕️ Vertical (Single column list)"}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sanaei 3x-ui Credentials */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            {t.panelAuthTitle}
          </h3>
          <p className="text-xs text-gray-400">{t.panelAuthDesc}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.panelRestBaseHost}</label>
              <input
                type="url"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white font-mono focus:ring-1 focus:ring-indigo-500"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.panelSubPath}</label>
              <input
                type="text"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white font-mono focus:ring-1 focus:ring-indigo-500"
                value={panelUrl}
                onChange={(e) => setPanelUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.panelUsernameLabel}</label>
              <input
                type="text"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                value={panelUsername}
                onChange={(e) => setPanelUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.panelPasswordLabel}</label>
              <input
                type="password"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                value={panelPassword}
                onChange={(e) => setPanelPassword(e.target.value)}
              />
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

                <label className="flex items-center gap-3 bg-[#1f2937] p-3 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 select-none">
                  <input
                    type="checkbox"
                    className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    checked={hideWallet}
                    onChange={(e) => setHideWallet(e.target.checked)}
                  />
                  <div>
                    <span className="block text-sm font-medium text-white">💳 {lang === "fa" ? "مخفی کردن شارژ کیف پول" : "Hide Wallet Top-up"}</span>
                    <span className="block text-[10px] text-gray-500">{lang === "fa" ? "دکمه شارژ کارت‌به‌کارت پنهان می‌شود" : "Hides top-up information button"}</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-[#1f2937] p-3 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 select-none">
                  <input
                    type="checkbox"
                    className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    checked={hideSupport}
                    onChange={(e) => setHideSupport(e.target.checked)}
                  />
                  <div>
                    <span className="block text-sm font-medium text-white">📞 {lang === "fa" ? "مخفی کردن پشتیبانی فنی" : "Hide Support"}</span>
                    <span className="block text-[10px] text-gray-500">{lang === "fa" ? "دکمه پیش‌فرض پشتیبانی پنهان می‌شود" : "Hides the default support message button"}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Bot Buttons Section / دکمه‌های ربات */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-medium text-lg text-white">
                {lang === "fa" ? "دکمه‌های ربات" : "Bot Buttons"}
              </h3>
              <p className="text-xs text-gray-400">
                {lang === "fa" 
                  ? "سفارشی‌سازی عناوین دکمه‌های اصلی و مدیریت پاسخ‌های خودکار دکمه‌های سفارشی ربات تلگرام." 
                  : "Customize default primary keyboard menus and manage automated replies for custom reply buttons."}
              </p>
            </div>
          </div>

          {/* Part A: Default Primary keyboard button labels */}
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold">
              {lang === "fa" ? "📝 سفارشی‌سازی عناوین دکمه‌های اصلی کیبورد ربات تلگرام" : "📝 Custom Primary Bot Keyboard Buttons"}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0a0e17] p-4 border border-gray-800/60 rounded-xl">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">{lang === "fa" ? "عنوان دکمه خرید کانفیگ" : "Buy Config Button Label"}</label>
                <input
                  type="text"
                  className="w-full bg-[#1b2230] border border-gray-700/80 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 font-medium"
                  value={btnTextBuy}
                  onChange={(e) => setBtnTextBuy(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">{lang === "fa" ? "عنوان دکمه اطلاعات حساب" : "Account Profile Button Label"}</label>
                <input
                  type="text"
                  className="w-full bg-[#1b2230] border border-gray-700/80 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 font-medium"
                  value={btnTextProfile}
                  onChange={(e) => setBtnTextProfile(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">{lang === "fa" ? "عنوان دکمه شارژ کیف پول" : "Top-up Wallet Button Label"}</label>
                <input
                  type="text"
                  className="w-full bg-[#1b2230] border border-gray-700/80 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 font-medium"
                  value={btnTextWallet}
                  onChange={(e) => setBtnTextWallet(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">{lang === "fa" ? "عنوان دکمه پشتیبانی فنی" : "Support Button Label"}</label>
                <input
                  type="text"
                  className="w-full bg-[#1b2230] border border-gray-700/80 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 font-medium"
                  value={btnTextSupport}
                  onChange={(e) => setBtnTextSupport(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Part B: Custom Dynamic reply buttons */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">
              {lang === "fa" ? "⚙️ افزودن، ویرایش و حذف دکمه‌های شیشه‌ای / پاسخ خودکار سفارشی" : "⚙️ Add, Edit & Delete Custom reply Buttons"}
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* Input Form */}
              <div className="space-y-4 bg-[#0a0e17] p-4 border border-gray-800/60 rounded-xl">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5 flex items-center gap-1 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    {lang === "fa" ? "عنوان دکمه (مثال: 🎁 تست رایگان)" : "Button Display Label"}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === "fa" ? "🎁 دریافت کانفیگ مهلت‌دار" : "e.g. 🎁 Get Free Config"}
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    value={btnText}
                    onChange={(e) => setBtnText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5 font-medium">
                    {lang === "fa" ? "متن پاسخ ربات (فرمت HTML مجاز است)" : "Auto Reply Text (HTML tags allowed)"}
                  </label>
                  <textarea
                    rows={4}
                    placeholder={lang === "fa" ? "سلام! جهت دریافت سرویس تست دکمه فعال شد:\nvless://test-configs-daltoon..." : "Hello! Here is your quick configuration..."}
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed font-sans"
                    value={btnReplyText}
                    onChange={(e) => setBtnReplyText(e.target.value)}
                  />
                </div>

                {buttonError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1 font-semibold">
                    <span className="h-1.5 w-1.5 bg-rose-500 rounded-full"></span>
                    {buttonError}
                  </p>
                )}

                {buttonSuccess && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> 
                    {lang === "fa" ? "✅ تغییرات دکمه با موفقیت همگام شد!" : "✅ Button state synchronized!"}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAddButton}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-lg transition text-xs shadow-md shadow-emerald-600/15 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {editingButtonId ? (lang === "fa" ? "ذخیره تغییرات دکمه" : "Save Modified Button") : (lang === "fa" ? "ذخیره و افزودن دکمه جدید" : "Create & Add Button")}
                  </button>
                  {editingButtonId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingButtonId(null);
                        setBtnText("");
                        setBtnReplyText("");
                      }}
                      className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs cursor-pointer"
                    >
                      {lang === "fa" ? "انصراف" : "Cancel"}
                    </button>
                  )}
                </div>
              </div>

              {/* List and Actions */}
              <div className="bg-[#0b0f19] border border-gray-800 rounded-xl p-4 flex flex-col justify-between max-h-[340px] overflow-y-auto">
                <div>
                  <h4 className="text-xs uppercase font-mono border-b border-gray-800 pb-2 mb-3 text-gray-400 font-semibold tracking-wider flex justify-between items-center">
                    <span>{lang === "fa" ? "دکمه‌های سفارشی فعال شده:" : "Live Custom reply Buttons:"}</span>
                    <span className="bg-[#1f2937] text-indigo-400 px-2 py-0.5 rounded text-[10px] font-mono">{customButtons.length}</span>
                  </h4>

                  {customButtons.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center">
                      <p className="text-xs text-gray-400 font-medium">
                        {lang === "fa" ? "هیچ دکمه‌ی سفارشی ثبت نشده است." : "No custom buttons created yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[240px] overflow-y-auto no-scrollbar pr-1">
                      {customButtons.map((btn) => (
                        <div key={btn.id} className="bg-[#111827] border border-gray-800/80 p-2.5 rounded-lg flex items-start justify-between gap-3 shadow-sm hover:border-gray-700 transition">
                          <div className="space-y-1 flex-1 min-w-0">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 truncate max-w-full">
                              {btn.text}
                            </span>
                            <p className="text-[10px] text-gray-400 leading-normal font-sans line-clamp-2 truncate">
                              {btn.replyText}
                            </p>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingButtonId(btn.id);
                                setBtnText(btn.text);
                                setBtnReplyText(btn.replyText);
                              }}
                              className="text-indigo-400 hover:text-white hover:bg-indigo-500/15 p-1 rounded transition cursor-pointer"
                              title="Edit button"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteButton(btn.id)}
                              className="text-rose-400 hover:text-white hover:bg-rose-500/15 p-1 rounded transition cursor-pointer"
                              title="Remove button"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
