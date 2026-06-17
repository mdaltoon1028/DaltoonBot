import React, { useState } from "react";
import { InboundInfo } from "../types";
import { Language, translations } from "../locales";
import { 
  Activity, 
  Cpu, 
  Database, 
  Server, 
  Wifi, 
  CheckCircle, 
  XCircle, 
  Zap, 
  ArrowUpRight, 
  ShieldAlert 
} from "lucide-react";

interface DashboardOverviewProps {
  inbounds: InboundInfo[];
  toggleInbound: (id: number) => void;
  usersCount: number;
  activeSubsCount: number;
  totalIncome: number;
  pendingTransactionsCount: number;
  lang: Language;
}

export default function DashboardOverview({
  inbounds,
  toggleInbound,
  usersCount,
  activeSubsCount,
  totalIncome,
  pendingTransactionsCount,
  lang
}: DashboardOverviewProps) {
  const t = translations[lang];
  const [checkingSpeed, setCheckingSpeed] = useState<number | null>(null);
  const [pingData, setPingData] = useState<Record<number, number>>({
    1: 45, 12: 52, 16: 32, 19: 68, 24: 41, 26: 74
  });

  const runPingTest = (id: number) => {
    setCheckingSpeed(id);
    setTimeout(() => {
      const randomPing = Math.floor(Math.random() * 80) + 15;
      setPingData(prev => ({ ...prev, [id]: randomPing }));
      setCheckingSpeed(null);
    }, 1000);
  };

  const getProtocolColor = (protocol: string) => {
    switch (protocol) {
      case "vless": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "vmess": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "trojan": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  // Aggregated traffic
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

      {/* Grid with Server Health & Bandwidth Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bandwidth Usage Card */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-medium text-lg mb-2 flex items-center gap-2">
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
                  <span className="font-semibold font-display text-gray-200 mt-1 block">{totalTrafficUsed.toFixed(1)} GB</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">{t.bandwidthCap}</span>
                  <span className="font-semibold font-display text-gray-200 mt-1 block">{(totalTrafficLimit / 1000).toFixed(1)} TB</span>
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

        {/* Inbounds Control List */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h3 className="font-display font-medium text-lg flex items-center gap-2">
                <Wifi className="w-5 h-5 text-indigo-400" />
                {t.activeInboundsTitle} ({inbounds.length})
              </h3>
              <p className="text-xs text-gray-400">{t.marzbanSyncDesc}</p>
            </div>
            <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded">
              {t.syncedPortsLabel}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-slate-900 border-b border-[#1f2937]">
                <tr>
                  <th className="px-4 py-3">{t.tableId}</th>
                  <th className="px-4 py-3">{t.tableRemark}</th>
                  <th className="px-4 py-3">{t.tableProtocol}</th>
                  <th className="px-4 py-3">{t.tablePort}</th>
                  <th className="px-4 py-3">{t.tableClients}</th>
                  <th className="px-4 py-3">{t.tableBandwidth}</th>
                  <th className="px-4 py-3">{t.tableLatency}</th>
                  <th className="px-4 py-3 text-right">{t.tableStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {inbounds.map((inbound) => {
                  const usedGB = parseFloat(inbound.trafficUsed);
                  const limitGB = parseFloat(inbound.trafficLimit);
                  const percentage = ((usedGB / limitGB) * 100).toFixed(1);

                  return (
                    <tr key={inbound.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-4 py-3.5 font-mono text-xs">{inbound.id}</td>
                      <td className="px-4 py-3.5 font-medium text-white">{inbound.remark}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 text-xs rounded-full border uppercase ${getProtocolColor(inbound.protocol)}`}>
                          {inbound.protocol}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs">{inbound.port}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-indigo-300">{inbound.totalClients} clients</td>
                      <td className="px-4 py-3.5">
                        <div className="w-24">
                          <div className="flex justify-between text-[10px] text-gray-400 mb-0.5 font-mono">
                            <span>{inbound.trafficUsed}G</span>
                            <span>{percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1">
                            <div 
                              className="bg-indigo-500 h-full rounded" 
                              style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <button 
                          onClick={() => runPingTest(inbound.id)}
                          disabled={checkingSpeed === inbound.id}
                          className="flex items-center gap-1 font-mono text-xs text-gray-400 hover:text-white transition bg-slate-800 px-2 py-1 rounded cursor-pointer"
                        >
                          <Zap className={`w-3 h-3 text-yellow-500 ${checkingSpeed === inbound.id ? "animate-spin" : ""}`} />
                          {checkingSpeed === inbound.id ? t.testing : `${pingData[inbound.id] || "--"} ms`}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => toggleInbound(inbound.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition ${
                            inbound.status === "active" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
                          }`}
                        >
                          {inbound.status === "active" ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              {t.statusActive}
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              {t.statusDisabled}
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
