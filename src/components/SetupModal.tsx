import React, { useState, useEffect } from "react";
import { Language } from "../locales";
import { Bot, UserCog, User, Key, ArrowRight, Info } from "lucide-react";
import { PanelSettings } from "../types";

interface SetupModalProps {
  lang: Language;
  onComplete: (settingsUpdate: Partial<PanelSettings>) => void;
}

export default function SetupModal({ lang, onComplete }: SetupModalProps) {
  const [nickname, setNickname] = useState(() => sessionStorage.getItem("setup_nickname") || "");
  const [botToken, setBotToken] = useState(() => sessionStorage.getItem("setup_botToken") || "");
  const [ownerId, setOwnerId] = useState(() => sessionStorage.getItem("setup_ownerId") || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.setItem("setup_nickname", nickname);
  }, [nickname]);

  useEffect(() => {
    sessionStorage.setItem("setup_botToken", botToken);
  }, [botToken]);

  useEffect(() => {
    sessionStorage.setItem("setup_ownerId", ownerId);
  }, [ownerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !botToken.trim() || !ownerId.trim()) {
      setError(lang === "fa" ? "لطفا تمامی فیلدها را پر کنید." : "Please fill out all fields.");
      return;
    }
    
    if (isNaN(Number(ownerId))) {
      setError(lang === "fa" ? "آیدی عددی باید فقط شامل اعداد باشد." : "Owner ID must be a number.");
      return;
    }
    
    sessionStorage.removeItem("setup_nickname");
    sessionStorage.removeItem("setup_botToken");
    sessionStorage.removeItem("setup_ownerId");

    const guidesTextDefault = lang === "fa" 
      ? `🌐 راهنمای فعال‌سازی و اتصال به سرویس (لینک سابسکریپشن)

کاربر گرامی، ضمن تشکر از انتخاب و اعتماد شما، روش فعال‌سازی و راه‌اندازی سرویس به شرح زیر می‌باشد:

۱. نرم‌افزار متناسب با سیستم‌عامل خود را دانلود و نصب کنید:
• اندروید: v2rayNG
• آیفون (iOS): V2box یا Streisand
• ویندوز: Nekoray یا v2rayN

۲. لینک اشتراک (سابسکریپشن) دریافتی از ربات را کپی نمایید.

۳. وارد نرم‌افزار شده و پیوند کپی شده را اضافه نمایید (معمولاً دکمه + و انتخاب گزینه Import from clipboard یا Add Subscription).

۴. روی گزینه Update Subscription کلیک کنید تا تمام سرورها بارگذاری شوند.

۵. یکی از سرورها را انتخاب کرده و اتصال را برقرار نمایید. در صورت وجود هرگونه مشکل با ما در ارتباط باشید.`
      : "Connection Guides...";

    const defaultWelcomeText = lang === "fa"
      ? `سلام کاربر گرامی 🌹\nبه ربات ${nickname.trim()} خوش آمدید.\n\nآیدی عددی شما: {tg_id}\nموجودی فعلی: {wallet_balance} تومان`
      : `Hello User!\nWelcome to ${nickname.trim()} bot.\nYour ID: {tg_id}\nWallet Balance: {wallet_balance}`;

    onComplete({
      botToken: botToken.trim(),
      ownerId: Number(ownerId.trim()),
      welcomeText: defaultWelcomeText,
      supportText: lang === "fa" ? "برای پشتیبانی با مدیریت در ارتباط باشید." : "Contact admin for support.",
      btnTextGuides: lang === "fa" ? "💡 راهنمای اتصال" : "💡 Connection Guides",
      guidesText: guidesTextDefault,
      lockChannel: false,
      lockChannelRequired: false,
      enableCryptoPos: false,
      enableAghazPay: false,
      enableStripe: false,
      enablePayPal: false,
      enableZarinPal: false,
      enablePerfectMoney: false,
      enableCardToCard: false,
      enableCardToCardAutoConfirm: false,
      enableWalletMenu: false,
      enableFreeTestPlan: false,
      isFreeTestActive: false,
      hideBtnFreeTest: true,
      hideBtnAiChat: true,
      hideBtnColleagues: true,
      hideBtnReferral: true,
      hideBtnFeedback: true,
      hideBtnTicketSupport: true,
      hideBtnInstantSupport: true,
      hideBtnSupport: false, // Keep basic support button
      hideSupport: false, 
      hideBuy: false, 
      hideMySubs: false, 
      hideProfile: false, 
      hideWallet: true,
      admins: [
        {
          id: Math.random().toString(36).substring(2, 9),
          userId: Number(ownerId.trim()),
          username: "Owner",
          role: "super_admin",
          createdAt: new Date().toISOString()
        }
      ]
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-indigo-500/10 to-transparent p-6 border-b border-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-3 rounded-xl border border-indigo-500/30">
              <UserCog className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                {lang === "fa" ? "راه‌اندازی اولیه دالتون بات" : "Daltoon Bot Initial Setup"}
              </h2>
              <p className="text-xs text-indigo-300/80 font-medium">
                {lang === "fa" ? "توسعه یافته توسط mDaltoon" : "Developed by mDaltoon"}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                {lang === "fa" ? "نام ربات / لقب شما (Nickname)" : "Bot/Store Nickname"} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder={lang === "fa" ? "مثال: فروشگاه پروکسی من" : "e.g. My Proxy Store"}
                className="w-full bg-[#1b2230] border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                {lang === "fa" ? "این نام در پیام‌های خوش‌آمدگویی و داخل ربات به جای Daltoon قرار می‌گیرد." : "This name will be placed in welcome messages instead of Daltoon."}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400" />
                {lang === "fa" ? "توکن ربات تلگرام" : "Telegram Bot Token"} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                placeholder="1234567890:AAH..."
                className="w-full bg-[#1b2230] border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-mono placeholder:text-gray-600"
                dir="ltr"
              />
              <p className="text-[11px] text-emerald-400/80 mt-1.5 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {lang === "fa" ? "توکن ربات خود را از BotFather@ دریافت کنید." : "Get your token from @BotFather."}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                {lang === "fa" ? "آیدی عددی مالک (Owner ID)" : "Owner Numeric ID"} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
                placeholder={lang === "fa" ? "فقط عدد (مثلا: 123456789)" : "Numbers only"}
                className="w-full bg-[#1b2230] border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-mono placeholder:text-gray-600"
                dir="ltr"
              />
              <p className="mt-1.5 text-xs text-indigo-300 font-medium flex items-center gap-1">
                <Info className="w-3 h-3" />
                {lang === "fa" ? "آیدی عددی خود را می‌توانید از ربات تلگرامی infouserbot@ دریافت کنید." : "Get your numeric ID from @infouserbot in Telegram."}
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
          >
            {lang === "fa" ? "ذخیره و ورود به داشبورد" : "Save and Enter Dashboard"}
            <ArrowRight className="w-5 h-5 rtl:hidden" />
            <ArrowRight className="w-5 h-5 hidden rtl:block rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
}
