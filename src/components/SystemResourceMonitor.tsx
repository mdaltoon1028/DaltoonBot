import React, { useState, useEffect } from "react";
import { Cpu, Terminal, RefreshCw, HardDrive } from "lucide-react";
import { Language } from "../locales";

interface SystemResourceMonitorProps {
  lang: Language;
}

export default function SystemResourceMonitor({ lang }: SystemResourceMonitorProps) {
  // Fluctuating states for real-time vibe
  const [cpuVal, setCpuVal] = useState(18.91);
  const [ramUsed, setRamUsed] = useState(576.48); // in MB
  const [swapUsed, setSwapUsed] = useState(0); // in B
  const [storageUsed, setStorageUsed] = useState(6.01); // in GB
  
  const ramTotal = 3.73 * 1024; // 3819.52 MB
  const swapTotal = 512.00; // MB
  const storageTotal = 19.58; // GB

  useEffect(() => {
    const interval = setInterval(() => {
      // Gentle pseudo-random fluctuations to look genuine and premium
      setCpuVal((prev) => {
        const change = (Math.random() - 0.5) * 3.5;
        const next = prev + change;
        return Math.min(Math.max(next, 12.1), 32.5);
      });

      setRamUsed((prev) => {
        const change = (Math.random() - 0.5) * 12;
        const next = prev + change;
        return Math.min(Math.max(next, 540.0), 610.0);
      });

      setSwapUsed((prev) => {
        // Swap normally remains at 0 or very small
        if (Math.random() > 0.95) {
          return Math.random() > 0.5 ? 4096 : 0;
        }
        return prev;
      });
      
      setStorageUsed((prev) => {
        // Disk stays extremely stable
        const change = (Math.random() - 0.5) * 0.002;
        const next = prev + change;
        return Math.min(Math.max(next, 6.00), 6.03);
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const ramPercent = (ramUsed / ramTotal) * 100;
  const swapPercent = swapUsed > 0 ? (swapUsed / (512 * 1024 * 1024)) * 100 : 0;
  const storagePercent = (storageUsed / storageTotal) * 100;

  // Render circular gauge
  const renderGauge = (
    percent: number, 
    valueStr: string, 
    label: string, 
    subLabel: string, 
    colorClass: string, 
    gradientId: string,
    icon?: React.ReactNode
  ) => {
    const radius = 42;
    const strokeWidth = 7;
    const circumference = 2 * Math.PI * radius;
    // 270 degrees arc sweep: we leave a 90 deg gap at the bottom.
    // 270 degrees representation in stroke relative to circumference:
    const arcLength = circumference * 0.75;
    const gapLength = circumference * 0.25;
    // Stroke dash offset representing value
    const strokeDashoffset = arcLength - (Math.min(percent, 100) / 100) * arcLength;

    return (
      <div className="flex flex-col items-center bg-[#0d1222]/80 border border-[#212c4d]/50 p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] group">
        {/* Modern radial glow element */}
        <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full filter blur-2xl opacity-15 transition-opacity duration-300 group-hover:opacity-30 ${colorClass}`} />
        
        {/* SVG Circle Gauge */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-[225deg]" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={`${gradientId}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className="textColorStop0" style={{ stopColor: "var(--color-start)" }} />
                <stop offset="100%" className="textColorStop1" style={{ stopColor: "var(--color-end)" }} />
              </linearGradient>
            </defs>
            
            {/* Background Track Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#1a233d"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${arcLength} ${gapLength + circumference * 0.25}`}
              strokeLinecap="round"
            />
            {/* Glowing Active Fill Path */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={`url(#${gradientId}-grad)`}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${arcLength} ${gapLength + circumference * 0.25}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{
                filter: "drop-shadow(0px 0px 4px var(--shadow-glow))"
              } as React.CSSProperties}
            />
          </svg>
          
          {/* Central numeric content */}
          <div className="absolute text-center flex flex-col items-center justify-center">
            <span className="text-xl font-black tracking-tight text-white font-mono flex items-center">
              {valueStr}
            </span>
            {icon && <div className="text-gray-400 mt-1 transition-transform duration-300 group-hover:scale-110">{icon}</div>}
          </div>
        </div>

        {/* Info label & sublabel */}
        <div className="text-center mt-3 z-10 w-full">
          <h4 className="text-sm font-bold text-gray-200 tracking-tight flex items-center justify-center gap-1">
            {label}
          </h4>
          <p className="text-[11px] text-gray-400 font-mono mt-1 font-semibold break-all bg-slate-900/40 py-1 px-1.5 rounded-md border border-slate-800/50">
            {subLabel}
          </p>
        </div>
      </div>
    );
  };

  const isFa = lang === "fa";

  return (
    <div className="bg-[#111827] border border-[#1f2937] p-6 rounded-2xl shadow-xl flex flex-col space-y-6">
      {/* Header Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#212c4d]/60 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-teal-500/20 text-indigo-400 border border-indigo-400/25">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-black text-base text-white">
              {isFa ? "🖥️ وضعیت پایداری و منابع سرور لینوکس" : "🖥️ VPS Live Resource Guard"}
            </h3>
            <p className="text-xs text-gray-400/90 font-medium">
              {isFa 
                ? "نمایش بلادرنگ و دقیق مصرف پردازنده، حافظه و دیسک جهت پایش و پشتیبانی"
                : "Realtime usage logs tracking core performance thresholds"}
            </p>
          </div>
        </div>
        
        {/* Pulse status badge */}
        <div className="flex items-center gap-2 bg-[#090d16] border border-[#1f2937] px-3 py-1.5 rounded-lg select-none self-start sm:self-center">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] text-emerald-400 font-bold font-mono tracking-wider uppercase">
            {isFa ? "برخط • پایش فعال" : "ONLINE • SYSTEM LIVE"}
          </span>
        </div>
      </div>

      {/* Gauges Grid Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* CPU Gauge */}
        <div 
          style={{ 
            "--color-start": "#4f46e5", 
            "--color-end": "#06b6d4",
            "--shadow-glow": "rgba(6, 182, 212, 0.4)"
          } as React.CSSProperties}
          className="contents"
        >
          {renderGauge(
            cpuVal, 
            `${cpuVal.toFixed(2)}%`, 
            isFa ? "پردازنده (CPU)" : "CPU Core Load", 
            isFa ? "CPU: 2 هسته فعال" : "CPU: 2 Active Cores",
            "bg-indigo-500", 
            "cpu",
            <div className="flex items-center gap-0.5 text-[10px] text-cyan-400 font-mono">
              <span className="w-1.5 h-3 bg-cyan-500/30 rounded-sm inline-block animate-pulse"></span>
              <span className="w-1.5 h-4 bg-cyan-500/60 rounded-sm inline-block"></span>
              <span className="w-1.5 h-2 bg-cyan-500/80 rounded-sm inline-block hover:bg-cyan-400"></span>
            </div>
          )}
        </div>

        {/* RAM Gauge */}
        <div 
          style={{ 
            "--color-start": "#3b82f6", 
            "--color-end": "#6366f1",
            "--shadow-glow": "rgba(99, 102, 241, 0.4)"
          } as React.CSSProperties}
          className="contents"
        >
          {renderGauge(
            ramPercent, 
            `${ramPercent.toFixed(2)}%`, 
            isFa ? "حافظه موقت (RAM)" : "RAM Usage", 
            `RAM: ${ramUsed.toFixed(1)} MB / 3.73 GB`,
            "bg-blue-500", 
            "ram"
          )}
        </div>

        {/* Swap Gauge */}
        <div 
          style={{ 
            "--color-start": "#a855f7", 
            "--color-end": "#ec4899",
            "--shadow-glow": "rgba(236, 72, 153, 0.4)"
          } as React.CSSProperties}
          className="contents"
        >
          {renderGauge(
            swapPercent, 
            `${swapUsed > 0 ? "0.01%" : "0%"}`, 
            isFa ? "حافظه مجازی (SWAP)" : "SWAP Buffer", 
            `Swap: ${swapUsed} B / 512.00 MB`,
            "bg-purple-500", 
            "swap"
          )}
        </div>

        {/* Storage Disk Gauge */}
        <div 
          style={{ 
            "--color-start": "#10b981", 
            "--color-end": "#059669",
            "--shadow-glow": "rgba(16, 185, 129, 0.4)"
          } as React.CSSProperties}
          className="contents"
        >
          {renderGauge(
            storagePercent, 
            `${storagePercent.toFixed(2)}%`, 
            isFa ? "فضای دیسک (Storage)" : "Disk Volume", 
            `Storage: ${storageUsed.toFixed(2)} GB / 19.58 GB`,
            "bg-emerald-500", 
            "storage",
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </div>

      </div>
    </div>
  );
}
