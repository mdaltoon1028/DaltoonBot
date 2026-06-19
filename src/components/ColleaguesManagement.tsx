import React, { useState } from "react";
import { ColleaguePackage, ColleagueAccount } from "../types";
import { Plus, Trash, Copy, CheckCircle2, Ticket } from "lucide-react";

interface Props {
  packages: ColleaguePackage[];
  accounts: ColleagueAccount[];
  setPackages: (p: ColleaguePackage[]) => void;
  setAccounts: (a: ColleagueAccount[]) => void;
  lang: string;
}

export default function ColleaguesManagement({ packages, accounts, setPackages, setAccounts, lang }: Props) {
  const [activeTab, setActiveTab] = useState<"packages" | "accounts">("packages");
  const [loading, setLoading] = useState(false);

  // Package Form
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [editPackageId, setEditPackageId] = useState<string | null>(null);
  const [pTitle, setPTitle] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pTraffic, setPTraffic] = useState("");
  const [pDesc, setPDesc] = useState("");

  const resetPackageForm = () => {
    setShowAddPackage(false);
    setEditPackageId(null);
    setPTitle("");
    setPPrice("");
    setPTraffic("");
    setPDesc("");
  };

  const savePackage = async () => {
    if (!pTitle || !pPrice || !pTraffic) return;
    setLoading(true);
    try {
      const res = await fetch("/api/colleague-packages/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editPackageId || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
          title: pTitle,
          price: Number(pPrice),
          trafficGb: Number(pTraffic),
          description: pDesc
        })
      });
      const data = await res.json();
      if (data.success) {
        setPackages(data.colleaguePackages);
        resetPackageForm();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  };

  const deletePackage = async (id: string) => {
    const cf = confirm(lang === "fa" ? "حذف شود؟" : "Are you sure?");
    if (!cf) return;
    setLoading(true);
    try {
      const res = await fetch("/api/colleague-packages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setPackages(data.colleaguePackages);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  };

  const deleteAccount = async (id: string) => {
    const cf = confirm(lang === "fa" ? "حذف شود؟" : "Are you sure?");
    if (!cf) return;
    setLoading(true);
    try {
      const res = await fetch("/api/colleague-accounts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setAccounts(data.colleagueAccounts);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-white/10 pb-2">
        <button
          className={`px-4 py-2 text-sm font-bold border-b-2 transition ${activeTab === "packages" ? "border-indigo-400 text-indigo-400" : "border-transparent text-gray-400 hover:text-white"}`}
          onClick={() => setActiveTab("packages")}
        >
          {lang === "fa" ? "بسته‌های همکاران" : "Colleague Packages"}
        </button>
        <button
          className={`px-4 py-2 text-sm font-bold border-b-2 transition ${activeTab === "accounts" ? "border-indigo-400 text-indigo-400" : "border-transparent text-gray-400 hover:text-white"}`}
          onClick={() => setActiveTab("accounts")}
        >
          {lang === "fa" ? "حساب‌های صادر شده" : "Issued Accounts"}
        </button>
      </div>

      {activeTab === "packages" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddPackage(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {lang === "fa" ? "افزودن پکیج جدید" : "Add New Package"}
            </button>
          </div>

          {showAddPackage && (
            <div className="bg-slate-800/80 p-4 rounded-xl border border-indigo-500/30">
              <h3 className="text-white font-bold mb-4">{editPackageId ? (lang === "fa" ? "ویرایش پکیج" : "Edit Package") : (lang === "fa" ? "ثبت پکیج جدید" : "Register New Package")}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">{lang === "fa" ? "عنوان پکیج" : "Title"}</label>
                  <input type="text" value={pTitle} onChange={e => setPTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">{lang === "fa" ? "قیمت (تومان)" : "Price (IRT)"}</label>
                  <input type="number" value={pPrice} onChange={e => setPPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">{lang === "fa" ? "حجم (گیگابایت)" : "Traffic (GB)"}</label>
                  <input type="number" value={pTraffic} onChange={e => setPTraffic(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-gray-400 mb-1">{lang === "fa" ? "توضیحات پکیج (نمایش به کاربر)" : "Description"}</label>
                  <textarea value={pDesc} onChange={e => setPDesc(e.target.value)} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-4 mt-4">
                <button
                  disabled={loading}
                  onClick={savePackage}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm"
                >
                  {loading ? "..." : (lang === "fa" ? "ذخیره پکیج" : "Save Package")}
                </button>
                <button
                  onClick={resetPackageForm}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-sm"
                >
                  {lang === "fa" ? "انصراف" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map(p => (
              <div key={p.id} className="bg-slate-800/50 p-4 rounded-xl border border-white/10 relative">
                <button
                  onClick={() => deletePackage(p.id)}
                  disabled={loading}
                  className="absolute top-2 left-2 p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-md"
                >
                  <Trash className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditPackageId(p.id);
                    setPTitle(p.title);
                    setPPrice(String(p.price));
                    setPTraffic(String(p.trafficGb));
                    setPDesc(p.description || "");
                    setShowAddPackage(true);
                  }}
                  className="absolute top-2 left-10 p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-md text-sm font-bold"
                >
                  {lang === "fa" ? "ویرایش" : "Edit"}
                </button>
                <h4 className="text-white font-bold text-lg pr-4">{p.title}</h4>
                <div className="flex gap-4 mt-2 text-sm text-gray-300">
                  <span>💰 {p.price.toLocaleString()} تومان</span>
                  <span>🗄️ {p.trafficGb} گیگابایت</span>
                </div>
                <p className="mt-2 text-xs text-gray-400 whitespace-pre-wrap">{p.description}</p>
              </div>
            ))}
            {packages.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                {lang === "fa" ? "هیچ پکیجی ثبت نشده است." : "No packages found."}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "accounts" && (
        <div className="overflow-x-auto">
          <table className="w-full text-right" dir="rtl">
            <thead className="bg-slate-900/60 pb-2">
              <tr>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "مخاطب (آیدی)" : "User ID"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "پکیج" : "Package"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "پیشوند" : "Prefix"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "یوزرنیم" : "Username"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "رمز" : "Password"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "کل حجم" : "Total Traffic"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "مصرف شده" : "Used Traffic"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "وضعیت" : "Status"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {accounts.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 text-sm text-gray-300 font-mono">{acc.userId || '-'}</td>
                  <td className="px-4 py-3 text-sm text-white font-bold">{acc.packageTitle}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{acc.prefix || '-'}</td>
                  <td className="px-4 py-3 text-sm text-indigo-300 font-mono">{acc.username}</td>
                  <td className="px-4 py-3 text-sm text-amber-300 font-mono tracking-wider">{acc.password}</td>
                  <td className="px-4 py-3 text-sm text-gray-400 font-mono">{acc.trafficGb} GB</td>
                  <td className="px-4 py-3 text-sm text-emerald-400 font-mono">{acc.usedTrafficGb || 0} GB</td>
                  <td className="px-4 py-3 text-sm">
                    {acc.status === "active" ? (
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md text-xs">{lang === 'fa' ? 'فعال' : 'Active'}</span>
                    ) : (
                      <span className="text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md text-xs">{lang === 'fa' ? 'منقضی' : 'Expired'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => deleteAccount(acc.id)}
                      disabled={loading}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-md"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    {lang === "fa" ? "هیچ حسابی صادر نشده است." : "No accounts found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
