import React, { useState } from "react";
import { PanelSettings } from "../types";
import { Language, translations } from "../locales";
import { 
  Settings, 
  Key, 
  Database, 
  CreditCard, 
  Lock, 
  Save, 
  Check, 
  FileText, 
  Cpu 
} from "lucide-react";

interface SettingsPanelProps {
  settings: PanelSettings;
  onSaveSettings: (settings: PanelSettings) => void;
  lang: Language;
}

export default function SettingsPanel({
  settings,
  onSaveSettings,
  lang
}: SettingsPanelProps) {
  const t = translations[lang];
  // Form state
  const [botToken, setBotToken] = useState(settings.botToken);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [panelUrl, setPanelUrl] = useState(settings.panelUrl);
  const [panelUsername, setPanelUsername] = useState(settings.panelUsername);
  const [panelPassword, setPanelPassword] = useState(settings.panelPassword);
  const [ownerId, setOwnerId] = useState(settings.ownerId.toString());
  const [cardNumber, setCardNumber] = useState("6037-9918-2831-8848");
  const [bankName, setBankName] = useState(lang === "fa" ? "بانک ملی ایران" : "Melli Bank");
  const [bankOwner, setBankOwner] = useState(lang === "fa" ? "شرکت فنی مهندسی دالتون" : "Daltoon Servers Ltd.");
  
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      botToken,
      baseUrl,
      panelUrl,
      panelUsername,
      panelPassword,
      activeInboundIds: settings.activeInboundIds,
      ownerId: parseInt(ownerId) || settings.ownerId
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div id="settings-tab" className="max-w-4xl mx-auto space-y-6">
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Telegram Bot Details */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            {t.botSettingsTitle}
          </h3>
          <p className="text-xs text-gray-400">{t.botSettingsDesc}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.botTokenLabel}</label>
              <input
                type="text"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-indigo-300 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.ownerAdminIdLabel}</label>
              <input
                type="text"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white font-mono focus:ring-1 focus:ring-indigo-500"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.webhookStatusLabel}</label>
              <div className="flex items-center gap-2 bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-xs text-emerald-400 font-semibold font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {t.pollingActive}
              </div>
            </div>
          </div>
        </div>

        {/* Sanaei 3x-ui Credentials */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            {t.panelAuthTitle}
          </h3>
          <p className="text-xs text-gray-400">{t.panelAuthDesc}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.panelRestBaseHost}</label>
              <input
                type="url"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white font-mono focus:ring-1 focus:ring-indigo-500"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.panelSubPath}</label>
              <input
                type="text"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white font-mono focus:ring-1 focus:ring-indigo-500"
                value={panelUrl}
                onChange={(e) => setPanelUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.panelUsernameLabel}</label>
              <input
                type="text"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                value={panelUsername}
                onChange={(e) => setPanelUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.panelPasswordLabel}</label>
              <input
                type="password"
                required
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                value={panelPassword}
                onChange={(e) => setPanelPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Card instruction parameters */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            {t.cardPaymentTitle}
          </h3>
          <p className="text-xs text-gray-400">{t.cardPaymentDesc}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.cardNumberLabel}</label>
              <input
                type="text"
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm font-semibold text-white font-mono focus:ring-1 focus:ring-indigo-500"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.bankNameLabel}</label>
              <input
                type="text"
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t.holderNameLabel}</label>
              <input
                type="text"
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                value={bankOwner}
                onChange={(e) => setBankOwner(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Save footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1f2937]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-500" />
            <span className="text-[10px] uppercase font-mono text-gray-500">{lang === "fa" ? "دیتابیس درگاه محلی: sqlite3 'bot_database.db'" : "Local Cache DB: sqlite3 'bot_database.db'"}</span>
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> {t.parametersFlushed}
              </span>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold cursor-pointer transition shadow-lg"
            >
              <Save className="w-4 h-4" />
              {t.btnSaveConfig}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
