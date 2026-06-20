import React, { useState } from "react";
import { ColleaguePackage, ColleagueAccount } from "../types";
import { Plus, Trash, Copy, CheckCircle2, Ticket, RotateCcw, Pencil, AlertCircle, X } from "lucide-react";

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

  const [localToast, setLocalToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setLocalToast({ message, type });
    setTimeout(() => setLocalToast(null), 4000);
  };

  // Package Form
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [editPackageId, setEditPackageId] = useState<string | null>(null);
  const [pTitle, setPTitle] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pTraffic, setPTraffic] = useState("");
  const [pDesc, setPDesc] = useState("");

  // Account Form
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [aTraffic, setATraffic] = useState("");

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
        showToast(lang === "fa" ? "بسته با موفقیت ذخیره شد." : "Package saved successfully.", "success");
      } else {
        showToast(data.error, "error");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
    setLoading(false);
  };

  const deletePackage = async (id: string) => {
    setConfirmAction({
      message: lang === "fa" ? "آیا از حذف این بسته اطمینان دارید؟" : "Are you sure you want to delete this package?",
      onConfirm: async () => {
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
            showToast(lang === "fa" ? "بسته با موفقیت حذف شد." : "Package deleted successfully.", "success");
          } else {
            showToast(data.error, "error");
          }
        } catch (err: any) {
          showToast(err.message, "error");
        }
        setLoading(false);
      }
    });
  };

  const deleteAccount = async (id: string) => {
    setConfirmAction({
      message: lang === "fa" ? "آیا از حذف این حساب مستقل همکار اطمینان دارید؟" : "Are you sure you want to delete this colleague account?",
      onConfirm: async () => {
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
            showToast(lang === "fa" ? "حساب همکار حذف شد." : "Account deleted successfully.", "success");
          } else {
            showToast(data.error, "error");
          }
        } catch (err: any) {
          showToast(err.message, "error");
        }
        setLoading(false);
      }
    });
  };

  const resetAccount = async (id: string) => {
    setConfirmAction({
      message: lang === "fa" ? "آیا از ریست کردن نام کاربری و رمز عبور این حساب همکار اطمینان دارید؟" : "Are you sure you want to reset credentials for this account?",
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/colleague-accounts/reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
          });
          const data = await res.json();
          if (data.success) {
            setAccounts(data.colleagueAccounts);
            showToast(lang === "fa" ? "مشخصات اتصال نمایندگی با موفقیت ریست شد." : "Credentials reset successfully.", "success");
          } else {
            showToast(data.error, "error");
          }
        } catch (err: any) {
          showToast(err.message, "error");
        }
        setLoading(false);
      }
    });
  };

  const saveAccount = async () => {
    if (!editAccountId || !aTraffic) return;
    setLoading(true);
    try {
      const res = await fetch("/api/colleague-accounts/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editAccountId, trafficGb: Number(aTraffic) })
      });
      const data = await res.json();
      if (data.success) {
        setAccounts(data.colleagueAccounts);
        setEditAccountId(null);
        showToast(lang === "fa" ? "تغییرات با موفقیت ذخیره شد." : "Changes saved successfully.", "success");
      } else {
        showToast(data.error, "error");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
    setLoading(false);
  };

  const resetAccountUsage = async () => {
    if (!editAccountId) return;
    setConfirmAction({
      message: lang === "fa" ? "آیا از صفر کردن حجم مصرفی همکار اطمینان دارید؟" : "Are you sure you want to reset usage to zero?",
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/colleague-accounts/reset-usage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editAccountId })
          });
          const data = await res.json();
          if (data.success) {
            setAccounts(data.colleagueAccounts);
            setEditAccountId(null);
            showToast(lang === "fa" ? "حجم مصرفی همکار با موفقیت صفر شد." : "Usage reset successfully.", "success");
          } else {
            showToast(data.error, "error");
          }
        } catch (err: any) {
          showToast(err.message, "error");
        }
        setLoading(false);
      }
    });
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

          <div className="overflow-y-auto max-h-[600px] custom-scrollbar pr-2">
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
        </div>
      )}

      {activeTab === "accounts" && (
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-right" dir="rtl">
            <thead className="bg-slate-900/60 pb-2">
              <tr>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "مخاطب (آیدی)" : "User ID"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "پکیج" : "Package"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "پیشوند" : "Prefix"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "یوزرنیم" : "Username"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "رمز" : "Password"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "کل حجم" : "Total Traffic"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "تخصیص داده شده" : "Allocated"}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-xs">{lang === "fa" ? "مجموع مصرف کاربر" : "Real Usage"}</th>
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
                  <td className="px-4 py-3 text-sm text-blue-400 font-mono">{acc.usedTrafficGb || 0} GB</td>
                  <td className="px-4 py-3 text-sm text-rose-400 font-mono">{acc.realUsedTrafficGb || 0} GB</td>
                  <td className="px-4 py-3 text-sm">
                    {acc.status === "active" ? (
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md text-xs">{lang === 'fa' ? 'فعال' : 'Active'}</span>
                    ) : (
                      <span className="text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md text-xs">{lang === 'fa' ? 'منقضی' : 'Expired'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => resetAccount(acc.id)}
                        disabled={loading}
                        title={lang === "fa" ? "ریست نام کاربری و رمز عبور" : "Reset Credentials"}
                        className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-md"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditAccountId(acc.id);
                          setATraffic(String(acc.trafficGb));
                        }}
                        disabled={loading}
                        title={lang === "fa" ? "ویرایش حجم حساب" : "Edit Account Traffic"}
                        className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-md"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteAccount(acc.id)}
                        disabled={loading}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-md"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">
                    {lang === "fa" ? "هیچ حسابی صادر نشده است." : "No accounts found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editAccountId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-bold">{lang === "fa" ? "ویرایش حجم حساب همکار" : "Edit Account Traffic"}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">{lang === "fa" ? "کل حجم (گیگابایت)" : "Total Traffic (GB)"}</label>
                <input type="number" value={aTraffic} onChange={e => setATraffic(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" dir="ltr" />
                <p className="text-xs text-gray-400 mt-2">
                  {lang === "fa" ? "با افزایش این عدد، سقف مجاز همکار برای ایجاد کاربر افزایش می‌یابد." : "Increasing this value expands the colleague's limit for creating users."}
                </p>
              </div>

              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={resetAccountUsage}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg font-bold text-sm transition flex gap-2 items-center justify-center"
                >
                  <RotateCcw className="w-4 h-4" />
                  {lang === "fa" ? "صفر کردن حجم مصرفی همکار" : "Reset Usage to Zero"}
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-2 bg-slate-900/50">
              <button
                onClick={() => setEditAccountId(null)}
                className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm font-bold text-gray-300 transition"
              >
                {lang === "fa" ? "انصراف" : "Cancel"}
              </button>
              <button
                onClick={saveAccount}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
              >
                {loading ? "..." : (lang === "fa" ? "ذخیره تغییرات" : "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      {localToast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fadeIn flex items-center gap-2.5 bg-[#141b2d] border border-slate-800 rounded-xl px-4 py-3 shadow-2xl text-xs max-w-sm text-right font-sans" dir="rtl">
          <div className={`p-1.5 rounded-full ${localToast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <p className="font-sans text-gray-200">{localToast.message}</p>
        </div>
      )}

      {/* Confirmation Modal Container */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-slate-900/80 border border-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-sm space-y-4" dir={lang === "fa" ? "rtl" : "ltr"}>
            <div className="flex items-center gap-2 text-amber-400 border-b border-white/5 pb-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                {lang === "fa" ? "تایید نهایی عملیات" : "Confirm Operation"}
              </h3>
            </div>
            
            <p className="text-white text-sm font-medium leading-relaxed font-sans">
              {confirmAction.message}
            </p>

            <div className="flex items-center gap-3 pt-4 font-sans">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-gray-300 rounded-xl text-sm font-medium transition-all duration-200"
              >
                {lang === "fa" ? "انصراف" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="flex-1 px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 backdrop-blur-md text-indigo-300 rounded-xl text-sm font-medium transition-all duration-200 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                {lang === "fa" ? "تایید" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
