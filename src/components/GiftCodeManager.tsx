import React, { useState } from 'react';
import { Gift, Trash2, Plus, Users, Edit2, Check, X, Share2, Save, Tag, Calendar, Percent, Clock } from 'lucide-react';
import { GiftCode, PromoCode, PanelSettings } from '../types';
import { Language } from '../locales';

interface GiftCodeManagerProps {
  giftCodes: GiftCode[];
  onAddCode: (code: string, amount: number, maxUsage: number) => void;
  onDeleteCode: (id: string) => void;
  onEditCode?: (id: string, code: string, amount: number, maxUsage: number) => void;
  promoCodes?: PromoCode[];
  onAddPromoCode?: (code: string, type: "percent" | "extend_days", value: number, maxUsage: number) => void;
  onDeletePromoCode?: (id: string) => void;
  settings?: PanelSettings;
  onSaveSettings?: (settings: PanelSettings) => void;
  lang?: Language;
}

export default function GiftCodeManager({ 
  giftCodes = [], 
  onAddCode, 
  onDeleteCode, 
  onEditCode,
  promoCodes = [],
  onAddPromoCode,
  onDeletePromoCode,
  settings,
  onSaveSettings,
  lang = 'fa'
}: GiftCodeManagerProps) {
  // Navigation tab within the merged screen
  const [managerTab, setManagerTab] = useState<'gift_codes' | 'promo_codes' | 'referrals'>('gift_codes');

  // Gift Code States
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [maxUsage, setMaxUsage] = useState('1');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Referral Settings States
  const [botTelegramHandle, setBotTelegramHandle] = useState(settings?.botTelegramHandle || "");
  const [referralRewardAmount, setReferralRewardAmount] = useState(settings?.referralRewardAmount ?? 0);
  const [referralRewardPercent, setReferralRewardPercent] = useState(settings?.referralRewardPercent ?? 5);
  const [calculationAmount, setCalculationAmount] = useState<number>(settings?.referralBaseAmount ?? 100000);
  const [referralMessage, setReferralMessage] = useState(settings?.referralMessage || 
    "برای کسب موجودی هدیه، دوستان و آشنایان خودتون رو با لینک پایین به ربات دعوت کنید 👥\n\n" + 
    "در ضمن کد معرف اختصاصی شما {uid} می باشد.\n\n" + 
    "{link}\n\n" +
    "🎁 با دعوت از هر دوست، {reward} تومان (معادل {percent}% مبلغ پایه) پاداش دریافت می‌کنید.\n\n" + 
    "📊 آمار دعوت شما\n" + 
    "• افراد وارد شده با لینک: 0\n" + 
    "• پاداش دریافت شده: 0 تومان"
  );
  const [savedSettings, setSavedSettings] = useState(false);

  // Promo Code Form States
  const [promoCode, setPromoCode] = useState("");
  const [promoType, setPromoType] = useState<"percent" | "extend_days">("percent");
  const [promoValue, setPromoValue] = useState("");
  const [promoMaxUsage, setPromoMaxUsage] = useState("50");
  const [promoSuccess, setPromoSuccess] = useState(false);

  const isFa = lang === 'fa';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code && amount && maxUsage) {
      if (editingId && onEditCode) {
        onEditCode(editingId, code, parseInt(amount, 10), parseInt(maxUsage, 10));
        setEditingId(null);
      } else {
        onAddCode(code, parseInt(amount, 10), parseInt(maxUsage, 10));
      }
      setCode('');
      setAmount('');
      setMaxUsage('1');
    }
  };

  const handleEdit = (gc: GiftCode) => {
    setEditingId(gc.id);
    setCode(gc.code);
    setAmount(gc.amount.toString());
    setMaxUsage(gc.maxUsage.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCode('');
    setAmount('');
    setMaxUsage('1');
  };

  const handleSaveReferralSettings = () => {
    if (settings && onSaveSettings) {
      onSaveSettings({
        ...settings,
        botTelegramHandle,
        referralRewardAmount,
        referralRewardPercent,
        referralBaseAmount: calculationAmount,
        referralMessage
      });
      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 3000);
    }
  };

  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || !promoValue || !promoMaxUsage) return;

    if (onAddPromoCode) {
      onAddPromoCode(
        promoCode.toUpperCase().trim(),
        promoType,
        parseFloat(promoValue),
        parseInt(promoMaxUsage, 10)
      );
    }

    setPromoCode("");
    setPromoValue("");
    setPromoMaxUsage("50");

    setPromoSuccess(true);
    setTimeout(() => setPromoSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="p-3 bg-purple-500/10 rounded-xl">
            <Gift className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isFa ? '🎟️ مدیریت هوشمند کدهای مالی و معرف' : 'Financial Codes & Referrals Manager'}
            </h2>
            <p className="text-sm text-gray-400">
              {isFa ? 'ساخت و ویرایش کدهای افزایش شارژ مستقیم هدیه، درصدهای تخفیف و سیستم معرف' : 'Edit gift balances, percentage discounts, and reward triggers'}
            </p>
          </div>
        </div>

        {/* Dynamic Nav Sub-tabs */}
        <div className="flex bg-[#111827] border border-[#1f2937] p-1 rounded-xl">
          <button
            onClick={() => setManagerTab('gift_codes')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
              managerTab === 'gift_codes'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {isFa ? '🎁 کدهای هدیه (افزایش اعتبار)' : 'Gift Cards'}
          </button>
          <button
            onClick={() => setManagerTab('promo_codes')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
              managerTab === 'promo_codes'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {isFa ? '🎟️ کدهای تخفیف (درصدی و تمدید)' : 'Promo Codes'}
          </button>
          <button
            onClick={() => setManagerTab('referrals')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
              managerTab === 'referrals'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {isFa ? '👥 سیستم زیرمجموعه‌گیری' : 'Referrals'}
          </button>
        </div>
      </div>

      {managerTab === 'gift_codes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Gift Codes Panel */}
          <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-700 pb-2">
              <Gift className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">{isFa ? 'افزودن کد هدیه جدید' : 'Add New Gift Code'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{isFa ? 'کد هدیه' : 'Gift Code'}</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 transition-all text-left dir-ltr font-bold uppercase"
                  placeholder="e.g. VIP2024"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{isFa ? 'مبلغ (تومان)' : 'Amount (Toman)'}</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 transition-all text-left dir-ltr"
                  placeholder="50000"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{isFa ? 'تعداد مجاز استفاده' : 'Max Usage'}</label>
                <input
                  type="number"
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 transition-all text-left dir-ltr"
                  min="1"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="w-14 items-center justify-center flex bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-2 py-2.5 transition-all"
                    title="لغو ویرایش"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="submit"
                  className={`flex-1 ${editingId ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-xl px-4 py-2.5 font-medium transition-all flex items-center justify-center space-x-2 space-x-reverse cursor-pointer`}
                >
                  {editingId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  <span>{editingId ? (isFa ? 'ذخیره تغییرات' : 'Save Changes') : (isFa ? 'ایجاد کد هدیه' : 'Create Code')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Registered Gift Codes List (Right/2 cols) */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 flex flex-col h-full">
            <div className="flex items-center gap-2 border-b border-gray-700 pb-3 mb-4">
              <Gift className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">{isFa ? 'کدهای هدیه فعال ثبت شده' : 'Registered Gift Codes'}</h3>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[440px] custom-scrollbar">
              <table className="w-full text-right text-slate-300">
                <thead className="bg-slate-900/50 text-slate-400 text-sm">
                  <tr>
                    <th className="px-6 py-4 font-medium">کد هدیه</th>
                    <th className="px-6 py-4 font-medium">مبلغ شارژ</th>
                    <th className="px-6 py-4 font-medium">وضعیت استفاده</th>
                    <th className="px-6 py-4 font-medium">تاریخ ایجاد</th>
                    <th className="px-6 py-4 font-medium text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {giftCodes && giftCodes.map((gc) => (
                    <tr key={gc.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-purple-400 bg-purple-400/10 px-2 py-1 rounded-lg">
                          {gc.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-emerald-400">
                        {gc.amount.toLocaleString()} تومان
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span className="text-sm">
                            {gc.totalUsage} / {gc.maxUsage}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(gc.createdAt).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleEdit(gc)}
                            className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                            title="ویرایش کد"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteCode(gc.id)}
                            className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                            title="حذف کد"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!giftCodes || giftCodes.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        هیچ کد هدیه‌ای ایجاد نشده است
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {managerTab === 'promo_codes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Create Code Form */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 h-fit space-y-4">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2 border-b border-gray-700 pb-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              {isFa ? "ثبت کد تخفیف جدید" : "Create New Discount Code"}
            </h3>

            <form onSubmit={handlePromoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1.5">
                  {isFa ? "🏷️ کد تخفیف" : "🏷️ Promo Code"}
                </label>
                <input
                  type="text"
                  required
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="DALTOON20"
                  className="w-full bg-[#161c2a] border border-gray-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold tracking-wider text-center text-left dir-ltr uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1.5">
                    {isFa ? "⚙️ نوع کد" : "⚙️ Code Type"}
                  </label>
                  <select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value as "percent" | "extend_days")}
                    className="w-full bg-[#161c2a] border border-gray-700/50 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer"
                  >
                    <option value="percent">{isFa ? "درصدی (%)" : "Percentage (%)"}</option>
                    <option value="extend_days">{isFa ? "تمدید (روز)" : "Extension (Days)"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1.5">
                    {promoType === "percent" ? (isFa ? "📈 درصد تخفیف" : "Discount %") : (isFa ? "📅 تعداد روز" : "Extend Days")}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={promoType === "percent" ? 100 : 365}
                    value={promoValue}
                    onChange={(e) => setPromoValue(e.target.value)}
                    placeholder={promoType === "percent" ? "20" : "5"}
                    className="w-full bg-[#161c2a] border border-gray-700/50 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1.5">
                  {isFa ? "👥 حداکثر استفاده مجاز" : "👥 Limit Users Count"}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={promoMaxUsage}
                  onChange={(e) => setPromoMaxUsage(e.target.value)}
                  placeholder="50"
                  className="w-full bg-[#161c2a] border border-gray-700/50 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center font-semibold"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-xs font-bold transition duration-200 cursor-pointer shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {isFa ? "ایجاد و ذخیره کد تخفیف" : "Generate Promo Code"}
                </button>
              </div>

              {promoSuccess && (
                <div className="text-center text-xs text-emerald-400 font-bold bg-emerald-500/10 py-2.5 rounded-xl border border-emerald-500/20">
                  {isFa ? "✅ کد تخفیف با موفقیت ثبت شد!" : "✅ Discount code registered!"}
                </div>
              )}
            </form>
          </div>

          {/* List of Registered Promo Codes */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 flex flex-col h-fit">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 border-b border-gray-700 pb-3">
              <Tag className="w-4 h-4 text-indigo-400" />
              {isFa ? "لیست کدهای تخفیف و تمدید فعال" : "Active Promo Codes"}
            </h3>

            {!promoCodes || promoCodes.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs">
                {isFa ? "هیچ کد تخفیف یا تمدیدی در سیستم ثبت نشده است." : "No promo codes active."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promoCodes.map((pc) => (
                  <div
                    key={pc.id}
                    className="bg-[#121824] border border-gray-800 rounded-xl p-4 flex flex-col justify-between hover:border-gray-700 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-block bg-indigo-600/20 text-indigo-300 font-mono font-extrabold text-sm px-2.5 py-1 rounded-lg tracking-wider">
                          {pc.code}
                        </span>
                        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-300">
                          {pc.type === "percent" ? (
                            <>
                              <Percent className="w-3.5 h-3.5 text-amber-500" />
                              <span>{isFa ? `${pc.value}٪ تخفیف` : `${pc.value}% Discount`}</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>
                                {isFa ? `${pc.value} روز تمدید رایگان` : `${pc.value} days extension`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onDeletePromoCode && onDeletePromoCode(pc.id)}
                        className="p-1 px-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition duration-150 cursor-pointer border border-red-500/20"
                        title={isFa ? "حذف" : "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                      <div>
                        {isFa ? "دفعات استفاده:" : "Used:"}{" "}
                        <span className="font-semibold text-white font-mono">
                          {pc.totalUsage}
                        </span>{" "}
                        / <span className="text-gray-400">{pc.maxUsage}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span className="font-mono text-gray-500">
                          {pc.createdAt.split("T")[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {managerTab === 'referrals' && (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden transition-all duration-300 p-6 animate-fadeIn space-y-6">
          <div className="border-b border-slate-700/50 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              {isFa ? '👥 تنظیمات اختصاصی سیستم زیرمجموعه‌گیری (سیستم معرف دالتون)' : '👥 Dedicated Referral System'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isFa 
                ? 'در این بخش می‌توانید درصد پاداش زیرمجموعه‌گیری، مبلغ پایه، آیدی ربات متصل و متن پیام معرفی را تنظیم کنید.'
                : 'Configure your referral reward percentage, base amount calculation, and real-time custom message templates.'}
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{isFa ? 'آیدی ربات شما (بدون @)' : 'Bot Telegram Username (No @)'}</label>
                <input
                  type="text"
                  value={botTelegramHandle}
                  onChange={(e) => setBotTelegramHandle(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 transition-all text-left dir-ltr"
                  placeholder="DaltoonVPN_bot"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{isFa ? 'درصد پاداش به ازای دعوت (%)' : 'Reward Percentage per Invite'}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={referralRewardPercent}
                    onChange={(e) => setReferralRewardPercent(Number(e.target.value))}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-505 transition-all text-left dir-ltr pr-8"
                    placeholder="5"
                    min="0"
                    max="100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 select-none">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{isFa ? 'مبلغ پایه محاسبه (تومان)' : 'Base Calculation Amount'}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={calculationAmount}
                    onChange={(e) => setCalculationAmount(Number(e.target.value))}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-506 transition-all text-left dir-ltr"
                    placeholder="100000"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Reward Calculation Preview */}
            <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  {isFa ? 'محاسبه پاداش مشتری به ازای هر دعوت جدید:' : 'Reward per Invite:'}
                </p>
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="bg-emerald-500/10 px-2 py-1 rounded text-emerald-300 font-mono text-xs">
                    {Math.max(0, Math.round((calculationAmount * referralRewardPercent) / 100)).toLocaleString()} 
                  </span>
                  <span>{isFa ? 'تومان پاداش به ازای هر نفر که عضو شود' : 'Toman per referral'}</span>
                </p>
              </div>
              <div className="text-xs text-gray-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 font-mono">
                {calculationAmount.toLocaleString()} × {referralRewardPercent}%
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">{isFa ? 'متن پیام مجموعه گیری اختصاصی کاربر' : 'Referral Message Content'}</label>
                <span className="text-[10px] text-gray-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  {isFa ? 'متغیرها: {uid}, {link}, {amount}, {percent}, {reward}' : 'Vars: {uid}, {link}, {amount}, {percent}, {reward}'}
                </span>
              </div>
              <textarea
                value={referralMessage}
                onChange={(e) => setReferralMessage(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm leading-relaxed text-right font-sans"
                rows={8}
                placeholder={isFa ? 'متن خود را اینجا وارد کنید...' : 'Enter your text here...'}
                dir="rtl"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="text-xs text-emerald-400 font-semibold h-4 font-sans">
                {savedSettings && (isFa ? '✅ تغییرات سیستم معرف با موفقیت ذخیره شد!' : '✅ Referral settings saved!')}
              </div>
              <button
                type="button"
                onClick={handleSaveReferralSettings}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Save className="w-4 h-4" />
                {isFa ? 'ذخیره تنظیمات معرف دالتون' : 'Save Referral Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
