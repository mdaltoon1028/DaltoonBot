import React, { useState } from "react";
import { Tag, Trash2, Plus, Calendar, Check, X, Percent, Clock } from "lucide-react";
import { PromoCode } from "../types";
import { Language } from "../locales";

interface PromoCodeManagerProps {
  promoCodes: PromoCode[];
  onAddCode: (code: string, type: "percent" | "extend_days", value: number, maxUsage: number) => void;
  onDeleteCode: (id: string) => void;
  lang?: Language;
}

export default function PromoCodeManager({
  promoCodes = [],
  onAddCode,
  onDeleteCode,
  lang = "fa",
}: PromoCodeManagerProps) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "extend_days">("percent");
  const [value, setValue] = useState("");
  const [maxUsage, setMaxUsage] = useState("50");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !value || !maxUsage) return;

    onAddCode(
      code.toUpperCase().trim(),
      type,
      parseFloat(value),
      parseInt(maxUsage, 10)
    );

    setCode("");
    setValue("");
    setMaxUsage("50");

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const isFa = lang === "fa";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 space-x-reverse mb-6">
        <div className="p-3 bg-indigo-500/10 rounded-xl">
          <Tag className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">
            {isFa ? "🎟️ مدیریت کدهای تخفیف و تمدید" : "Promo & Extension Codes Manager"}
          </h2>
          <p className="text-sm text-gray-400">
            {isFa 
              ? "تعریف کدهای تخفیفی درصدی خرید جدید یا تمدید رایگان سرویس" 
              : "Create percentage based discounts or free day extensions"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Code Form */}
        <div className="bg-[#0f1626] border border-gray-800/80 rounded-2xl p-6 h-fit">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            {isFa ? "ثبت کد جدید" : "Create New Code"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1.5">
                {isFa ? "🏷️ کد تخفیف" : "🏷️ Promo Code"}
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="DALTOON20"
                className="w-full bg-[#161c2a] border border-gray-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold tracking-wider text-center"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1.5">
                  {isFa ? "⚙️ نوع کد" : "⚙️ Code Type"}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "percent" | "extend_days")}
                  className="w-full bg-[#161c2a] border border-gray-700/50 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  <option value="percent">{isFa ? "درصدی (%)" : "Percentage (%)"}</option>
                  <option value="extend_days">{isFa ? "تمدید رایگان (روز)" : "Day Extension (Days)"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1.5">
                  {type === "percent" ? (isFa ? "📈 درصد تخفیف" : "Discount %") : (isFa ? "📅 تعداد روز" : "Extend Days")}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={type === "percent" ? 100 : 365}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === "percent" ? "20" : "5"}
                  className="w-full bg-[#161c2a] border border-gray-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1.5">
                {isFa ? "👥 حداکثر دفعات استفاده" : "👥 Max Usage Capacity"}
              </label>
              <input
                type="number"
                required
                min={1}
                value={maxUsage}
                onChange={(e) => setMaxUsage(e.target.value)}
                className="w-full bg-[#161c2a] border border-gray-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white p-3 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer transition flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {isFa ? "ایجاد و ذخیره کد" : "Create Code"}
            </button>
          </form>

          {success && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-center text-xs font-medium">
              {isFa ? "✅ کد جدید با موفقیت ذخیره شد!" : "✅ Promo Code successfully saved!"}
            </div>
          )}
        </div>

        {/* List of Active Codes */}
        <div className="lg:col-span-2 bg-[#0f1626] border border-gray-800/80 rounded-2xl p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            {isFa ? "کدهای تخفیف فعال" : "Active Promo Codes"}
          </h3>

          <div className="flex-1 overflow-auto max-h-[480px] space-y-3">
            {promoCodes.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center">
                <Tag className="w-8 h-8 text-gray-600 mb-2" />
                <p className="text-xs text-gray-500">
                  {isFa ? "هیچ کد تخفیفی ایجاد نشده است." : "No promo codes available."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promoCodes.map((pc) => (
                  <div
                    key={pc.id}
                    className="bg-[#161c2a] border border-gray-800 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/30 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-block bg-indigo-600/20 text-indigo-300 font-mono font-extrabold text-sm px-2.5 py-1 rounded-lg tracking-wider">
                          {pc.code}
                        </span>
                        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-300">
                          {pc.type === "percent" ? (
                            <>
                              <Percent className="w-3.5 h-3.5 text-amber-500" />
                              <span>{isFa ? `${pc.value}٪ تخفیف` : `${pc.value}% Discount`}</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>
                                {isFa ? `${pc.value} روز تمدید رایگان` : `${pc.value} days extension`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteCode(pc.id)}
                        className="p-1 px-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition duration-150 cursor-pointer border border-red-500/20"
                        title={isFa ? "حذف" : "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                      <div>
                        {isFa ? "دفعات استفاده:" : "Used:"}{" "}
                        <span className="font-semibold text-white font-mono">
                          {pc.totalUsage}
                        </span>{" "}
                        / <span className="text-gray-400">{pc.maxUsage}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span className="font-mono text-gray-500">
                          {pc.createdAt.split("T")[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
