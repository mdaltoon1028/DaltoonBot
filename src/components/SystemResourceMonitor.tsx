import React, { useState, useEffect } from "react";
import { Cpu, HardDrive, LayoutPanelLeft } from "lucide-react";
import { Language, translations } from "../locales";

interface ResourceStat {
  usage: number;
  total?: string;
  used?: string;
}

interface SystemStatus {
  cpu: ResourceStat;
  memory: ResourceStat;
  disk: ResourceStat;
  uptime: string;
}

export default function SystemResourceMonitor({ lang }: { lang: Language }) {
  const [status, setStatus] = useState<SystemStatus>({
    cpu: { usage: 0 },
    memory: { usage: 0, total: "0GB", used: "0GB" },
    disk: { usage: 0, total: "0GB", used: "0GB" },
    uptime: "0h 0m"
  });

  const t = translations[lang];

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/system/status");
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        // Mock data if API fails or for dev
        setStatus(prev => ({
          ...prev,
          cpu: { usage: Math.floor(Math.random() * 30) + 10 },
          memory: { usage: 45, total: "16GB", used: "7.2GB" },
          disk: { usage: 62, total: "500GB", used: "310GB" }
        }));
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const CircularProgress = ({ value, label, icon: Icon, colorClass, subtext }: { 
    value: number, 
    label: string, 
    icon: any, 
    colorClass: string,
    subtext?: string 
  }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-100"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={`${colorClass} transition-all duration-1000 ease-out`}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <Icon className={`w-5 h-5 mb-1 ${colorClass.replace("stroke-", "text-")}`} />
            <span className="text-lg font-bold text-gray-800">{value}%</span>
          </div>
        </div>
        <h3 className="mt-4 font-medium text-gray-700">{label}</h3>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <CircularProgress 
        value={status.cpu.usage} 
        label={t.cpuUsage || "CPU Usage"} 
        icon={Cpu} 
        colorClass="stroke-blue-500"
        subtext={`Uptime: ${status.uptime}`}
      />
      <CircularProgress 
        value={status.memory.usage} 
        label={t.memoryUsage || "Memory"} 
        icon={LayoutPanelLeft} 
        colorClass="stroke-purple-500"
        subtext={`${status.memory.used} / ${status.memory.total}`}
      />
      <CircularProgress 
        value={status.disk.usage} 
        label={t.diskUsage || "Disk"} 
        icon={HardDrive} 
        colorClass="stroke-amber-500"
        subtext={`${status.disk.used} / ${status.disk.total}`}
      />
    </div>
  );
}
