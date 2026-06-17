import React, { useState } from "react";
import { VpnPlan } from "../types";
import { Language } from "../locales";
import { 
  Server, 
  Layers, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  PlusCircle, 
  X, 
  Check, 
  Copy, 
  AlertTriangle,
  Send,
  Sparkles
} from "lucide-react";

interface ServerManagementProps {
  vpnPlans: VpnPlan[];
  setVpnPlans: React.Dispatch<React.SetStateAction<VpnPlan[]>>;
  lang: Language;
}

export default function ServerManagement({
  vpnPlans,
  setVpnPlans,
  lang
}: ServerManagementProps) {
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states for the VPN package
  const [planName, setPlanName] = useState("");
  const [planMonths, setPlanMonths] = useState("1");
  const [planTraffic, setPlanTraffic] = useState("50");
  const [planPrice, setPlanPrice] = useState("135000"); // in Toman
  const [planCategory, setPlanCategory] = useState<"Standard" | "VIP" | "Unlimited VoIP">("Standard");
  
  // Single config input stock list management inside the major form
  const [singleConfigLink, setSingleConfigLink] = useState("");
  const [currentStockList, setCurrentStockList] = useState<string[]>([]);
  
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Safe Inline Deletion confirmation
  const [confirmDeletingId, setConfirmDeletingId] = useState<string | null>(null);

  // Dynamic quick-add input list per plan
  const [quickAddInputs, setQuickAddInputs] = useState<{ [planId: string]: string }>({});

  // Add individual config to main form list
  const handleAddSingleConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const link = singleConfigLink.trim();
    if (!link) return;

    if (link.includes("\n")) {
      const parts = link.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      setCurrentStockList(prev => [...prev, ...parts]);
    } else {
      setCurrentStockList(prev => [...prev, link]);
    }
    setSingleConfigLink("");
  };

  const handleRemoveSingleConfig = (index: number) => {
    setCurrentStockList(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyConfig = (link: string, idx: number) => {
    navigator.clipboard.writeText(link);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const startCreateNewPlan = () => {
    setEditingPlanId(null);
    setPlanName("");
    setPlanMonths("1");
    setPlanTraffic("50");
    setPlanPrice("135000");
    setPlanCategory("Standard");
    setCurrentStockList([]);
    setFormError("");
    setFormSuccess(false);
    setShowAddForm(true);
  };

  const startEditPlan = (plan: VpnPlan) => {
    setEditingPlanId(plan.id);
    setPlanName(plan.name);
    setPlanMonths(String(plan.durationMonths));
    setPlanTraffic(String(plan.trafficGb));
    setPlanPrice(String(plan.price));
    setPlanCategory(plan.category);
    setCurrentStockList(plan.configStock || []);
    setFormError("");
    setFormSuccess(false);
    setShowAddForm(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess(false);

    if (!planName.trim()) {
      setFormError(lang === "fa" ? "نام بسته نمی‌تواند خالی باشد." : "Plan name is required.");
      return;
    }

    const priceNum = Number(planPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError(lang === "fa" ? "مبلغ معتبر وارد کنید." : "Invalid pricing value.");
      return;
    }

    const idToUse = editingPlanId || "plan_" + Math.random().toString(36).substring(2, 8);

    const targetPlan: VpnPlan = {
      id: idToUse,
      name: planName.trim(),
      durationMonths: Number(planMonths) || 1,
      trafficGb: Number(planTraffic) || 30,
      price: priceNum,
      category: planCategory,
      configStock: currentStockList
    };

    try {
      const response = await fetch("/api/vpn-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetPlan)
      });
      const data = await response.json();
      if (data.success) {
        setVpnPlans(data.vpnPlans || []);
        setFormSuccess(true);
        setTimeout(() => {
          setFormSuccess(false);
          setShowAddForm(false);
        }, 1500);
      } else {
        setFormError(lang === "fa" ? "خطا در ثبت نهایی پایگاه داده." : "Error writing backend state.");
      }
    } catch (err) {
      setFormError(lang === "fa" ? "خطا در انتقال اطلاعات با سرور." : "Communication lost with backend container.");
    }
  };

  const handleDeletePlanConfirm = async (id: string) => {
    try {
      const response = await fetch("/api/vpn-plans/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await response.json();
      if (data.success) {
        setVpnPlans(data.vpnPlans || []);
        setConfirmDeletingId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick append a single config directly from the main lists
  const handleQuickAddSubmit = async (planId: string) => {
    const linkToAdd = (quickAddInputs[planId] || "").trim();
    if (!linkToAdd) return;

    // Find the original plan object
    const originalPlan = vpnPlans.find(p => p.id === planId);
    if (!originalPlan) return;

    let parsedLinks: string[] = [];
    if (linkToAdd.includes("\n")) {
      parsedLinks = linkToAdd.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    } else {
      parsedLinks = [linkToAdd];
    }

    const updatedStock = [...(originalPlan.configStock || []), ...parsedLinks];
    const targetPlan: VpnPlan = {
      ...originalPlan,
      configStock: updatedStock
    };

    try {
      const response = await fetch("/api/vpn-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetPlan)
      });
      const data = await response.json();
      if (data.success) {
        setVpnPlans(data.vpnPlans || []);
        // Reset quick input state
        setQuickAddInputs(prev => ({ ...prev, [planId]: "" }));
      }
    } catch (err) {
      console.error("Failed quick adding configs:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sleek Header cards displaying plan statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
              {lang === "fa" ? "کل بسته‌های تعریف شده" : "Total Active Packages"}
            </span>
            <h3 className="text-2xl font-bold font-mono text-white mt-1">
              {vpnPlans.length}
            </h3>
            <p className="text-[11px] text-indigo-400 font-medium font-sans">
              {lang === "fa" ? "بسته‌های فعال در ربات تلگرام" : "Active plans for customer purchase"}
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
              {lang === "fa" ? "کل کانفیگ‌های فعال انبار" : "Total Config Stock"}
            </span>
            <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {vpnPlans.reduce((acc, curr) => acc + (curr.configStock ? curr.configStock.length : 0), 0)}
            </h3>
            <p className="text-[11px] text-emerald-400/80 font-mono">
              {lang === "fa" ? "آماده تحویل آنی پس از پرداخت" : "Ready in FIFO pool"}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Server className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
              {lang === "fa" ? "موتور توزیع کننده هوشمند" : "FIFO Auto Delivery"}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-bold text-white font-mono uppercase">ONLINE 🚀</span>
            </div>
            <p className="text-[11px] text-gray-400 font-sans">
              {lang === "fa" ? "تحویل کانفیگ تکی به مشتری" : "No overlap client config distribution"}
            </p>
          </div>
          <div className="p-3 bg-[#e0a82e]/10 text-[#e0a82e] rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Single Column Layout representing customized VPN lists and replenishment tools */}
      <div className="space-y-6">
        
        {/* Main Action Bar */}
        {!showAddForm && (
          <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-2xl flex sm:flex-row flex-col gap-3 justify-between items-start sm:items-center">
            <div>
              <h4 className="font-semibold text-white text-sm">
                {lang === "fa" ? "بسته‌های فروش و موجودی کانفیگ اختصاصی مشتریان" : "Client Purchase Packages & Dedicated Config Stocks"}
              </h4>
              <p className="text-xs text-gray-400">
                {lang === "fa" ? "این بسته‌ها درون ربات تلگرام با شارژ کیف پول تایید شده اتوماتیک ارائه می‌گردند." : "Configs are automatically pulled out of these pools upon checkout."}
              </p>
            </div>
            <button
              type="button"
              onClick={startCreateNewPlan}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              {lang === "fa" ? "تعریف بسته جدید" : "Create New VPN Plan"}
            </button>
          </div>
        )}

        {/* New Plan / Edit Plan Form */}
        {showAddForm && (
          <div className="bg-[#111827] border-2 border-indigo-500/30 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-white text-md">
                  {editingPlanId 
                    ? (lang === "fa" ? "✏️ ویرایش مشخصات بسته و انبار کانفیگ" : "✏️ Edit VPN Package & Stock Block") 
                    : (lang === "fa" ? "➕ جزئیات و ساخت بسته جدید اشتراکی" : "➕ Spec out New Subscription Package")}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">{lang === "fa" ? "نام بسته (برنزی، VIP طلایی، گیمینگ)" : "Display Name"}</label>
                  <input
                    type="text"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                    value={planName}
                    placeholder={lang === "fa" ? "مثال: استاندارد ۱ ماهه ۵۰ گیگابایت" : "Standard Promo Pack 50GB"}
                    onChange={(e) => setPlanName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">{lang === "fa" ? "دسته‌بندی پنل" : "Access Category Tier"}</label>
                  <select
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                    value={planCategory}
                    onChange={(e) => setPlanCategory(e.target.value as any)}
                  >
                    <option value="Standard">Standard</option>
                    <option value="VIP">VIP</option>
                    <option value="Unlimited VoIP">Unlimited VoIP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">{lang === "fa" ? "حجم (گیگابایت)" : "Volume Size (GB)"}</label>
                  <input
                    type="number"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                    value={planTraffic}
                    onChange={(e) => setPlanTraffic(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">{lang === "fa" ? "مدت زمان (به ماه)" : "Duration (Months)"}</label>
                  <input
                    type="number"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                    value={planMonths}
                    onChange={(e) => setPlanMonths(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">{lang === "fa" ? "قیمت مصرف کننده (تومان)" : "Selling Price (Tomans)"}</label>
                  <input
                    type="number"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-yellow-300 focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* ADVANCED: Dynamic One-by-one Configs Stock List Builder */}
              <div className="bg-[#0e1420] border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="text-xs font-bold text-gray-200">
                      {lang === "fa" ? "🔑 مخزن کانفیگ‌های اختصاصی آماده" : "🔑 Pre-built Encrypted Connection Links"}
                    </h5>
                    <p className="text-[10px] text-gray-500">
                      {lang === "fa" 
                        ? "کانفیگ‌ها را اینجا دانه به دانه اضافه کنید. ربات به نوبت پس از پرداخت تحویل می‌دهد." 
                        : "Input or copy-paste configs individually below. Configs are consumed strictly FIFO."}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold bg-indigo-950 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded-lg">
                    {lang === "fa" ? `${currentStockList.length} کانفیگ آماده` : `${currentStockList.length} active links`}
                  </span>
                </div>

                {/* Input form for links */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-[#101625] border border-slate-700 rounded-lg p-2.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-emerald-500"
                    placeholder={lang === "fa" ? "کانفیگ آماده را پیست کنید... (vless:// , vmess:// , trojan://)" : "Paste link e.g. vless://uuid@host:port..."}
                    value={singleConfigLink}
                    onChange={(e) => setSingleConfigLink(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSingleConfig();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSingleConfig()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 shrink-0 shadow active:scale-95 transition"
                  >
                    <Plus className="w-4 h-4" />
                    {lang === "fa" ? "افزودن" : "Add Link"}
                  </button>
                </div>

                {/* Scrollable stock list to delete item-by-item */}
                <div className="bg-[#0b0e17] border border-slate-900 rounded-lg p-3 max-h-[180px] overflow-y-auto space-y-2 no-scrollbar">
                  {currentStockList.length === 0 ? (
                    <p className="text-[11px] text-gray-500 text-center py-4 font-medium">
                      {lang === "fa" ? "⚠️ انبار این بسته خالی است. کانفیگ‌های جدید را در کادر بالا اضافه کنید." : "⚠️ Out of Stock! No configs populated for this plan yet."}
                    </p>
                  ) : (
                    currentStockList.map((link, idx) => (
                      <div key={idx} className="bg-[#111827] border border-slate-800 p-2 rounded-lg flex justify-between items-center gap-3 text-xs">
                        <div className="font-mono text-gray-400 truncate flex-1 flex items-center gap-2 select-all pr-1">
                          <span className="text-[9px] font-bold text-indigo-400 bg-indigo-950 px-1 py-0.5 rounded mt-0.5 shrink-0">#{idx + 1}</span>
                          <span className="truncate">{link}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyConfig(link, idx)}
                            className="p-1 bg-gray-800 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition cursor-pointer"
                            title="Copy connection link"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSingleConfig(idx)}
                            className="p-1 bg-gray-800 rounded hover:bg-rose-950 text-rose-400 hover:text-white transition cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {copiedIndex !== null && (
                  <p className="text-[10px] text-emerald-400 font-semibold transition text-right">
                    {lang === "fa" ? "لینک کانفیگ با موفقیت کپی شد!" : "Config link copied to clipboard!"}
                  </p>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-rose-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-lg text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  {lang === "fa" ? "اطلاعات بسته با موفقیت با هسته تلگرام مجیک همگام شد!" : "VPN subscription details stored and synchronized!"}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition"
                >
                  <Save className="w-4 h-4" />
                  {editingPlanId ? (lang === "fa" ? "ثبت نهایی تغییرات بسته" : "Save Changes") : (lang === "fa" ? "ایجاد و ذخیره نهایی بسته" : "Generate & Launch Package")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition"
                >
                  {lang === "fa" ? "انصراف" : "Cancel"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List of active subscription plans */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-2xl space-y-4">
          <h4 className="text-xs uppercase font-mono tracking-wider text-gray-400 font-semibold flex justify-between items-center border-b border-gray-800 pb-2">
            <span>{lang === "fa" ? "بسته‌های فعال و وضعیت انبار کانفیگ‌های اختصاصی:" : "Config Stock pools & pricing matrix:"}</span>
            <span className="bg-[#1f2937] text-indigo-400 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold">{vpnPlans.length}</span>
          </h4>

          {vpnPlans.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-xl space-y-2 border border-dashed border-gray-800">
              <Layers className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-gray-400 text-sm font-semibold">
                {lang === "fa" ? "هیچ بسته‌ای در پایگاه اتصال تعریف نشده است." : "No packages listed inside the sqlite database pool."}
              </p>
              <button
                onClick={startCreateNewPlan}
                className="mt-2 text-indigo-400 text-xs font-bold hover:underline"
              >
                {lang === "fa" ? "تعریف اولین پلن VPN" : "Define your first VPN plan spec"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {vpnPlans.map((plan) => {
                const stockLength = plan.configStock ? plan.configStock.length : 0;
                const isConfirmDeleting = confirmDeletingId === plan.id;

                return (
                  <div key={plan.id} className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 space-y-4 shadow-sm">
                    
                    {/* Package Info Header */}
                    <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-3 border-b border-gray-900 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-white">{plan.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider">
                            {plan.category.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            (${plan.durationMonths} {lang === "fa" ? "ماه" : "Months"} / ${plan.trafficGb}GB)
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {lang === "fa" ? "قیمت خرید مشتری: " : "Selling price: "}
                          <span className="text-yellow-400 font-bold font-mono text-sm">{plan.price.toLocaleString()}</span>
                          <span className="text-[11px] text-gray-500"> {lang === "fa" ? "تومان" : "Toman"}</span>
                        </div>
                      </div>

                      {/* Package Actions / Delete Confirms (NO WINDOW.CONFIRM) */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isConfirmDeleting ? (
                          <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-900/50 p-1.5 rounded-lg">
                            <span className="text-[11px] text-rose-300 font-medium">
                              {lang === "fa" ? "حذف کامل؟" : "Confirm delete?"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeletePlanConfirm(plan.id)}
                              className="px-2 py-1 bg-red-650 hover:bg-red-500 text-white rounded text-[11px] font-medium cursor-pointer"
                            >
                              {lang === "fa" ? "بله" : "Yes"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeletingId(null)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded text-[11px] cursor-pointer"
                            >
                              {lang === "fa" ? "خیر" : "No"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditPlan(plan)}
                              className="bg-gray-900 border border-slate-800 hover:bg-gray-800 p-2.5 rounded-xl text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1 text-xs"
                              title="Edit specifications"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-sans">{lang === "fa" ? "ویرایش پلن" : "Edit Plan"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeletingId(plan.id)}
                              className="bg-gray-900 border border-slate-800 hover:bg-rose-950 hover:border-rose-900 p-2.5 rounded-xl text-rose-400 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs"
                              title="Delete package spec"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-sans">{lang === "fa" ? "حذف" : "Delete"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stock Status info and Quick, one-by-one addition toolbar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      
                      {/* Left: Stock indicator & List of available item indices */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-semibold">
                            {lang === "fa" ? "📦 وضعیت فعلی انبار کانفیگ:" : "📦 Core Config Stock:"}
                          </span>
                          {stockLength > 0 ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold">
                              {stockLength} {lang === "fa" ? "کانفیگ قابل فروش" : "configs in pool"}
                            </span>
                          ) : (
                            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider animate-pulse uppercase">
                              {lang === "fa" ? "⚠️ ناموجود (نیازمند شارژ)" : "⚠️ OUT OF STOCK"}
                            </span>
                          )}
                        </div>

                        {/* List/Compact overview of links in this package */}
                        <div className="bg-[#0b0e17] border border-slate-900 rounded-xl p-2.5 max-h-[110px] overflow-y-auto space-y-1.5 no-scrollbar">
                          {stockLength === 0 ? (
                            <div className="text-[11px] text-gray-500 text-center py-5 font-medium">
                              {lang === "fa" ? "انبار خالی است. لطفا یکی یکی اضافه کنید." : "No configs in pool. Recharge now."}
                            </div>
                          ) : (
                            plan.configStock?.map((link, idx) => (
                              <div key={idx} className="bg-[#121824] border border-slate-900 p-1.5 rounded flex justify-between items-center text-xs font-mono">
                                <span className="truncate text-gray-400 max-w-[85%]">
                                  <strong className="text-indigo-400 mr-2 font-sans font-bold">#{idx + 1}</strong>
                                  {link}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyConfig(link, idx)}
                                  className="text-gray-500 hover:text-white transition p-1 hover:bg-slate-800 rounded cursor-pointer"
                                  title="Copy configuration link"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Right: Quick One-By-One Addition Interface */}
                      <div className="bg-slate-900/40 border border-slate-800/60 p-3 rounded-2xl flex flex-col justify-between space-y-2.5">
                        <div>
                          <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                            {lang === "fa" ? "➕ افزودن کانفیگ جدید به انبار این بسته (تکی یا تند تند)" : "➕ Quick Add New Dedicated Config to Pool"}
                          </label>
                          <p className="text-[10px] text-gray-500">
                            {lang === "fa" ? "به محض وارد کردن در پایگاه داده تلگرام شارژ می‌شود." : "Recharges subscription list dynamically instantly."}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 bg-[#101625] border border-slate-800 rounded-lg py-2 px-3 text-xs text-gray-300 font-mono focus:outline-none focus:border-indigo-400 placeholder:text-gray-600"
                            placeholder={lang === "fa" ? "مثال: vless://7c30f4a..." : "vless://..."}
                            value={quickAddInputs[plan.id] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQuickAddInputs(prev => ({ ...prev, [plan.id]: val }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleQuickAddSubmit(plan.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickAddSubmit(plan.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg cursor-pointer flex items-center justify-center transition active:scale-95 shrink-0"
                            title="Add Link to stock list"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
