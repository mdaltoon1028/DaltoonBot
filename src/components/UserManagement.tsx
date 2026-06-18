import React, { useState } from "react";
import { User, SubscriptionKey } from "../types";
import { Language, translations } from "../locales";
import { 
  Search, 
  Wallet, 
  Ban, 
  CheckCircle, 
  UserPlus, 
  Smartphone, 
  Key, 
  Activity, 
  Plus, 
  Minus,
  MessageSquare,
  Trash2,
  Link2,
  Copy,
  Check,
  Eye
} from "lucide-react";

interface UserManagementProps {
  users: User[];
  keys: SubscriptionKey[];
  adjustUserWallet: (userId: number, amount: number) => void;
  toggleUserBan: (userId: number) => void;
  addNewUser: (user: User) => void;
  deleteUser: (userId: number) => void;
  deleteSubscriptionKey: (keyId: string) => void;
  addNewSubscriptionKey: (key: SubscriptionKey) => void;
  openSimulatedChat: (userId: number) => void;
  lang: Language;
}

export default function UserManagement({
  users,
  keys,
  adjustUserWallet,
  toggleUserBan,
  addNewUser,
  deleteUser,
  deleteSubscriptionKey,
  addNewSubscriptionKey,
  openSimulatedChat,
  lang
}: UserManagementProps) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState("");
  const [adjustingUser, setAdjustingUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustType, setAdjustType] = useState<"add" | "sub">("add");
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Custom manual config addition form states
  const [addingConfigForUser, setAddingConfigForUser] = useState<User | null>(null);
  const [manualPlanName, setManualPlanName] = useState("");
  const [manualSubLink, setManualSubLink] = useState("");
  const [manualTrafficLimit, setManualTrafficLimit] = useState("50");
  const [manualExpiryDays, setManualExpiryDays] = useState("30");

  // New User Form fields
  const [newUserId, setNewUserId] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newBalance, setNewBalance] = useState("");

  // Secure modal confirmation for deletes
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string | number;
    type: "user" | "key";
    title: string;
    message: string;
  } | null>(null);

  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const handleManualConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingConfigForUser) return;

    const randomId = "SUB-" + Math.floor(Math.random() * 9000 + 1000);
    const expireDate = new Date(Date.now() + (parseInt(manualExpiryDays) || 30) * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    // Auto populate a default connection string if they didn't supply one, using sub domain layout
    const generatedVless = manualSubLink.trim() || `vless://${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}@m.daltoon-server.ir:2052?security=reality&sni=google.com&fp=chrome#Daltoon-${manualPlanName || "Manual"}`;

    addNewSubscriptionKey({
      id: randomId,
      userId: addingConfigForUser.userId,
      planId: "custom",
      planName: manualPlanName.trim() || "Account Normal",
      subLink: generatedVless,
      expireDate: expireDate,
      trafficLimitGb: parseInt(manualTrafficLimit) || 50,
      trafficUsedGb: 0,
      status: "active"
    });

    setAddingConfigForUser(null);
    setManualPlanName("");
    setManualSubLink("");
    setManualTrafficLimit("50");
    setManualExpiryDays("30");
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;
    const amountNum = parseInt(adjustAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert(lang === "fa" ? "لطفا مبلغ معتبری وارد کنید." : "Please enter a valid amount.");
      return;
    }
    
    const signedAmount = adjustType === "add" ? amountNum : -amountNum;
    adjustUserWallet(adjustingUser.userId, signedAmount);
    setAdjustingUser(null);
    setAdjustAmount("");
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedId = parseInt(newUserId);
    const parsedBalance = parseInt(newBalance) || 0;
    if (isNaN(parsedId) || parsedId <= 0) {
      alert(lang === "fa" ? "لطفا شناسه عددی تلگرام معتبری وارد کنید." : "Please enter a valid Telegram User ID.");
      return;
    }
    if (!newUsername) {
      alert(lang === "fa" ? "لطفا نام کاربری را وارد کنید." : "Please enter a username.");
      return;
    }

    addNewUser({
      userId: parsedId,
      username: newUsername,
      walletBalance: parsedBalance,
      activePlansCount: 0,
      joinDate: new Date().toISOString().split("T")[0],
      status: "active"
    });

    setNewUserId("");
    setNewUsername("");
    setNewBalance("");
    setShowAddForm(false);
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userId.toString().includes(searchTerm)
  );

  return (
    <div id="users-tab" className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-[#1f2937] rounded-lg bg-[#111827] text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={t.userSearchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          {t.btnAddUser}
        </button>
      </div>

      {/* Add User Modal-like Form (collapsible) */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.formTelegramId}</label>
            <input
              type="number"
              required
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 font-mono"
              placeholder="e.g. 6536288293"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.formUsername}</label>
            <input
              type="text"
              required
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. m_reza_vpn"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.formInitialBalance}</label>
            <input
              type="number"
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 font-mono"
              placeholder="e.g. 50000"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition"
            >
              {t.formBtnSubmitUser}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-800 text-gray-300 rounded-lg text-sm hover:bg-slate-700 transition"
            >
              {t.formBtnCancel}
            </button>
          </div>
        </form>
      )}

      {/* Users table */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-slate-900 border-b border-[#1f2937]">
              <tr>
                <th className="px-5 py-3">{t.tableColTelegramId}</th>
                <th className="px-5 py-3">{t.tableColHandle}</th>
                <th className="px-5 py-3">{t.tableColWallet}</th>
                <th className="px-5 py-3">{t.tableColSubs}</th>
                <th className="px-5 py-3">{t.tableColRegDate}</th>
                <th className="px-5 py-3">{t.tableColCompliance}</th>
                <th className="px-5 py-3 text-right">{t.tableColActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2937]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    {t.noUsersMatch}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userKeys = keys.filter(k => k.userId === user.userId);
                  
                  return (
                    <tr key={user.userId} className="hover:bg-slate-900/40 transition">
                      <td className="px-5 py-4 font-mono text-xs">{user.userId}</td>
                      <td className="px-5 py-4 font-medium text-white flex items-center gap-1">
                        <span className="text-indigo-400">@</span>{user.username}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-display text-emerald-400 font-semibold">
                          <Wallet className="w-4 h-4" />
                          {user.walletBalance.toLocaleString()} {lang === "fa" ? "تومان" : "Toman"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1.5 max-w-[190px]">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold inline-block text-center ${
                            userKeys.length > 0 ? "bg-indigo-500/10 text-indigo-300" : "bg-slate-800/60 text-gray-500"
                          }`}>
                            {userKeys.length} {lang === "fa" ? "کانفیگ" : "configs"}
                          </span>
                          {userKeys.length > 0 && (
                            <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar pt-1">
                              {userKeys.map((key) => (
                                <div key={key.id} className="flex flex-col gap-1 bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 p-1.5 rounded text-[10px] transition">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="truncate text-indigo-300 font-medium font-sans max-w-[120px]" title={key.planName}>
                                      {key.planName}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(key.subLink);
                                          setCopiedKeyId(key.id);
                                          setTimeout(() => setCopiedKeyId(null), 1500);
                                        }}
                                        className="text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 p-0.5 rounded transition cursor-pointer"
                                        title={lang === "fa" ? "کپی لینک کانکشن" : "Copy connection link"}
                                      >
                                        {copiedKeyId === key.id ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => setDeleteConfirm({
                                          id: key.id,
                                          type: "key",
                                          title: lang === "fa" ? "تایید حذف کانفیگ" : "Confirm Delete Subscription",
                                          message: lang === "fa"
                                            ? `آیا از حذف دائم کانفیگ ${key.planName} (شناسه: ${key.id}) اطمینان دارید؟`
                                            : `Are you sure you want to delete config ${key.planName} (ID: ${key.id})?`
                                        })}
                                        className="text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 p-0.5 rounded transition shrink-0 cursor-pointer"
                                        title={lang === "fa" ? "حذف این کانفیگ" : "Remove this key"}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 bg-[#111827] border border-slate-800 px-1 py-0.5 rounded-sm select-all">
                                    <span className="font-mono text-[9px] text-gray-400 truncate grow" title={key.subLink}>
                                      {key.subLink}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-400">{user.joinDate}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          user.status === "active" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {user.status === "active" ? (lang === "fa" ? "فعال" : "active") : (lang === "fa" ? "مسدود" : "banned")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-1 whitespace-nowrap flex items-center justify-end gap-1 font-sans">
                        <button
                          onClick={() => {
                            setAdjustingUser(user);
                            setAdjustType("add");
                          }}
                          className="p-1 px-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-gray-300 rounded text-[11px] transition inline-flex items-center gap-0.5 cursor-pointer"
                          title="Adjust Balance"
                        >
                          <Plus className="w-3 h-3 text-emerald-400" />
                          {t.fundsAction}
                        </button>

                        <button
                          onClick={() => setAddingConfigForUser(user)}
                          className="p-1 px-2 bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/10 text-emerald-300 rounded text-[11px] transition inline-flex items-center gap-0.5 cursor-pointer"
                          title={lang === "fa" ? "افزودن کانفیگ دستی" : "Add Manual VPN Config"}
                        >
                          <Key className="w-3 h-3 text-emerald-400" />
                          {lang === "fa" ? "➕ کانفیگ" : "+ Config"}
                        </button>

                        <button
                          onClick={() => openSimulatedChat(user.userId)}
                          className="p-1 px-2 bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300 rounded text-[11px] transition inline-flex items-center gap-0.5 cursor-pointer"
                          title="Simulate Bot Chat"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {t.chatAction}
                        </button>

                        <button
                          onClick={() => toggleUserBan(user.userId)}
                          className={`p-1 px-2 rounded text-[11px] transition cursor-pointer inline-flex items-center gap-0.5 ${
                            user.status === "active"
                              ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                        >
                          <Ban className="w-3 h-3" />
                          {user.status === "active" ? t.banAction : t.unbanAction}
                        </button>

                        <button
                          onClick={() => setDeleteConfirm({
                            id: user.userId,
                            type: "user",
                            title: lang === "fa" ? "تایید حذف کاربر" : "Confirm Delete User",
                            message: lang === "fa"
                              ? `آیا از حذف کامل کاربر @${user.username} و تمام سرویس‌ها و اکانت‌های فعال وی از دالتون استور اطمینان دارید؟`
                              : `Are you sure you want to completely delete @${user.username} and all of their active subscription keys?`
                          })}
                          className="p-1 px-2.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/30 text-rose-400 hover:text-white rounded text-[11px] transition inline-flex items-center gap-0.5 cursor-pointer"
                          title={lang === "fa" ? "حذف کامل کاربر" : "Delete User Completely"}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wallet adjustment dialog (collapsible) */}
      {adjustingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-[#1f2937] p-6 rounded-xl max-w-sm w-full space-y-4">
            <h3 className="font-display font-semibold text-lg text-white">{t.adjustWalletTitle}</h3>
            <p className="text-xs text-gray-400">
              {t.adjustWalletDesc} <span className="text-indigo-400 font-semibold">@{adjustingUser.username}</span> (ID: {adjustingUser.userId}).
            </p>
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="flex gap-4">
                <label className="flex-1 flex items-center justify-center p-2 rounded-lg border border-gray-700 bg-slate-900 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="adjustType"
                    className="mr-2 accent-indigo-500"
                    checked={adjustType === "add"}
                    onChange={() => setAdjustType("add")}
                  />
                  <Plus className="w-4 h-4 text-emerald-400 mr-1" /> {t.adjustAdd}
                </label>
                <label className="flex-1 flex items-center justify-center p-2 rounded-lg border border-gray-700 bg-slate-900 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="adjustType"
                    className="mr-2 accent-indigo-500"
                    checked={adjustType === "sub"}
                    onChange={() => setAdjustType("sub")}
                  />
                  <Minus className="w-4 h-4 text-rose-400 mr-1" /> {t.adjustSub}
                </label>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.adjustAmountLabel}</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-white font-display focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. 50000"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition cursor-pointer"
                >
                  {t.adjustBtnSave}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="px-4 py-2 bg-slate-800 text-gray-300 rounded-lg text-sm hover:bg-slate-700 transition cursor-pointer"
                >
                  {t.formBtnCancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Keys List */}
      <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl">
        <h3 className="font-display font-medium text-lg mb-2 flex items-center gap-2">
          <Key className="w-5 h-5 text-indigo-400" />
          {t.activeVpnKeysTitle}
        </h3>
        <p className="text-xs text-gray-400 mb-4">{t.activeVpnKeysDesc}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {keys.filter(key => {
            if (!searchTerm) return true;
            const user = users.find(u => u.userId === key.userId);
            return (
              key.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              key.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (user && user.username.toLowerCase().includes(searchTerm.toLowerCase()))
            );
          }).map((key) => {
            const user = users.find(u => u.userId === key.userId);
            return (
              <div key={key.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-1.5 w-full bg-indigo-500"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white text-sm">{key.planName}</h4>
                    <span className="text-[10px] text-gray-400 font-mono block">Key ID: {key.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      {key.status === "active" ? (lang === "fa" ? "فعال" : "active") : (lang === "fa" ? "منقضی" : "expired")}
                    </span>
                    <button
                      onClick={() => setDeleteConfirm({
                        id: key.id,
                        type: "key",
                        title: lang === "fa" ? "تایید حذف کانفیگ" : "Confirm Delete Subscription",
                        message: lang === "fa"
                          ? `آیا از حذف دائم کانفیگ ${key.planName} (شناسه: ${key.id}) اطمینان دارید؟`
                          : `Are you sure you want to delete config ${key.planName} (ID: ${key.id})?`
                      })}
                      className="p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                      title={lang === "fa" ? "حذف کانفیگ" : "Delete VPN Subscription"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-950/40 p-2.5 rounded text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 block text-[10px] uppercase font-mono tracking-wider font-semibold">{t.keySubLinkLabel}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(key.subLink);
                        setCopiedKeyId(key.id);
                        setTimeout(() => setCopiedKeyId(null), 1500);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 p-0.5 rounded transition cursor-pointer"
                      title={lang === "fa" ? "کپی لینک" : "Copy Link"}
                    >
                      {copiedKeyId === key.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    className="bg-transparent border-none text-[10px] text-indigo-300 font-mono w-full focus:outline-none select-all"
                    value={key.subLink}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 text-gray-400 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] block">{t.keyOwnerLabel}:</span>
                    <span className="text-white font-mono font-medium">@{user?.username || key.userId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] block">{t.keyExpiryLabel}:</span>
                    <span className="text-gray-300 font-mono">{key.expireDate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Configuration Adder Dialog Modal */}
      {addingConfigForUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-[#1f2937] p-6 rounded-xl max-w-md w-full space-y-4">
            <h3 className="font-display font-semibold text-lg text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              {lang === "fa" ? "ثبت کانفیگ دستی جدید" : "Create Manual VPN Config"}
            </h3>
            <p className="text-xs text-gray-400">
              {lang === "fa" 
                ? "یک کانفیگ اختصاصی یا لینک اتصال دلخواه برای این کاربر ایجاد و ثبت کنید." 
                : "Create a custom connection link or account subscription for this client."}
              <br />
              {lang === "fa" ? "کاربر هدف:" : "Target User:"}{" "}
              <span className="text-indigo-400 font-semibold font-mono">@{addingConfigForUser.username} (ID: {addingConfigForUser.userId})</span>
            </p>

            <form onSubmit={handleManualConfigSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                  {lang === "fa" ? "نام پلن / مدت دوره" : "Plan Title / Label"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === "fa" ? "مثلا: ۱ ماهه ۵۰ گیگ یا VIP" : "e.g. Monthly 50GB, VIP"}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 font-sans"
                  value={manualPlanName}
                  onChange={(e) => setManualPlanName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                  {lang === "fa" ? "لینک کانکشن (Vless / Trojan / SS)" : "Connection Link (Vless / Trojan / SS)"}
                </label>
                <textarea
                  placeholder={lang === "fa" ? "لینک تولید شده در x-ui را اینجا پیست کنید (در صورت خالی بودن، لینک تصادفی ساخته میشود)" : "Paste connection link here (if left empty, a mock link is generated)"}
                  rows={3}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-xs text-indigo-300 font-mono focus:ring-1 focus:ring-indigo-500 font-sans"
                  value={manualSubLink}
                  onChange={(e) => setManualSubLink(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                    {lang === "fa" ? "حجم مجاز (گیگابایت)" : "Traffic Cap (GB)"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-white font-sans"
                    value={manualTrafficLimit}
                    onChange={(e) => setManualTrafficLimit(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                    {lang === "fa" ? "مدت زمان (روز)" : "Validity (Days)"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-white font-sans"
                    value={manualExpiryDays}
                    onChange={(e) => setManualExpiryDays(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 font-sans">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === "fa" ? "ثبت کانفیگ" : "Create Subscription"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddingConfigForUser(null)}
                  className="px-4 py-2 bg-slate-800 text-gray-300 rounded-lg text-sm hover:bg-slate-700 transition cursor-pointer"
                >
                  {t.formBtnCancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern, state-based, non-blocking confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-[#111827] border border-[#1f2937] p-6 rounded-xl max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-display font-semibold text-base text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400 animate-pulse" />
              {deleteConfirm.title}
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              {deleteConfirm.message}
            </p>
            <div className="flex gap-2 pt-2 justify-end text-xs">
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === "user") {
                    deleteUser(deleteConfirm.id as number);
                  } else {
                    deleteSubscriptionKey(deleteConfirm.id as string);
                  }
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition cursor-pointer"
              >
                {lang === "fa" ? "تایید و حذف دائم" : "Yes, Permanently Delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg transition cursor-pointer"
              >
                {lang === "fa" ? "انصراف" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
