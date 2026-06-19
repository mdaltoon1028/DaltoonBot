import React, { useState } from 'react';
import { Gift, Trash2, Plus, Users, Edit2, Check, X } from 'lucide-react';
import { GiftCode } from '../types';

interface GiftCodeManagerProps {
  giftCodes: GiftCode[];
  onAddCode: (code: string, amount: number, maxUsage: number) => void;
  onDeleteCode: (id: string) => void;
  onEditCode?: (id: string, code: string, amount: number, maxUsage: number) => void;
}

export default function GiftCodeManager({ giftCodes, onAddCode, onDeleteCode, onEditCode }: GiftCodeManagerProps) {
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [maxUsage, setMaxUsage] = useState('1');
  const [editingId, setEditingId] = useState<string | null>(null);

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
          <div className="flex gap-2">
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
              className={`flex-1 ${editingId ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-xl px-4 py-2.5 font-medium transition-all flex items-center justify-center space-x-2 space-x-reverse`}
            >
              {editingId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              <span>{editingId ? "ذخیره تغییرات" : "ایجاد کد"}</span>
            </button>
          </div>
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
