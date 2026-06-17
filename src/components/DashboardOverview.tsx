import React, { useState } from "react";
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

      {/* Linux VPS System Resource Monitor circular dials */}
      <SystemResourceMonitor lang={lang} />
    </div>
  );
}
