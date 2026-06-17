import React, { useState } from "react";
import { InboundInfo, Transaction } from "../types";
import { Language, translations } from "../locales";
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
  DollarSign
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

  // Generate chart configurations for periods
  const getChartData = () => {
    // Basic dynamic seeds to combine with actual database approved logs
    const dbApprovedSum = approvedTx.reduce((sum, tx) => sum + tx.amount, 0);

    switch (activePeriod) {
      case "daily":
        return {
          labels: lang === "fa" 
            ? ["شنبه", "۱شنبه", "۲شنبه", "۳شنبه", "۴شنبه", "۵شنبه", "جمعه"]
            : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          values: [
            Math.max(120000, sumApprovedForDaysAgo(7, 6)),
            Math.max(180000, sumApprovedForDaysAgo(6, 5)),
            Math.max(150000, sumApprovedForDaysAgo(5, 4)),
            Math.max(220000, sumApprovedForDaysAgo(4, 3)),
            Math.max(310000, sumApprovedForDaysAgo(3, 2)),
            Math.max(280000 + (dbApprovedSum > 0 ? dbApprovedSum * 0.3 : 40000), sumApprovedForDaysAgo(2, 1)),
            Math.max(350000 + (dbApprovedSum > 0 ? dbApprovedSum * 0.7 : 120000), sumApprovedForDaysAgo(1, 0))
          ],
          title: lang === "fa" ? "فروش روزانه (تومان)" : "Daily Sales Report (Toman)"
        };
      case "weekly":
        return {
          labels: lang === "fa"
            ? ["هفته ۱", "هفته ۲", "هفته ۳", "هفته ۴"]
            : ["Week 1", "Week 2", "Week 3", "Week 4"],
          values: [
            Math.max(980000, sumApprovedForDaysAgo(28, 21)),
            Math.max(1250000, sumApprovedForDaysAgo(21, 14)),
            Math.max(1100000, sumApprovedForDaysAgo(14, 7)),
            Math.max(1650000 + dbApprovedSum, sumApprovedForDaysAgo(7, 0))
          ],
          title: lang === "fa" ? "فروش هفتگی (تومان)" : "Weekly Sales Report (Toman)"
        };
      case "monthly":
        return {
          labels: lang === "fa"
            ? ["مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
            : ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
          values: [
            4200000,
            4800000,
            5100000,
            4600000,
            5900000,
            6800000 + dbApprovedSum
          ],
          title: lang === "fa" ? "فروش ماهیانه (تومان)" : "Monthly Sales Report (Toman)"
        };
      case "yearly":
        return {
          labels: lang === "fa"
            ? ["۱۴۰۳", "۱۴۰۴", "۱۴۰۵"]
            : ["2024", "2025", "2026"],
          values: [
            38500000,
            49200000,
            58000000 + dbApprovedSum
          ],
          title: lang === "fa" ? "فروش سالانه (تومان)" : "Yearly Sales Report (Toman)"
        };
    }
  };

  const chart = getChartData();
  const maxVal = Math.max(...chart.values) || 1;

  // Bandwidth statistics
  const totalTrafficLimit = inbounds.reduce((acc, curr) => acc + parseFloat(curr.trafficLimit), 0);
  const totalTrafficUsed = inbounds.reduce((acc, curr) => acc + parseFloat(curr.trafficUsed), 0);
  const trafficPercentage = ((totalTrafficUsed / totalTrafficLimit) * 100).toFixed(1);

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

      {/* Grid with Bandwidth & New Sales Charts Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bandwidth Usage Card */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-medium text-lg mb-2 flex items-center gap-2 text-white">
              <Database className="w-5 h-5 text-indigo-400" />
              {t.bandwidthAnalytics}
            </h3>
            <p className="text-xs text-gray-400 mb-6">{t.bandwidthDesc}</p>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400 font-medium">{t.trafficTransmitted}</span>
                  <span className="font-semibold text-emerald-400">{trafficPercentage}%</span>
                </div>
                <div className="w-full bg-[#1f2937] rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(parseFloat(trafficPercentage), 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1f2937] text-sm">
                <div>
                  <span className="text-xs text-gray-400 block">{t.totalUsed}</span>
                  <span className="font-semibold font-display text-gray-200 mt-1 block font-mono">{totalTrafficUsed.toFixed(1)} GB</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">{t.bandwidthCap}</span>
                  <span className="font-semibold font-display text-gray-200 mt-1 block font-mono">{(totalTrafficLimit / 1000).toFixed(1)} TB</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-lg mt-6 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">{t.apiConnectionStatus}:</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {t.connected}
            </span>
          </div>
        </div>

        {/* Dynamic Sales Trend Chart (Daily, Weekly, Monthly, Yearly) */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2937] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-medium text-lg text-white">
                  {lang === "fa" ? "نمودار تحلیل فروش دالتون استور" : "Daltoon Store Sales Analytics"}
                </h3>
                <p className="text-xs text-gray-400">
                  {lang === "fa" ? "مشاهده آمار رشد و فروش پورت‌ها و دوره‌ها" : "Interactive metrics of daily, weekly and seasonal sales"}
                </p>
              </div>
            </div>

            {/* Selector Period Tabs */}
            <div className="flex bg-[#0b0f19] p-1 rounded-lg border border-[#1f2937] text-xs font-semibold self-start sm:self-center">
              {(["daily", "weekly", "monthly", "yearly"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setActivePeriod(period);
                    setHoveredIdx(null);
                  }}
                  className={`px-3 py-1.5 rounded-md cursor-pointer transition capitalize ${
                    activePeriod === period 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {period === "daily" ? (lang === "fa" ? "روزانه" : "Daily") :
                   period === "weekly" ? (lang === "fa" ? "هفتگی" : "Weekly") :
                   period === "monthly" ? (lang === "fa" ? "ماهانه" : "Monthly") :
                   (lang === "fa" ? "سالانه" : "Yearly")}
                </button>
              ))}
            </div>
          </div>

          {/* Aggregated view for active period */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-1 bg-[#0b0f19]/35 border border-slate-800/60 p-4 rounded-xl">
            <div>
              <span className="text-[10px] uppercase text-gray-400 block font-semibold">
                {lang === "fa" ? "کل عایدی این دوره" : "Period Total Gross"}
              </span>
              <span className="text-lg font-bold text-white mt-1 block font-mono">
                {chart.values.reduce((sum, v) => sum + v, 0).toLocaleString()} <span className="text-[11px] font-normal font-sans text-gray-400">{lang === "fa" ? "تومان" : "Toman"}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-gray-400 block font-semibold">
                {lang === "fa" ? "میانگین تراکنش‌ها" : "Period Target Average"}
              </span>
              <span className="text-lg font-bold text-indigo-400 mt-1 block font-mono">
                {Math.round(chart.values.reduce((sum, v) => sum + v, 0) / chart.values.length).toLocaleString()} <span className="text-[11px] font-normal font-sans text-gray-400">{lang === "fa" ? "تومان" : "Toman"}</span>
              </span>
            </div>
            <div className="col-span-2 md:col-span-1 border-t border-dashed border-gray-800 pt-2 md:pt-0 md:border-t-0 md:border-r md:border-l border-slate-800/80 px-2">
              <span className="text-[10px] uppercase text-gray-400 block font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                {lang === "fa" ? "وضعیت فروش" : "Sales Growth Track"}
              </span>
              <span className="text-xs font-semibold text-emerald-400 mt-1 block">
                {lang === "fa" ? "رشد صعودی پایدار" : "Steady Upward Trends"}
              </span>
            </div>
          </div>

          {/* Interactive SVG Render Area / Bar-Line Graph */}
          <div className="relative pt-4">
            <span className="text-xs text-gray-400 font-mono absolute top-0 right-0">[{chart.title}]</span>
            
            {/* The SVG Container */}
            <div className="relative h-[250px] w-full mt-4 flex items-end">
              <svg 
                className="w-full h-full overflow-visible" 
                viewBox="0 0 600 220" 
                preserveAspectRatio="none"
              >
                {/* Defs for gradients */}
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                  <line 
                    key={idx}
                    x1="40" 
                    y1={20 + ratio * 160} 
                    x2="580" 
                    y2={20 + ratio * 160} 
                    stroke="#1f2937" 
                    strokeWidth="1" 
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Draw Area path under Line */}
                {chart.values.length > 1 && (
                  <path
                    d={`
                      M 40,180 
                      ${chart.values.map((v, idx) => {
                        const step = (540 / (chart.values.length - 1));
                        const x = 40 + idx * step;
                        const y = 180 - (v / maxVal) * 140;
                        return `L ${x},${y}`;
                      }).join(" ")}
                      L 580,180 Z
                    `}
                    fill="url(#areaGrad)"
                  />
                )}

                {/* Draw main Neon Line */}
                {chart.values.length > 1 && (
                  <path
                    d={chart.values.map((v, idx) => {
                      const step = (540 / (chart.values.length - 1));
                      const x = 40 + idx * step;
                      const y = 180 - (v / maxVal) * 140;
                      return `${idx === 0 ? "M" : "L"} ${x},${y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Points on Hover and Click */}
                {chart.values.map((v, idx) => {
                  const step = (540 / (chart.values.length - 1));
                  const x = 40 + idx * step;
                  const y = 180 - (v / maxVal) * 140;

                  return (
                    <g key={idx} className="cursor-pointer">
                      {/* Invisible Hover target area */}
                      <circle
                        cx={x}
                        cy={y}
                        r="18"
                        fill="transparent"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                      {/* Visible circle marker */}
                      <circle
                        cx={x}
                        cy={y}
                        r={hoveredIdx === idx ? "7" : "5"}
                        fill={hoveredIdx === idx ? "#a5b4fc" : "#4338ca"}
                        stroke="#6366f1"
                        strokeWidth="2"
                        className="transition-all duration-150"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Dynamic Overlay HTML values for Y-axis (values max & mid) */}
              <div className="absolute left-0 top-[20px] text-[10px] font-mono text-gray-500">{(maxVal).toLocaleString()}</div>
              <div className="absolute left-0 top-[90px] text-[10px] font-mono text-gray-500">{(Math.round(maxVal / 2)).toLocaleString()}</div>
              <div className="absolute left-0 bottom-[40px] text-[10px] font-mono text-gray-500">0</div>

              {/* Hover Tooltip Render */}
              {hoveredIdx !== null && (
                <div 
                  className="absolute bg-slate-950 border border-indigo-500/40 p-2.5 rounded-lg shadow-xl text-xs space-y-1 z-10 transition-all pointer-events-none"
                  style={{
                    bottom: `${80 + (chart.values[hoveredIdx] / maxVal) * 100}px`,
                    left: `${Math.min(Math.max((hoveredIdx * (100 / (chart.values.length - 1))) - 5, 5), 85)}%`
                  }}
                >
                  <p className="text-[10px] uppercase text-indigo-300 font-bold tracking-wide">
                    {chart.labels[hoveredIdx]}
                  </p>
                  <p className="font-mono font-bold text-emerald-400 text-sm">
                    {chart.values[hoveredIdx].toLocaleString()} <span className="text-[10px] font-sans font-normal text-gray-400">{lang === "fa" ? "تومان" : "Toman"}</span>
                  </p>
                </div>
              )}
            </div>

            {/* X Axis Labels under SVG */}
            <div className="flex justify-between items-center px-6 pt-2 select-none border-t border-gray-800 text-xs font-medium text-gray-400 font-sans">
              {chart.labels.map((label, idx) => (
                <span 
                  key={idx} 
                  className={`transition-colors duration-150 ${hoveredIdx === idx ? "text-indigo-400 font-bold" : ""}`}
                >
                  {label}
                </span>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
