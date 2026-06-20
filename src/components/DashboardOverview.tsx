import React, { useState, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { InboundInfo, Transaction } from "../types";
import { Language, translations } from "../locales";
import SystemResourceMonitor from "./SystemResourceMonitor";
import { 
  Activity, 
  Cpu, 
  Database, 
  Server, 
  CheckCircle, 
  XCircle, 
  ArrowUpRight, 
  ShieldAlert,
  TrendingUp,
  BarChart2,
  Calendar,
  DollarSign,
  DownloadCloud,
  UploadCloud
} from "lucide-react";

interface DashboardOverviewProps {
  inbounds: InboundInfo[];
  toggleInbound: (id: number) => void;
  usersCount: number;
  activeSubsCount: number;
  totalIncome: number;
  pendingTransactionsCount: number;
  transactions: Transaction[];
  lang: Language;
}

export default function DashboardOverview({
  inbounds,
  toggleInbound,
  usersCount,
  activeSubsCount,
  totalIncome,
  pendingTransactionsCount,
  transactions,
  lang
}: DashboardOverviewProps) {
  const t = translations[lang];
  const [activePeriod, setActivePeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Aggregate approved transactions
  const approvedTx = transactions.filter(tx => tx.status === "approved");

  // Sum within a flexible date range helper
  const sumApprovedForDaysAgo = (daysFrom: number, daysTo: number) => {
    const now = new Date();
    const fromDate = new Date(now.getTime() - daysFrom * 24 * 60 * 60 * 1000);
    const toDate = new Date(now.getTime() - daysTo * 24 * 60 * 60 * 1000);
    
    return approvedTx
      .filter(tx => {
        const d = new Date(tx.date);
        return d >= fromDate && d <= toDate;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);
  };

  // Aggregate approved transactions for the last 30 days
  const last30DaysData = Array.from({ length: 30 }).map((_, i) => {
    const daysAgo = 29 - i;
    const date = new Date(new Date().getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dateString = `${date.getMonth() + 1}/${date.getDate()}`;
    const value = sumApprovedForDaysAgo(daysAgo + 1, daysAgo);
    
    return {
      date: dateString,
      revenue: value
    };
  });

  return (
    <div id="dashboard-tab" className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div id="stat-card-users" className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">{t.metricTotalUsers}</span>
            <h3 className="text-2xl font-bold font-display mt-1">{usersCount}</h3>
            <span className="text-xs text-emerald-400 flex items-center mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" /> {t.activeEngagements}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        <div id="stat-card-subs" className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">{t.metricActiveVpns}</span>
            <h3 className="text-2xl font-bold font-display mt-1 text-emerald-400">{activeSubsCount}</h3>
            <span className="text-xs text-emerald-400 flex items-center mt-1">
              <CheckCircle className="w-3 h-3 mr-1" /> {t.runningSmoothly}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Server className="w-6 h-6" />
          </div>
        </div>

        <div id="stat-card-income" className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">{t.metricRevenue}</span>
            <h3 className="text-2xl font-bold font-display mt-1 text-violet-400">
              {totalIncome.toLocaleString()} <span className="text-xs font-normal">{lang === "fa" ? "تومان" : "Toman"}</span>
            </h3>
            <span className="text-xs text-gray-400 flex items-center mt-1">
              {t.fromApproved}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-violet-500/10 text-violet-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div id="stat-card-receipts" className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">{t.metricPendingApprovals}</span>
            <h3 className="text-2xl font-bold font-display mt-1 text-amber-500">{pendingTransactionsCount}</h3>
            <span className="text-xs text-amber-400 flex items-center mt-1 animate-pulse">
              {t.requiresAttention}
            </span>
          </div>
          <div className={`p-3 rounded-lg ${pendingTransactionsCount > 0 ? "bg-amber-500/20 text-amber-400 animate-pulse" : "bg-gray-800 text-gray-500"}`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 30-day Revenue Line Chart */}
      <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl">
        <h3 className="text-lg font-bold mb-4 font-display text-gray-200">
          {lang === "fa" ? "درآمد ۳۰ روز اخیر (تومان)" : "Last 30 Days Revenue (Toman)"}
        </h3>
        <div className="h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last30DaysData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="#6b7280" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toLocaleString()}k` : val} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }}
                itemStyle={{ color: '#8b5cf6' }}
                formatter={(value: number) => [value.toLocaleString(), lang === "fa" ? "درآمد" : "Revenue"]}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#111827", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Linux VPS System Resource Monitor circular dials */}
        <SystemResourceMonitor lang={lang} />

        {/* Manual Backup and Restore */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-gray-200">{lang === "fa" ? "نسخه پشتیبان (بکاپ)" : "Database Backup & Restore"}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              {lang === "fa" ? "برای انتقال به سرور جدید یا نگهداری ایمن اطلاعات، می‌توانید دستی فایل دیتابیس را دانلود کنید و یا یک بکاپ قدیمی را اینجا بارگذاری نمایید تا همه تنظیمات، پیام‌ها اکانت‌ها و... برگردد." : "Download a full database backup or restore from an existing one."}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                   window.open('/api/backup-download', '_blank');
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 py-3 rounded-lg border border-indigo-500/30 transition-all text-sm font-medium"
              >
                <DownloadCloud className="w-4 h-4" />
                {lang === "fa" ? "دریافت بکاپ" : "Download Backup"}
              </button>
              
              <label className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-3 rounded-lg border border-emerald-500/30 transition-all text-sm font-medium cursor-pointer">
                <UploadCloud className="w-4 h-4" />
                {lang === "fa" ? "بارگذاری" : "Restore"}
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                       const content = ev.target?.result;
                       if (typeof content === 'string') {
                          if (confirm(lang === "fa" ? "هشدار! با این کار اطلاعات فعلی پاک و با این بکاپ جایگزین می‌شود. آیا مطمئنید؟" : "Warning! Current database will be completely replaced by the backup. Are you sure?")) {
                              try {
                                const fb = await fetch("/api/backup-restore", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ backupData: content })
                                });
                                const rJson = await fb.json();
                                if (rJson.success) {
                                  alert(lang === "fa" ? "بکاپ با موفقیت بازگردانی شد. داشبورد تا ثانیه‌هایی دیگر بروز خواهد شد." : "Backup restored. Dashboard will be reloaded soon.");
                                  setTimeout(() => window.location.reload(), 1500);
                                } else {
                                  alert(rJson.error || "Error restoring backup");
                                }
                              } catch(er: any) {
                                alert(er.message);
                              }
                          }
                       }
                    }
                    reader.readAsText(file);
                  }} 
                />
              </label>
            </div>
        </div>
      </div>
    </div>
  );
}
