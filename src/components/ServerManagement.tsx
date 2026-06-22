import React, { useState, useRef, useEffect } from "react";
import { VpnPlan, PanelSettings, InboundInfo, PlanCategory } from "../types";
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
  Cpu,
  RefreshCw,
  Activity,
  ChevronDown,
  ChevronUp,
  Sparkles
} from "lucide-react";

interface ServerManagementProps {
  vpnPlans: VpnPlan[];
  setVpnPlans: React.Dispatch<React.SetStateAction<VpnPlan[]>>;
  planCategories: PlanCategory[];
  setPlanCategories: React.Dispatch<React.SetStateAction<PlanCategory[]>>;
  lang: Language;
  settings: PanelSettings;
  onSaveSettings: (settings: PanelSettings) => void;
  inbounds: InboundInfo[];
  setInbounds: React.Dispatch<React.SetStateAction<InboundInfo[]>>;
}

export default function ServerManagement({
  vpnPlans,
  setVpnPlans,
  planCategories,
  setPlanCategories,
  lang,
  settings,
  onSaveSettings,
  inbounds,
  setInbounds
}: ServerManagementProps) {
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAddForm && formRef.current) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [showAddForm, editingPlanId]);

  // Form states for the VPN package
  const [planName, setPlanName] = useState("");
  const [planDays, setPlanDays] = useState("30");
  const [planTraffic, setPlanTraffic] = useState("50");
  const [planPrice, setPlanPrice] = useState("135000"); // in Toman
  const [planCategory, setPlanCategory] = useState<string>("Standard");
  
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // Category management states
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("⚡️");
  const [catError, setCatError] = useState("");
  const [isAddingCat, setIsAddingCat] = useState(false);

  // Safe Inline Deletion confirmation
  const [confirmDeletingId, setConfirmDeletingId] = useState<string | null>(null);

  // 3x-ui Panel connection states
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || "");
  const [subUrl, setSubUrl] = useState(settings.subUrl || "");
  const [panelUsername, setPanelUsername] = useState(settings.panelUsername || "");
  const [panelPassword, setPanelPassword] = useState(settings.panelPassword || "");
  const [testStatus, setTestStatus] = useState<{ type: "success" | "error" | "loading" | "idle"; message: string }>({ type: "idle", message: "" });
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error" | "loading" | "idle"; message: string }>({ type: "idle", message: "" });
  
  // Collapse/Expand state for Inbounds display option
  const [showInbounds, setShowInbounds] = useState(false);
  const [checkedInboundIds, setCheckedInboundIds] = useState<number[]>(() => {
    return settings.activeInboundIds || [];
  });
  const [inboundsSuccess, setInboundsSuccess] = useState(false);

  // Group Inbounds States
  const [isGroupInboundsEnabled, setIsGroupInboundsEnabled] = useState(settings.isGroupInboundsEnabled || false);
  const [inboundGroups, setInboundGroups] = useState<any[]>(settings.inboundGroups || []);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupInboundIds, setGroupInboundIds] = useState<number[]>([]);
  const [groupPlanIds, setGroupPlanIds] = useState<string[]>([]);
  const [groupError, setGroupError] = useState("");

  // Sync inputs with parent settings prop changes
  useEffect(() => {
    setBaseUrl(settings.baseUrl || "");
    setSubUrl(settings.subUrl || "");
    setPanelUsername(settings.panelUsername || "");
    setPanelPassword(settings.panelPassword || "");
    setCheckedInboundIds(settings.activeInboundIds || []);
    setIsGroupInboundsEnabled(settings.isGroupInboundsEnabled || false);
    setInboundGroups(settings.inboundGroups || []);
  }, [settings]);

  const handleDisconnectConfiguration = () => {
    try {
      setTestStatus({ type: "idle", message: "" });
      onSaveSettings({
        ...settings,
        baseUrl: "",
        subUrl: "",
        panelUrl: "",
        panelUsername: "",
        panelPassword: "",
        panelConnectionActive: false,
        activeInboundIds: []
      });
      setBaseUrl("");
      setSubUrl("");
      setPanelUsername("");
      setPanelPassword("");
      setCheckedInboundIds([]);
      setTestStatus({
        type: "error",
        message: lang === "fa" ? "🔌 اتصال با موفقیت قطع شد و اطلاعات پاک شدند." : "🔌 Connection disconnected and credentials cleared."
      });
      setTimeout(() => {
        setTestStatus({ type: "idle", message: "" });
      }, 3500);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveConfiguration = () => {
    setSaveStatus({ type: "loading", message: "" });
    try {
      onSaveSettings({
        ...settings,
        baseUrl,
        subUrl,
        panelUrl: baseUrl,
        panelUsername,
        panelPassword,
        activeInboundIds: checkedInboundIds,
        isGroupInboundsEnabled,
        inboundGroups
      });
      setSaveStatus({
        type: "success",
        message: lang === "fa" ? "✅ اطلاعات پنل ۳x-ui با موفقیت ذخیره شد." : "✅ Panel configuration saved successfully."
      });
      setTimeout(() => {
        setSaveStatus({ type: "idle", message: "" });
      }, 3500);
    } catch (err: any) {
      setSaveStatus({
        type: "error",
        message: lang === "fa" ? "❌ خطا در ذخیره اطلاعات." : "❌ Failed to save configuration."
      });
    }
  };

  const handleAddOrEditInboundGroup = (group: any) => {
    setEditingGroupId(group ? group.id : "new");
    setGroupName(group ? group.name : "");
    setGroupInboundIds(group ? group.inboundIds : []);
    setGroupPlanIds(group ? group.planIds || [] : []);
    setGroupError("");
  };

  const handleSaveInboundGroup = () => {
    if (!groupName.trim()) {
      setGroupError(lang === "fa" ? "لطفا نام معتبری وارد کنید." : "Group name is required.");
      return;
    }
    if (groupInboundIds.length === 0) {
      setGroupError(lang === "fa" ? "لطفا حداقل یک اینباند انتخاب کنید." : "At least one inbound must be checked.");
      return;
    }

    let nextGroups = [...inboundGroups];
    if (editingGroupId === "new") {
      const newGroup = {
        id: "ig_" + Math.random().toString(36).substring(2, 8),
        name: groupName.trim(),
        inboundIds: groupInboundIds,
        planIds: groupPlanIds
      };
      nextGroups.push(newGroup);
    } else {
      nextGroups = nextGroups.map(g => {
        if (g.id === editingGroupId) {
          return {
            ...g,
            name: groupName.trim(),
            inboundIds: groupInboundIds,
            planIds: groupPlanIds
          };
        }
        return g;
      });
    }

    setInboundGroups(nextGroups);
    setEditingGroupId(null);
    setGroupName("");
    setGroupInboundIds([]);
    setGroupPlanIds([]);
    setGroupError("");

    // Auto save settings
    onSaveSettings({
      ...settings,
      baseUrl,
      subUrl,
      panelUrl: baseUrl,
      panelUsername,
      panelPassword,
      activeInboundIds: checkedInboundIds,
      isGroupInboundsEnabled,
      inboundGroups: nextGroups
    });
  };

  const handleDeleteInboundGroup = (id: string) => {
    const nextGroups = inboundGroups.filter(g => g.id !== id);
    setInboundGroups(nextGroups);
    // Auto save settings
    onSaveSettings({
      ...settings,
      baseUrl,
      subUrl,
      panelUrl: baseUrl,
      panelUsername,
      panelPassword,
      activeInboundIds: checkedInboundIds,
      isGroupInboundsEnabled,
      inboundGroups: nextGroups
    });
  };

  const handleTestConnection = async () => {
    setTestStatus({ 
      type: "loading", 
      message: lang === "fa" 
        ? "در حال اتصال به پنل ۳x-ui و دریافت لیست اینباندها..." 
        : "Connecting to panel and retrieving inbounds..." 
    });
    try {
      const response = await fetch("/api/xui/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          panelUsername,
          panelPassword
        })
      });
      const data = await response.json();
      if (data.success) {
        setTestStatus({ type: "success", message: data.message });
        if (Array.isArray(data.inbounds)) {
          setInbounds(data.inbounds);
          
          // Auto-select all if nothing was selected yet
          let nextChecked = checkedInboundIds;
          if (checkedInboundIds.length === 0) {
            nextChecked = data.inbounds.map((ib: any) => ib.id);
            setCheckedInboundIds(nextChecked);
          }

          // Save credentials and set connection active state automatically forever
          onSaveSettings({
            ...settings,
            baseUrl,
            subUrl,
            panelUrl: baseUrl,
            panelUsername,
            panelPassword,
            panelConnectionActive: true,
            activeInboundIds: nextChecked
          });
        } else {
          onSaveSettings({
            ...settings,
            baseUrl,
            subUrl,
            panelUrl: baseUrl,
            panelUsername,
            panelPassword,
            panelConnectionActive: true
          });
        }
      } else {
        setTestStatus({ type: "error", message: data.error });
      }
    } catch (err: any) {
      setTestStatus({ 
        type: "error", 
        message: lang === "fa" 
          ? "اتصال به هاست سرور با خطا مواجه شد. لطفاً بررسی کنید." 
          : "Could not connect to panel host address." 
      });
    }
  };

  const handleSaveInboundSelection = () => {
    setInboundsSuccess(false);
    onSaveSettings({
      ...settings,
      activeInboundIds: checkedInboundIds
    });
    setInboundsSuccess(true);
    setTimeout(() => {
      setInboundsSuccess(false);
    }, 2500);
  };

  const startCreateNewPlan = () => {
    setEditingPlanId(null);
    setPlanName("");
    setPlanDays("30");
    setPlanTraffic("50");
    setPlanPrice("135000");
    setPlanCategory("Standard");
    setFormError("");
    setFormSuccess(false);
    setShowAddForm(true);
  };

  const startEditPlan = (plan: VpnPlan) => {
    setEditingPlanId(plan.id);
    setPlanName(plan.name);
    setPlanDays(String(plan.durationDays));
    setPlanTraffic(String(plan.trafficGb));
    setPlanPrice(String(plan.price));
    setPlanCategory(plan.category);
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
      durationDays: Number(planDays) || 30,
      trafficGb: Number(planTraffic) || 30,
      price: priceNum,
      category: planCategory,
      configStock: [] // Dynamic generation from 3x-ui panel
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
        setFormError(lang === "fa" ? "خطا در ثبت اطلاعات بسته در پایگاه داده." : "Error writing backend state.");
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

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      setCatError(lang === "fa" ? "نام دسته‌بندی اجباری است" : "Category name is required");
      return;
    }
    setCatError("");
    const categoryData: Partial<PlanCategory> = {
      name: catName.trim(),
      emoji: catEmoji.trim()
    };
    if (editingCategoryId) categoryData.id = editingCategoryId;

    try {
      const response = await fetch("/api/plan-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryData)
      });
      const data = await response.json();
      if (data.success) {
        setEditingCategoryId(null);
        setCatName("");
        setIsAddingCat(false);
        // Trigger a refresh from parent or update local state
        const refreshResponse = await fetch("/api/plan-categories");
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setPlanCategories(refreshData.categories);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await fetch("/api/plan-categories/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await response.json();
      if (data.success) {
        setPlanCategories(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Get count of currently checked inbounds
  const checkedInboundCount = checkedInboundIds.length;

  return (
    <div className="space-y-6">
      {/* Sleek Header cards displaying plan statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
              {lang === "fa" ? "کل بسته‌های خرید تعریف شده" : "Total Active Packages"}
            </span>
            <h3 className="text-2xl font-bold font-mono text-white mt-1">
              {vpnPlans.length}
            </h3>
            <p className="text-[11px] text-indigo-400 font-medium font-sans">
              {lang === "fa" ? "بسته‌های فعال و هوشمند تلگرام" : "Active plans for customer purchase"}
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
              {lang === "fa" ? "تعداد اینباندهای فعال در اتصال" : "Selected Active Inbounds"}
            </span>
            <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {checkedInboundCount}
            </h3>
            <p className="text-[11px] text-emerald-400/80 font-sans">
              {lang === "fa" ? "اینباند فعال جهت ارائه اشتراک" : "Sync inbounds for subscription links"}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Server className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
              {lang === "fa" ? "تعداد دسته‌بندی‌ها" : "Plan Categories"}
            </span>
            <h3 className="text-2xl font-bold font-mono text-purple-400 mt-1">
              {planCategories.length}
            </h3>
            <p className="text-[11px] text-purple-400/80 font-sans">
              {lang === "fa" ? "گروه‌های VIP، معمولی و ..." : "Groups like VIP, Standard, etc."}
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
              {lang === "fa" ? "وضعیت: " : "Status: "}
              {settings.panelConnectionActive ? (lang === "fa" ? "روشن" : "ON") : (lang === "fa" ? "خاموش" : "OFF")}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${settings.panelConnectionActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
              <span className="text-sm font-bold text-white font-mono uppercase">
                {lang === "fa" ? "اتصال پنل" : "Panel Link"}
              </span>
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sanaei 3x-ui Panel Direct API Connection Config Block */}
      <div className="bg-gradient-to-br from-[#0c1020] to-[#121c35] border border-indigo-500/20 p-6 rounded-2xl space-y-6 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between border-b border-gray-850 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                {lang === "fa" ? "🔌 تنظیمات و احراز هویت پنل ۳x-ui" : "🔌 Sanaei 3x-ui Panel Direct API Connection"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === "fa" 
                  ? "اطلاعات پنل سنایی نسخه ۳x-ui خود را برای ساخت و تحویل اتوماتیک اکانت سابسکریپشن وارد کنید."
                  : "Configure direct integration with your Sanaei 3x-ui panel to automate instant outbound client subscription deliveries."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1">
              {lang === "fa" ? "آدرس کامل پنل (همراه با پورت و آدرس اختصاصی)" : "Panel Base URL (including Port & Path prefix)"}
            </label>
            <input
              type="text"
              className="w-full bg-[#13192e] border border-gray-700 rounded-lg p-2.5 text-sm text-indigo-300 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. https://panel.example.com:2053/secretPath"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <span className="text-[10px] text-gray-500 mt-1 block leading-relaxed">
              {lang === "fa" ? "نکته مهم: حتماً پروتکل (http/https)، پورت سرور و در صورت وجود، آدرس فرعی (مثل Daltoon/) را دقیقاً مشابه تصویر بنویسید." : "Note: Must include protocol (http/https), port, and path prefix exactly as defined in your panel login."}
            </span>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1">
              {lang === "fa" ? "لینک سابسکریپشن (اختیاری)" : "Subscription URL Prefix (Optional)"}
            </label>
            <input
              type="text"
              className="w-full bg-[#13192e] border border-gray-700 rounded-lg p-2.5 text-sm text-indigo-300 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. https://sub.example.com:2096"
              value={subUrl}
              onChange={(e) => setSubUrl(e.target.value)}
            />
            <span className="text-[10px] text-gray-500 mt-1 block leading-relaxed">
              {lang === "fa" ? "در صورتی که ساب دامین مجزا برای سابسکریپشن دارید وارد کنید (پورت یادتان نرود)." : "Enter your custom subscription domain + port if you have one."}
            </span>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-350 mb-1">
              {lang === "fa" ? "نام کاربری پنل ادمین" : "Panel Username"}
            </label>
            <input
              type="text"
              className="w-full bg-[#13192e] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
              placeholder="admin"
              value={panelUsername}
              onChange={(e) => setPanelUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-350 mb-1">
              {lang === "fa" ? "کلمه عبور پنل ادمین یا توکن" : "Panel Password or Token"}
            </label>
            <input
              type="password"
              className="w-full bg-[#13192e] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
              placeholder="••••••••"
              value={panelPassword}
              onChange={(e) => setPanelPassword(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleTestConnection}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 border border-indigo-400/20 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus.type === "loading" ? "animate-spin" : ""}`} />
              {lang === "fa" ? "استعلام و اتصال به پنل" : "Check & Connect Panel"}
            </button>
          </div>
        </div>

        {settings.panelConnectionActive && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={handleDisconnectConfiguration}
              className="w-full sm:w-auto px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-2 active:scale-95"
            >
              <X className="w-4 h-4" />
              {lang === "fa" ? "قطع اتصال از پنل ۳x-ui" : "Disconnect Connection from 3x-ui Panel"}
            </button>
          </div>
        )}

        {/* Test connection status alert feedback box */}
        {testStatus.type !== "idle" && (
          <div className={`p-3 rounded-lg text-xs leading-relaxed ${
            testStatus.type === "success" 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
              : testStatus.type === "loading"
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 animate-pulse"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
          }`}>
            <div className="flex items-center gap-1.5 font-medium">
              {testStatus.type === "success" && <Check className="w-4 h-4 shrink-0 text-emerald-400" />}
              {testStatus.type === "loading" && <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0"></span>}
              <span>{testStatus.message}</span>
            </div>
          </div>
        )}

        {/* Expandable/Collapsible Inbounds List Option */}
        {settings.panelConnectionActive && (
          <div className="border border-indigo-500/15 rounded-xl bg-slate-950/40 p-1.5 overflow-hidden transition-all duration-300">
            <button
              type="button"
              onClick={() => setShowInbounds(!showInbounds)}
              className="w-full flex items-center justify-between p-3.5 text-xs text-indigo-300 hover:text-white transition font-semibold cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>
                  {lang === "fa" 
                    ? `نمایش اینباند ها (${checkedInboundCount} انتخاب شده)` 
                    : `Show Inbounds (${checkedInboundCount} selected)`}
                </span>
              </div>
              {showInbounds ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showInbounds && (
              <div className="p-4 border-t border-indigo-500/10 space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                      {lang === "fa" ? "اینباندهای فعال پنل ۳x-ui برای ساخت اشتراک کلاینت" : "Active Panel Inbounds for Clients"}
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                      {lang === "fa" 
                        ? "اینباندهای مورد نظر را انتخاب نمایید تا کلاینت همزمان برای تمام گزینه‌ها تولید شده و تحویل داده شود." 
                        : "Check the inbounds that the dynamically generated customer credentials should be added to."}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCheckedInboundIds(inbounds.map(ib => ib.id))}
                      className="text-[9px] px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded cursor-pointer transition"
                    >
                      {lang === "fa" ? "گزینش همه" : "Select All"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckedInboundIds([])}
                      className="text-[9px] px-2 py-1 bg-gray-850 hover:bg-gray-800 text-gray-400 border border-gray-750 rounded cursor-pointer transition"
                    >
                      {lang === "fa" ? "لغو همه" : "Deselect All"}
                    </button>
                  </div>
                </div>

                {inbounds.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-500">
                      {lang === "fa" 
                        ? "⚠️ هیچ اینباندی دریافت نشد. برای لود مجدد، دکمه «استعلام و اتصال به پنل» بالا را مجدداً بزنید." 
                        : "⚠️ No inbounds retrieved yet. Please click 'Check & Connect Panel' to fetch them."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[260px] overflow-y-auto no-scrollbar pr-1 pt-1">
                    {inbounds.map((ib) => {
                      const isChecked = checkedInboundIds.includes(ib.id);
                      return (
                        <label 
                          key={ib.id} 
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                            isChecked 
                              ? "bg-indigo-950/20 border-indigo-500/40 shadow-xs shadow-indigo-500/5 hover:border-indigo-500/60" 
                              : "bg-[#111827] border-gray-800 hover:border-gray-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer shrink-0"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCheckedInboundIds(prev => [...prev, ib.id]);
                              } else {
                                setCheckedInboundIds(prev => prev.filter(id => id !== ib.id));
                              }
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-xs text-white truncate font-display">{ib.remark}</span>
                              <span className="px-1.5 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-[8px] font-bold font-mono rounded uppercase">
                                {ib.protocol}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2 text-[9px] text-gray-500 font-mono leading-tight">
                              <div>Port: <span className="text-indigo-400 font-bold">{ib.port}</span></div>
                              <div>Clients: <span className="text-white">{ib.totalClients}</span></div>
                              <div className="col-span-2">Used: <span className="text-amber-400">{ib.trafficUsed} GB</span> / {ib.trafficLimit === "unlimited" ? (lang === "fa" ? "نامحدود" : "unlimited") : `${ib.trafficLimit} GB`}</div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-800/80">
                  {inboundsSuccess && (
                    <span className="text-xs text-emerald-400 font-semibold self-center flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      {lang === "fa" ? "لیست گزینش اینباندها با موفقیت ذخیره شد." : "Inbounds preference stored successfully."}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveInboundSelection}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition active:scale-95 shadow-md flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    {lang === "fa" ? "ذخیره و ثبت نهایی اینباندها" : "Save Inbounds Selection"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Centered Save Information button exactly below this card */}
      <div className="flex flex-col items-center justify-center pt-2 pb-4 space-y-2.5">
        <button
          type="button"
          onClick={handleSaveConfiguration}
          className="mx-auto px-10 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm transition-all duration-300 shadow-lg hover:shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-2.5 active:scale-95 min-w-[220px]"
        >
          <Save className="w-4.5 h-4.5" />
          {lang === "fa" ? "ذخیره اطلاعات پنل" : "Save Panel Information"}
        </button>

        {saveStatus.type !== "idle" && (
          <div className={`p-2.5 px-6 rounded-xl text-xs font-semibold leading-relaxed animate-fade-in ${
            saveStatus.type === "success" 
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
              : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
          }`}>
            <span>{saveStatus.message}</span>
          </div>
        )}
      </div>

      {/* Group Inbounds Section */}
      <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-2xl space-y-4 shadow-sm">
        <div className="flex sm:flex-row flex-col sm:items-center justify-between border-b border-gray-800 pb-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">
                {lang === "fa" ? "گروه‌بندی اینباندها (Group Inbounds)" : "Group Inbounds Configuration"}
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                {lang === "fa" 
                  ? "با فعال کردن این بخش، ابتدا لیست لوکیشن‌ها/اینباندها به کاربر نشان داده می‌شود و سپس پلن‌ها."
                  : "Allow users to select from location-based/grouped inbounds before viewing plans."}
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 cursor-pointer self-start sm:self-auto select-none">
            <span className="text-xs font-semibold text-gray-300">
              {lang === "fa" ? "وضعیت قابلیت:" : "Feature Status:"}
            </span>
            <button
              type="button"
              onClick={() => {
                const nextVal = !isGroupInboundsEnabled;
                setIsGroupInboundsEnabled(nextVal);
                onSaveSettings({
                  ...settings,
                  isGroupInboundsEnabled: nextVal
                });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isGroupInboundsEnabled ? 'bg-indigo-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isGroupInboundsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </div>

        {isGroupInboundsEnabled && (
          <div className="space-y-4 animate-fade-in">
            {/* Header / Add button */}
            {!editingGroupId && (
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-gray-800/80">
                <span className="text-xs text-gray-400">
                  {lang === "fa" 
                    ? `تعداد گروه‌های ساخته شده: ${inboundGroups.length}` 
                    : `Total groups defined: ${inboundGroups.length}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleAddOrEditInboundGroup(null)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {lang === "fa" ? "ایجاد گروه جدید" : "Create New Group"}
                </button>
              </div>
            )}

            {/* Create/Edit form */}
            {editingGroupId && (
              <div className="bg-[#1a2234] p-4 rounded-xl space-y-4 border border-indigo-500/20 animate-in fade-in slide-in-from-top-1">
                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                  <h5 className="text-xs font-bold text-white uppercase">
                    {editingGroupId === "new" 
                      ? (lang === "fa" ? "➕ ساخت گروه اینباند جدید" : "➕ Create Inbound Group")
                      : (lang === "fa" ? "✏️ ویرایش گروه اینباند" : "✏️ Edit Inbound Group")}
                  </h5>
                  <button
                    type="button"
                    onClick={() => setEditingGroupId(null)}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase mb-1">
                      {lang === "fa" ? "نام گروه (مثلا: لوکیشن ترکیه 🇹🇷)" : "Group Name"}
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      className="w-full bg-[#111827] border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none font-semibold"
                      placeholder={lang === "fa" ? "مثلا: ترکیه 🇹🇷" : "e.g. Turkey 🇹🇷"}
                    />
                  </div>

                  {/* Checkbox of inbounds */}
                  <div>
                    <label className="block text-[10px] text-gray-300 uppercase mb-1.5 font-bold">
                      {lang === "fa" ? "انتخاب اینباندهای متصل به این گروه:" : "Select Panel Inbounds for this Group:"}
                    </label>
                    {inbounds.length === 0 ? (
                      <p className="text-[10px] text-yellow-400">
                        {lang === "fa" 
                          ? "⚠️ هیچ اینباندی لود نشده است. ابتدا اتصال پنل بالا را بزنید تا لیست لود شود." 
                          : "⚠️ No active inbounds. Please test and fetch your server inbounds above first."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto bg-[#111827] p-2 rounded-lg border border-gray-800">
                        {inbounds.map(ib => {
                          const isChecked = groupInboundIds.includes(ib.id);
                          return (
                            <label key={ib.id} className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setGroupInboundIds([...groupInboundIds, ib.id]);
                                  } else {
                                    setGroupInboundIds(groupInboundIds.filter(id => id !== ib.id));
                                  }
                                }}
                                className="rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 shrink-0"
                              />
                              <span className="text-xs text-gray-300 truncate">
                                {ib.remark} <span className="text-[10px] text-gray-500 font-mono">({ib.protocol})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Checkbox of VPN Plans */}
                  <div>
                    <label className="block text-[10px] text-gray-300 uppercase mb-1.5 font-bold">
                      {lang === "fa" ? "انتخاب بسته‌های فعال در این گروه (پلن‌ها):" : "Select Active VPN Plans for this Group:"}
                    </label>
                    {vpnPlans.length === 0 ? (
                      <p className="text-[10px] text-yellow-400">
                        {lang === "fa" ? "⚠️ هیچ بسته‌ای تعریف نشده است." : "⚠️ No VPN Plans set up yet."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[145px] overflow-y-auto bg-[#111827] p-2 rounded-lg border border-gray-800">
                        {vpnPlans.map(plan => {
                          const isChecked = groupPlanIds.includes(plan.id);
                          return (
                            <label key={plan.id} className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setGroupPlanIds([...groupPlanIds, plan.id]);
                                  } else {
                                    setGroupPlanIds(groupPlanIds.filter(id => id !== plan.id));
                                  }
                                }}
                                className="rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 shrink-0"
                              />
                              <span className="text-xs text-indigo-300 font-medium truncate">
                                {plan.name} <span className="text-[10px] text-gray-500 font-mono">({plan.trafficGb}GB)</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {groupError && <p className="text-[11px] text-rose-400 font-medium">{groupError}</p>}

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setEditingGroupId(null)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-650 text-white rounded-lg text-xs"
                  >
                    {lang === "fa" ? "لغو" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInboundGroup}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                  >
                    {lang === "fa" ? "ذخیره گروه" : "Save Group"}
                  </button>
                </div>
              </div>
            )}

            {/* List of groups */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {inboundGroups.map(group => {
                // Find inbounds remark
                const ibNames = group.inboundIds ? group.inboundIds.map((id: number) => {
                  const ib = inbounds.find(i => i.id === id);
                  return ib ? ib.remark : `#${id}`;
                }).join(", ") : "";

                // Find linked plan names
                const planNames = group.planIds ? group.planIds.map((id: string) => {
                  const p = vpnPlans.find(pl => pl.id === id);
                  return p ? p.name : id;
                }).join(", ") : "";

                return (
                  <div key={group.id} className="relative bg-[#1c253b] border border-gray-800 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-500/50 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 pr-16">
                        <span className="text-xs font-bold text-white font-display border-l-2 border-indigo-500 pl-2">
                          {group.name}
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-2 text-[10px] text-gray-400 font-sans">
                        <div>
                          <span className="font-bold text-gray-300">
                            {lang === "fa" ? "🔗 اینباندها:" : "🔗 Inbounds:"}
                          </span>{" "}
                          <span className="text-emerald-400 font-mono leading-relaxed bg-slate-900/40 p-1 px-1.5 rounded inline-block truncate max-w-full">{ibNames || (lang === "fa" ? "هیچ کدام" : "None")}</span>
                        </div>
                        <div>
                          <span className="font-bold text-gray-300">
                            {lang === "fa" ? "📦 طرح‌های متصل:" : "📦 Linked Plans:"}
                          </span>{" "}
                          <span className="text-indigo-300 leading-relaxed bg-slate-900/40 p-1 px-1.5 rounded inline-block truncate max-w-full">{planNames || (lang === "fa" ? "همه طرح‌ها" : "All Plans")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-3.5 right-3.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAddOrEditInboundGroup(group)}
                        className="p-1.5 bg-indigo-500/10 text-indigo-300 rounded-lg hover:bg-indigo-500/20 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteInboundGroup(group.id)}
                        className="p-1.5 bg-rose-500/10 text-rose-300 rounded-lg hover:bg-rose-500/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {inboundGroups.length === 0 && !editingGroupId && (
              <p className="text-xs text-center py-4 text-gray-500">
                {lang === "fa" 
                  ? "💡 هیچ گروه اینباندی تعریف نکرده‌اید. دکمه «ایجاد گروه جدید» را بزنید." 
                  : "💡 No inbound groups created. Hit 'Create New Group' to start."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Plan Categories Management Section */}
      <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-2xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-white text-sm">
              {lang === "fa" ? "مدیریت دسته‌بندی پلن‌ها" : "Plan Categories Management"}
            </h4>
          </div>
          <button
            onClick={() => {
              setIsAddingCat(true);
              setEditingCategoryId(null);
              setCatName("");
              setCatEmoji("⚡️");
            }}
            className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all active:scale-90"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {(isAddingCat || editingCategoryId) && (
          <div className="bg-[#1a2234] p-4 rounded-xl space-y-3 border border-purple-500/20 animate-in fade-in slide-in-from-top-1">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-gray-400 uppercase mb-1">{lang === "fa" ? "نام دسته" : "Category Name"}</label>
                <input
                  type="text"
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-purple-500 outline-none"
                  placeholder={lang === "fa" ? "مثلا: VIP" : "e.g. VIP"}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[10px] text-gray-400 uppercase mb-1">{lang === "fa" ? "ایموجی" : "Emoji"}</label>
                <input
                  type="text"
                  value={catEmoji}
                  onChange={e => setCatEmoji(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-purple-500 outline-none text-center"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleSaveCategory}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 transition active:scale-95 flex items-center justify-center"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsAddingCat(false);
                    setEditingCategoryId(null);
                  }}
                  className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {catError && <p className="text-[10px] text-rose-400">{catError}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {planCategories.map(cat => (
            <div key={cat.id} className="group relative bg-[#1c253b] border border-gray-800 p-3 rounded-xl hover:border-purple-500/50 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-xs font-bold text-gray-200">{cat.name}</span>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={() => {
                    setEditingCategoryId(cat.id);
                    setCatName(cat.name);
                    setCatEmoji(cat.emoji || "⚡️");
                  }}
                  className="p-1 bg-indigo-500/20 text-indigo-400 rounded hover:bg-indigo-500/30"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-1 bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/30"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Single Column Layout representing customized VPN lists and replenishment tools */}
      <div className="space-y-6">
        
        {/* Main Action Bar */}
        {!showAddForm && (
          <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-2xl flex sm:flex-row flex-col gap-3 justify-between items-start sm:items-center">
            <div>
              <h4 className="font-semibold text-white text-sm">
                {lang === "fa" ? "بسته‌های اشتراکی تلگرام و قیمت فروشگاه" : "Subscription Packages & Selling Matrix"}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === "fa" ? "این بسته‌ها درون ربات تلگرام با شارژ کیف پول تایید شده اتوماتیک ارائه می‌گردند." : "These packages are pulled dynamically by the Telegram bot."}
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
          <div ref={formRef} className="bg-[#111827] border-2 border-indigo-500/30 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-white text-md">
                  {editingPlanId 
                    ? (lang === "fa" ? "✏️ ویرایش مشخصات بسته اشتراکی" : "✏️ Edit VPN Package specifications") 
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
                    required
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                    value={planName}
                    placeholder={lang === "fa" ? "مثال: استاندارد ۱ ماهه ۵۰ گیگابایت" : "Standard Promo Pack 50GB"}
                    onChange={(e) => setPlanName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">{lang === "fa" ? "دسته‌بندی پنل (نام گروه)" : "Category / Group Name"}</label>
                  <select
                    required
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold appearance-none"
                    value={planCategory}
                    onChange={(e) => setPlanCategory(e.target.value)}
                  >
                    <option value="">{lang === "fa" ? "انتخاب دسته‌بندی..." : "Select Category..."}</option>
                    {planCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.emoji} {cat.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {planCategories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPlanCategory(cat.name)}
                        className={`text-[9px] px-2 py-0.5 rounded border transition-colors shrink-0 whitespace-nowrap flex items-center gap-1 ${
                          planCategory === cat.name 
                            ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" 
                            : "bg-gray-800/50 border-gray-700 text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">{lang === "fa" ? "حجم (گیگابایت)" : "Volume Size (GB)"}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                    value={planTraffic}
                    onChange={(e) => setPlanTraffic(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">{lang === "fa" ? "مدت زمان (به روز)" : "Duration (Days)"}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                    value={planDays}
                    onChange={(e) => setPlanDays(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">{lang === "fa" ? "قیمت مصرف کننده (تومان)" : "Selling Price (Tomans)"}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-yellow-300 focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                  />
                </div>
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
            <span>{lang === "fa" ? "بسته‌های فعال و مشخصات سابسکریپشن سیستم:" : "Active Subscription specifications & prices:"}</span>
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
            <div className="overflow-y-auto max-h-[600px] custom-scrollbar pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vpnPlans.map((plan) => {
                const isConfirmDeleting = confirmDeletingId === plan.id;

                return (
                  <div key={plan.id} className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 shadow-sm hover:border-slate-800 transition flex flex-col justify-between">
                    
                    {/* Package Info Header */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <h4 className="font-bold text-base text-white">{plan.name}</h4>
                          <span className="inline-block px-2 py-0.5 rounded text-[9px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider">
                            {plan.category.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-amber-400 font-bold font-mono bg-amber-400/5 border border-amber-400/10 px-2 py-1 rounded-lg">
                          {plan.durationDays} {lang === "fa" ? "روز" : "Days"} / {plan.trafficGb}GB
                        </span>
                      </div>

                      <div className="text-sm text-gray-300 bg-[#111827]/40 border border-[#1f2937]/30 p-3 rounded-xl flex justify-between items-center">
                        <span className="text-xs text-gray-400">{lang === "fa" ? "قیمت فروش ربات:" : "Bot Price:"}</span>
                        <div className="font-mono text-white text-md font-bold">
                          <span className="text-yellow-400">{plan.price.toLocaleString()}</span>
                          <span className="text-[11px] text-gray-500 font-sans font-medium"> {lang === "fa" ? "تومان" : "Toman"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Package Actions / Delete Confirms (NO WINDOW.CONFIRM) */}
                    <div className="flex items-center gap-2 mt-5 pt-3 border-t border-gray-905 justify-end">
                      {isConfirmDeleting ? (
                        <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-900/50 p-1 rounded-lg w-full justify-between">
                          <span className="text-[11px] text-rose-300 font-medium px-1">
                            {lang === "fa" ? "حذف کامل بسته؟" : "Confirm delete?"}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeletePlanConfirm(plan.id)}
                              className="px-2.5 py-1 bg-red-650 hover:bg-red-500 text-white rounded text-[11px] font-medium cursor-pointer"
                            >
                              {lang === "fa" ? "بله" : "Yes"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeletingId(null)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded text-[11px] cursor-pointer"
                            >
                              {lang === "fa" ? "خیر" : "No"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEditPlan(plan)}
                            className="bg-[#111827] border border-slate-800 hover:bg-gray-800 px-3 py-2 rounded-lg text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Edit specifications"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>{lang === "fa" ? "ویرایش پلن" : "Edit Plan"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeletingId(plan.id)}
                            className="bg-[#111827] border border-slate-800 hover:bg-rose-950 hover:border-rose-900 px-3 py-2 rounded-lg text-rose-400 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs"
                            title="Delete package spec"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{lang === "fa" ? "حذف" : "Delete"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
