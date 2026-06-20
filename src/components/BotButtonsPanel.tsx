import React, { useState } from "react";
import { PanelSettings, CustomButton } from "../types";
import { Language, translations } from "../locales";
import { 
  Command, 
  Sparkles, 
  PlusCircle, 
  Check, 
  Edit, 
  Trash2, 
  Plus, 
  Save, 
  Database,
  Columns,
  Power,
  ChevronUp,
  ChevronDown
} from "lucide-react";

interface BotButtonsPanelProps {
  settings: PanelSettings;
  onSaveSettings: (settings: PanelSettings) => void;
  lang: Language;
  customButtons: CustomButton[];
  setCustomButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
}

export default function BotButtonsPanel({
  settings,
  onSaveSettings,
  lang,
  customButtons,
  setCustomButtons
}: BotButtonsPanelProps) {
  const t = translations[lang];

  // Primary buttons text & visibility states
  const [btnTextBuyNew, setBtnTextBuyNew] = useState(settings.btnTextBuyNew || "🛒 خرید اشتراک جدید");
  const [hideBtnBuyNew, setHideBtnBuyNew] = useState(!!settings.hideBtnBuyNew);

  const [btnTextMySubs, setBtnTextMySubs] = useState(settings.btnTextMySubs || "🗂 اشتراک های من / تمدید");
  const [hideBtnMySubs, setHideBtnMySubs] = useState(!!settings.hideBtnMySubs);

  const [btnTextGuides, setBtnTextGuides] = useState(settings.btnTextGuides || "💡 آموزش ها");
  const [hideBtnGuides, setHideBtnGuides] = useState(!!settings.hideBtnGuides);

  const [btnTextProfile, setBtnTextProfile] = useState(settings.btnTextProfile || "👤 حساب کاربری");
  const [hideBtnProfile, setHideBtnProfile] = useState(!!settings.hideBtnProfile);

  const [btnTextSupport, setBtnTextSupport] = useState(settings.btnTextSupport || "📞 پشتیبانی");
  const [hideBtnSupport, setHideBtnSupport] = useState(!!settings.hideBtnSupport);

  const [btnTextFreeTest, setBtnTextFreeTest] = useState(settings.btnTextFreeTest || "🎁 موجودی رایگان");
  const [hideBtnFreeTest, setHideBtnFreeTest] = useState(!!settings.hideBtnFreeTest);

  const [btnTextInstantSupport, setBtnTextInstantSupport] = useState(settings.btnTextInstantSupport || "🤖 پشتیبانی آنی");
  const [hideBtnInstantSupport, setHideBtnInstantSupport] = useState(!!settings.hideBtnInstantSupport);

  const [btnTextFeedback, setBtnTextFeedback] = useState(settings.btnTextFeedback || "💌 بازخورد کاربر ها");
  const [hideBtnFeedback, setHideBtnFeedback] = useState(!!settings.hideBtnFeedback);

  const [btnTextWallet, setBtnTextWallet] = useState(settings.btnTextWallet || "💵 کیف پول + شارژ");
  const [hideBtnWallet, setHideBtnWallet] = useState(!!settings.hideBtnWallet);

  const [btnTextReferral, setBtnTextReferral] = useState(settings.btnTextReferral || "👥 زیرمجموعه گیری");
  const [hideBtnReferral, setHideBtnReferral] = useState(!!settings.hideBtnReferral);

  const [btnTextColleagues, setBtnTextColleagues] = useState(settings.btnTextColleagues || "بسته ویژه همکاران");
  const [hideBtnColleagues, setHideBtnColleagues] = useState(settings.hideBtnColleagues !== undefined ? settings.hideBtnColleagues : true); // default hidden

  const [btnTextAiChat, setBtnTextAiChat] = useState(settings.btnTextAiChat || "🤖 چت با ربات");
  const [hideBtnAiChat, setHideBtnAiChat] = useState(settings.hideBtnAiChat !== undefined ? settings.hideBtnAiChat : true); // default hidden

  const [keyboardLayout, setKeyboardLayout] = useState<"horizontal" | "vertical" | "stepped">(settings.keyboardLayout || "stepped");
  
  const defaultOrder = [
    "btnBuyNew", "btnWallet", "btnMySubs", "btnGuides", "btnColleagues", "btnProfile", "btnSupport", "btnFreeTest", "btnAiChat", "btnInstantSupport", "btnFeedback", "btnReferral"
  ];
  
  const [mainButtonsOrder, setMainButtonsOrder] = useState<string[]>(() => {
    if (settings.mainButtonsOrder && settings.mainButtonsOrder.length > 0) {
      const saved = [...settings.mainButtonsOrder];
      defaultOrder.forEach(key => {
        if (!saved.includes(key)) {
          saved.push(key);
        }
      });
      return saved;
    }
    return defaultOrder;
  });

  // Custom reply buttons states
  const [btnText, setBtnText] = useState("");
  const [btnReplyText, setBtnReplyText] = useState("");
  const [buttonError, setButtonError] = useState("");
  const [buttonSuccess, setButtonSuccess] = useState(false);
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
  
  const [saved, setSaved] = useState(false);

  // Add/Edit Button Handler
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

  // Delete Button Handler
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

  // Move button up or down
  const moveButton = (index: number, direction: "up" | "down") => {
    const newButtons = [...customButtons];
    if (direction === "up" && index > 0) {
      [newButtons[index], newButtons[index - 1]] = [newButtons[index - 1], newButtons[index]];
    } else if (direction === "down" && index < newButtons.length - 1) {
      [newButtons[index], newButtons[index + 1]] = [newButtons[index + 1], newButtons[index]];
    }
    setCustomButtons(newButtons);
  };

  const moveMainButton = (index: number, direction: "up" | "down") => {
    const newOrder = [...mainButtonsOrder];
    if (direction === "up" && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === "down" && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setMainButtonsOrder(newOrder);
  };

  // Main Form Submit Handler (Saves primary button labels and layout)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      btnTextBuyNew,
      btnTextMySubs,
      btnTextGuides,
      btnTextProfile,
      btnTextSupport,
      btnTextFreeTest,
      btnTextInstantSupport,
      btnTextFeedback,
      btnTextReferral,
      btnTextWallet,
      btnTextColleagues,
      btnTextAiChat,
      hideBtnBuyNew,
      hideBtnMySubs,
      hideBtnGuides,
      hideBtnProfile,
      hideBtnSupport,
      hideBtnFreeTest,
      hideBtnInstantSupport,
      hideBtnFeedback,
      hideBtnReferral,
      hideBtnWallet,
      hideBtnColleagues,
      hideBtnAiChat,
      keyboardLayout,
      mainButtonsOrder
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div id="bot-buttons-tab" className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      
      {/* Header Info */}
      <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4 shadow-sm">
        <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
          <Command className="w-5 h-5 text-indigo-400" />
          {lang === "fa" ? "مدیریت دکمه‌ها و منوهای ربات تلگرام" : "Telegram Bot Menu & Buttons Management"}
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          {lang === "fa" 
            ? "در این پنجره می‌توانید ترتیب، چیدمان و نام تمام دکمه‌های کیبورد ربات تلگرام را ویرایش کنید. همچنین امکان ساخت دکمه‌های پاسخ خودکار جدید برای ارائه‌ی خدماتی نظیر اکانت تست یا برگه قوانین وجود دارد."
            : "In this interface, you can manage the layout, hierarchy, and labels of the Telegram bot's main keyboard menus. You can also define automated-reply custom buttons to offer features such as free test accounts, guides, or rules."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Layout & Primary Labels section */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display font-medium text-base text-white">
                {lang === "fa" ? "چیدمان و عناوین کیبورد اصلی" : "Primary Keyboard Layout & Labels"}
              </h4>
              <p className="text-xs text-gray-400">
                {lang === "fa" ? "پیکربندی چیدمان ظاهری دکمه‌ها و ویرایش برچسب‌های متنی منوی اصلی." : "Configure keyboard spacing structures and edit text labels."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Keyboard Layout pattern Selector */}
            <div className="space-y-2 bg-[#090d16] p-4 border border-gray-800/60 rounded-xl flex flex-col justify-between">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">
                  {lang === "fa" ? "📐 چیدمان دکمه‌های اصلی کیبورد" : "📐 Main Keyboard Layout Type"}
                </label>
                <p className="text-[11px] text-gray-500 mb-4">
                  {lang === "fa" ? "نحوه‌ی نمایش و قرارگیری دکمه‌های اصلی در تلگرام را تعیین کنید." : "Determines how the primary bot buttons stack on Telegram messenger."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {(["stepped", "horizontal", "vertical"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setKeyboardLayout(style)}
                    className={`p-3 rounded-lg border text-center transition cursor-pointer text-xs font-semibold capitalize ${
                      keyboardLayout === style 
                        ? "bg-indigo-600/15 border-indigo-500 text-indigo-300" 
                        : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                    }`}
                  >
                    {style === "stepped" && (lang === "fa" ? "پله‌ای" : "Stepped")}
                    {style === "horizontal" && (lang === "fa" ? "افقی" : "Horizontal")}
                    {style === "vertical" && (lang === "fa" ? "عمودی" : "Vertical")}
                  </button>
                ))}
              </div>
            </div>

            {/* Hidden toggle options or quick notes */}
            <div className="bg-[#090d16] p-4 border border-gray-800/60 rounded-xl space-y-3 justify-center flex flex-col">
              <span className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">
                {lang === "fa" ? "ℹ️ راهنمای چیدمان" : "ℹ️ Layout Guidelines"}
              </span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {lang === "fa" 
                  ? "• چیدمان پله‌ای: دکمه اول بزرگتر در ردیف بالا قرار می‌گیرد و سایر دکمه‌ها منظم در کنار هم قرار می‌گیرند (پیش‌فرض).\n• چیدمان افقی: دکمه‌ها دو به دو روبروی هم چیده می‌شوند.\n• چیدمان عمودی: هر دکمه در یک ردیف جداگانه و بزرگ نمایش داده می‌شود."
                  : "• Stepped: The first key takes standard full width, other keys follow grouped in pairs (default).\n• Horizontal: Arranges all action inputs side-by-side in columns.\n• Vertical: Extends all keys across full width on separate lines."}
              </p>
            </div>
          </div>

          {/* Part A: Default Primary keyboard button labels */}
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold">
              {lang === "fa" ? "✍️ برچسب متنی دکمه‌های اصلی کیبورد" : "✍️ Custom Primary Keyboard Button Labels"}
            </label>
            <div className="grid grid-cols-1 gap-4 bg-[#0a0e17] p-4 border border-gray-800/60 rounded-xl">
              {(() => {
                const primaryButtonsDefinition: Record<string, { label: string; value: string; setter: (val: string) => void; disabled: boolean; toggleDisabled: () => void }> = {
                  "btnBuyNew": { label: lang === "fa" ? "عنوان دکمه خرید اشتراک" : "Buy Sub Button Label", value: btnTextBuyNew, setter: setBtnTextBuyNew, disabled: hideBtnBuyNew, toggleDisabled: () => setHideBtnBuyNew(!hideBtnBuyNew) },
                  "btnMySubs": { label: lang === "fa" ? "عنوان دکمه اشتراک‌ها" : "My Subs Button Label", value: btnTextMySubs, setter: setBtnTextMySubs, disabled: hideBtnMySubs, toggleDisabled: () => setHideBtnMySubs(!hideBtnMySubs) },
                  "btnGuides": { label: lang === "fa" ? "عنوان دکمه آموزش‌ها" : "Guides Button Label", value: btnTextGuides, setter: setBtnTextGuides, disabled: hideBtnGuides, toggleDisabled: () => setHideBtnGuides(!hideBtnGuides) },
                  "btnProfile": { label: lang === "fa" ? "عنوان دکمه حساب کاربری" : "Profile Button Label", value: btnTextProfile, setter: setBtnTextProfile, disabled: hideBtnProfile, toggleDisabled: () => setHideBtnProfile(!hideBtnProfile) },
                  "btnSupport": { label: lang === "fa" ? "عنوان دکمه پشتیبانی" : "Support Button Label", value: btnTextSupport, setter: setBtnTextSupport, disabled: hideBtnSupport, toggleDisabled: () => setHideBtnSupport(!hideBtnSupport) },
                  "btnFreeTest": { label: lang === "fa" ? "عنوان دکمه موجوده رایگان/تست" : "Free Test Button Label", value: btnTextFreeTest, setter: setBtnTextFreeTest, disabled: hideBtnFreeTest, toggleDisabled: () => setHideBtnFreeTest(!hideBtnFreeTest) },
                  "btnAiChat": { label: lang === "fa" ? "عنوان دکمه چت با ربات" : "AI Chat Button Label", value: btnTextAiChat, setter: setBtnTextAiChat, disabled: hideBtnAiChat, toggleDisabled: () => setHideBtnAiChat(!hideBtnAiChat) },
                  "btnColleagues": { label: lang === "fa" ? "عنوان دکمه همکاران" : "Colleagues Button Label", value: btnTextColleagues, setter: setBtnTextColleagues, disabled: hideBtnColleagues, toggleDisabled: () => setHideBtnColleagues(!hideBtnColleagues) },
                  "btnInstantSupport": { label: lang === "fa" ? "عنوان دکمه پشتیبانی آنی" : "Instant Support Button Label", value: btnTextInstantSupport, setter: setBtnTextInstantSupport, disabled: hideBtnInstantSupport, toggleDisabled: () => setHideBtnInstantSupport(!hideBtnInstantSupport) },
                  "btnFeedback": { label: lang === "fa" ? "عنوان دکمه بازخورد" : "Feedback Button Label", value: btnTextFeedback, setter: setBtnTextFeedback, disabled: hideBtnFeedback, toggleDisabled: () => setHideBtnFeedback(!hideBtnFeedback) },
                  "btnReferral": { label: lang === "fa" ? "عنوان دکمه مجموعه‌گیری" : "Referral Button Label", value: btnTextReferral, setter: setBtnTextReferral, disabled: hideBtnReferral, toggleDisabled: () => setHideBtnReferral(!hideBtnReferral) },
                  "btnWallet": { label: lang === "fa" ? "عنوان دکمه کیف پول و شارژ" : "Wallet Button Label", value: btnTextWallet, setter: setBtnTextWallet, disabled: hideBtnWallet, toggleDisabled: () => setHideBtnWallet(!hideBtnWallet) },
                };

                return mainButtonsOrder.map((key, idx) => {
                  const btn = primaryButtonsDefinition[key];
                  if (!btn) return null; // Fallback for invalid keys

                  return (
                    <div key={key}>
                      <label className="block text-[11px] text-gray-400 mb-1 flex items-center justify-between">
                        <span>{btn.label}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveMainButton(idx, "up")}
                            className="text-gray-500 hover:text-white p-0.5"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMainButton(idx, "down")}
                            className="text-gray-500 hover:text-white p-0.5"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={btn.disabled}
                          className={`w-full bg-[#1b2230] border border-gray-700/80 rounded-lg p-2.5 pl-12 text-xs text-white focus:ring-1 focus:ring-indigo-500 font-medium transition ${btn.disabled ? "opacity-50" : ""}`}
                          value={btn.value}
                          onChange={(e) => btn.setter(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={btn.toggleDisabled}
                          title={lang === "fa" ? "فعال/غیرفعال کردن این دکمه" : "Toggle visibility"}
                          className={`absolute left-1 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all cursor-pointer ${
                            !btn.disabled 
                              ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)] hover:bg-emerald-500/30" 
                              : "bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-red-400"
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Part B: Custom Dynamic reply buttons */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display font-medium text-base text-white">
                {lang === "fa" ? "دکمه‌های سفارشی پاسخ خودکار (Custom Submenus)" : "Custom Auto-Reply Buttons"}
              </h4>
              <p className="text-xs text-gray-400">
                {lang === "fa" 
                  ? "دکمه‌های فرعی ایجاد کنید که با کلیک روی آنها، ربات بلافاصله پاسخ متنی تنظیم شده را به کاربر بفرستد." 
                  : "Add custom reply options that trigger instant preset responses (like free test links, guides)."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Input Action Form */}
            <div className="space-y-4 bg-[#0a0e17] p-4 border border-gray-800/60 rounded-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5 flex items-center gap-1 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    {lang === "fa" ? "عنوان دکمه (مثال: 🎁 تست رایگان)" : "Button Keyboard Display Label"}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === "fa" ? "مثلا: 🎁 تست رایگان ۲ ساعته" : "e.g., 🎁 Get Free Test"}
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-sans"
                    value={btnText}
                    onChange={(e) => setBtnText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5 font-medium">
                    {lang === "fa" ? "متن پاسخ ربات (پشتیبانی از تگ‌های HTML تلگرام)" : "Auto Reply Text (Telegram HTML allowed)"}
                  </label>
                  <textarea
                    rows={5}
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
              </div>

              <div className="flex gap-3 pt-3">
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

            {/* List and Actions rendering section */}
            <div className="bg-[#0b0f19] border border-gray-800 rounded-xl p-4 flex flex-col justify-between max-h-[380px] overflow-y-auto">
              <div>
                <h4 className="text-xs uppercase font-mono border-b border-gray-800 pb-2 mb-3 text-gray-400 font-semibold tracking-wider flex justify-between items-center">
                  <span>{lang === "fa" ? "دکمه‌های سفارشی فعال شده در ربات:" : "Live Custom Reply Buttons:"}</span>
                  <span className="bg-[#1f2937] text-indigo-400 px-2 py-0.5 rounded text-[10px] font-mono">{customButtons.length}</span>
                </h4>

                {customButtons.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-400 font-medium">
                      {lang === "fa" ? "هیچ دکمه‌ی سفارشی ثبت نشده است. از فرم سمت چپ یکی اضافه کنید." : "No custom buttons created yet. Create one on the left."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[290px] overflow-y-auto no-scrollbar pr-1">
                    {customButtons.map((btn) => (
                      <div key={btn.id} className="bg-[#111827] border border-gray-800/80 p-3 rounded-lg flex items-start justify-between gap-3 shadow-sm hover:border-gray-700 transition">
                        <div className="space-y-1 flex-1 min-w-0">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 truncate max-w-full">
                            {btn.text}
                          </span>
                          <p className="text-[10px] text-gray-400 leading-normal font-sans line-clamp-3">
                            {btn.replyText}
                          </p>
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveButton(customButtons.indexOf(btn), "up")}
                            className="text-gray-400 hover:text-white hover:bg-gray-700/50 p-1 rounded transition cursor-pointer"
                            title="Move up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveButton(customButtons.indexOf(btn), "down")}
                            className="text-gray-400 hover:text-white hover:bg-gray-700/50 p-1 rounded transition cursor-pointer"
                            title="Move down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
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

        {/* Actions Save footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1f2937]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-500" />
            <span className="text-[10px] uppercase font-mono text-gray-500">{lang === "fa" ? "ذخیره‌سازی آنی در دیتابیس ربات (bot_database.db)" : "Saves straight to sqlite bot_database.db"}</span>
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> {t.parametersFlushed}
              </span>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-sm font-semibold cursor-pointer transition shadow-lg shadow-indigo-600/10"
            >
              <Save className="w-4 h-4" />
              {lang === "fa" ? "ذخیره تغییرات دکمه‌ها و چیدمان" : "Save Button Layout & Labels"}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
