import React, { useState } from 'react';
import { Gift, Trash2, Plus, Users } from 'lucide-react';
import { GiftCode } from '../types';

interface GiftCodeManagerProps {
  giftCodes: GiftCode[];
  onAddCode: (code: string, amount: number, maxUsage: number) => void;
  onDeleteCode: (id: string) => void;
}

export default function GiftCodeManager({ giftCodes, onAddCode, onDeleteCode }: GiftCodeManagerProps) {
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [maxUsage, setMaxUsage] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code && amount && maxUsage) {
      onAddCode(code, parseInt(amount, 10), parseInt(maxUsage, 10));
      setCode('');
      setAmount('');
      setMaxUsage('1');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 space-x-reverse mb-6">
        <div className="p-3 bg-purple-500/10 rounded-xl">
          <Gift className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">مدیریت کدهای هدیه</h2>
          <p className="text-sm text-gray-400">ساخت و مدیریت کدهای تخفیف و هدیه برای کاربران</p>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">کد هدیه</label>
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
            <label className="text-sm font-medium text-gray-300">مبلغ (تومان)</label>
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
            <label className="text-sm font-medium text-gray-300">تعداد مجاز استفاده</label>
            <input
              type="number"
              value={maxUsage}
              onChange={(e) => setMaxUsage(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 transition-all text-left dir-ltr"
              min="1"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-xl px-4 py-2.5 font-medium transition-all flex items-center justify-center space-x-2 space-x-reverse"
          >
            <Plus className="w-5 h-5" />
            <span>ایجاد کد</span>
          </button>
        </form>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden">
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
                    <div className="flex justify-center">
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
