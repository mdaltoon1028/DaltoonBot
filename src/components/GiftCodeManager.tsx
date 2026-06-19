import React, { useState } from 'react';
import { Gift, Trash2, Plus, Users, Edit2, Check, X, Share2, Save } from 'lucide-react';
import { GiftCode, PanelSettings } from '../types';
import { Language } from '../locales';

interface GiftCodeManagerProps {
  giftCodes: GiftCode[];
  onAddCode: (code: string, amount: number, maxUsage: number) => void;
  onDeleteCode: (id: string) => void;
  onEditCode?: (id: string, code: string, amount: number, maxUsage: number) => void;
  settings?: PanelSettings;
  onSaveSettings?: (settings: PanelSettings) => void;
  lang?: Language;
}

export default function GiftCodeManager({ 
  giftCodes, 
  onAddCode, 
  onDeleteCode, 
  onEditCode,
  settings,
  onSaveSettings,
  lang = 'fa'
}: GiftCodeManagerProps) {
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [maxUsage, setMaxUsage] = useState('1');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [botTelegramHandle, setBotTelegramHandle] = useState(settings?.botTelegramHandle || "");
  const [referralRewardPercent, setReferralRewardPercent] = useState(settings?.referralRewardPercent || 5);
  const [calculationAmount, setCalculationAmount] = useState<number>(100000);
  const [savedSettings, setSavedSettings] = useState(false);

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
        referralRewardPercent
      });
      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 space-x-reverse mb-6">
        <div className="p-3 bg-purple-500/10 rounded-xl">
          <Gift className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{lang === 'fa' ? 'مدیریت کدهای هدیه و زیرمجموعه‌گیری' : 'Gift Codes & Referrals'}</h2>
          <p className="text-sm text-gray-400">{lang === 'fa' ? 'ساخت کدهای تخفیف و تنظیمات سیستم معرف' : 'Manage gift codes and referral system setup'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gift Codes Panel */}
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-700 pb-2">
            <Gift className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">{lang === 'fa' ? 'افزودن کد هدیه جدید' : 'Add New Gift Code'}</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{lang === 'fa' ? 'کد هدیه' : 'Gift Code'}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 transition-all text-left dir-ltr"
                placeholder="e.g. VIP2024"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{lang === 'fa' ? 'مبلغ (تومان)' : 'Amount (Toman)'}</label>
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
              <label className="text-sm font-medium text-gray-300">{lang === 'fa' ? 'تعداد مجاز استفاده' : 'Max Usage'}</label>
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
                <span>{editingId ? (lang === 'fa' ? 'ذخیره تغییرات' : 'Save Changes') : (lang === 'fa' ? 'ایجاد کد' : 'Create Code')}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Referral Settings Panel */}
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-700 pb-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">{lang === 'fa' ? 'تنظیمات سیستم زیرمجموعه‌گیری' : 'Referral System Settings'}</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {lang === 'fa' 
              ? 'در این بخش می‌توانید درصد پاداش زیرمجموعه‌گیری (سود معرفی) را تنظیم کنید. آدرس ربات کمک می‌کند تا سیستم بتواند لینک‌های دعوت اختصاصی بسازد.'
              : 'Configure your referral reward rate and bot handle so the system can generate exclusive invite links.'}
          </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{lang === 'fa' ? 'آیدی ربات شما (بدون @)' : 'Bot Telegram Username (No @)'}</label>
                <input
                  type="text"
                  value={botTelegramHandle}
                  onChange={(e) => setBotTelegramHandle(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 transition-all text-left dir-ltr"
                  placeholder="my_awesome_bot"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">{lang === 'fa' ? 'درصد پاداش معرف' : 'Reward Percentage'}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={referralRewardPercent}
                      onChange={(e) => setReferralRewardPercent(Number(e.target.value))}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 transition-all text-left dir-ltr pr-8"
                      placeholder="5"
                      min="0"
                      max="100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 select-none">%</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">{lang === 'fa' ? 'مبلغ خرید فرضی (تومان)' : 'Example Purchase Amount'}</label>
                  <input
                    type="number"
                    value={calculationAmount}
                    onChange={(e) => setCalculationAmount(Number(e.target.value))}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 transition-all text-left dir-ltr"
                    placeholder="100000"
                  />
                </div>
              </div>

              {/* Reward Calculation Preview */}
              <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    {lang === 'fa' ? 'محاسبه پاداش ربات:' : 'Estimated Reward:'}
                  </p>
                  <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-300">
                      {Math.max(0, Math.round((calculationAmount * referralRewardPercent) / 100)).toLocaleString()} 
                    </span>
                    <span>{lang === 'fa' ? 'تومان پاداش به ازای هر خرید' : 'Toman / Purchase'}</span>
                  </p>
                </div>
                <div className="text-[10px] text-gray-500 bg-slate-800 px-2 py-1 rounded">
                  {calculationAmount.toLocaleString()} × {referralRewardPercent}%
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs text-emerald-400 font-semibold h-4">
                  {savedSettings && (lang === 'fa' ? '✅ تغییرات سیستم معرف ذخیره شد' : '✅ Referral settings saved')}
                </div>
                <button
                  type="button"
                  onClick={handleSaveReferralSettings}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Save className="w-4 h-4" />
                  {lang === 'fa' ? 'ذخیره تنظیمات معرف' : 'Save Referral Settings'}
                </button>
              </div>
            </div>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-sm font-semibold text-white">{lang === 'fa' ? 'کدهای هدیه ثبت شده' : 'Registered Gift Codes'}</h3>
        </div>
        <div className="overflow-x-auto">
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
  );
}
