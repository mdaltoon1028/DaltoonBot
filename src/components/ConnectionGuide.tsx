import React, { useState } from "react";
import { Language } from "../locales";
import { 
  Server, 
  Terminal, 
  Settings, 
  Code, 
  Copy, 
  Check, 
  AlertCircle, 
  Link2, 
  Play, 
  FileCode2, 
  UserPlus 
} from "lucide-react";

interface ConnectionGuideProps {
  lang: Language;
}

export default function ConnectionGuide({ lang }: ConnectionGuideProps) {
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => setCopiedTextId(null), 2500);
  };

  const codeSnippets = {
    requirements: `pip install python-telegram-bot requests sqlite3`,
    envConfig: `# .env configuration for 3x-ui v3.2 Bot
BOT_TOKEN="6469257181:AAEFfE_C_zG_CM2F7x5dhPXd1IjEv2AuGjw"
OWNER_ID=6536288293
XUI_URL="http://YOUR_SERVER_IP:2053"
XUI_USERNAME="admin"
XUI_PASSWORD="password"
CARD_NUMBER="6037-9918-2831-8848"
CARD_HOLDER="Daltoon Servers"`,
    pythonCode: `# Accurate 3x-ui Sanaei v3.2 API Integration Snippet (bot.py)
import sqlite3
import requests
import json
import uuid
import time

# Initialize Database
def init_db():
    conn = sqlite3.connect('bot_database.db')
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users 
                      (userId INTEGER PRIMARY KEY, username TEXT, walletBalance REAL, joinDate TEXT, status TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS transactions 
                      (id TEXT PRIMARY KEY, userId INTEGER, username TEXT, amount REAL, status TEXT, date TEXT)''')
    conn.commit()
    conn.close()

# Authenticate session with Sanaei X-UI
session = requests.Session()

def authenticate_xui():
    url = f"{XUI_URL}/login"
    data = {'username': XUI_USERNAME, 'password': XUI_PASSWORD}
    try:
        response = session.post(url, data=data, timeout=10)
        result = response.json()
        return result.get('success', False)
    except Exception as e:
        print("Login failed:", e)
        return False

# Add client configuration dynamically to an inbound
def add_vpn_client(inbound_id, client_email, traffic_gb, duration_months):
    if not authenticate_xui():
        return None, None
        
    client_uuid = str(uuid.uuid4())
    total_bytes = traffic_gb * 1024 * 1024 * 1024
    # timestamp in milliseconds
    expiry_time_ms = int((time.time() + (duration_months * 30 * 24 * 60 * 60)) * 1000)
    
    client_data = {
        "id": client_uuid,
        "email": client_email,
        "limitIp": 0,
        "totalGB": total_bytes,
        "expiryTime": expiry_time_ms,
        "enable": True,
        "tgId": "",
        "subId": client_email
    }
    
    payload = {
        "id": inbound_id,
        "settings": json.dumps({"clients": [client_data]})
    }
    
    try:
        url = f"{XUI_URL}/panel/api/inbounds/addClient"
        response = session.post(url, json=payload, timeout=10)
        res_json = response.json()
        if res_json.get("success"):
            # Generates subscription link for client (Sanaei subscription endpoint)
            sub_link = f"{XUI_URL}/sub/{client_email}"
            return client_uuid, sub_link
    except Exception as e:
        print("Add client error:", e)
    return None, None`
  };

  if (lang === "fa") {
    return (
      <div id="guide-tab" className="space-y-6">
        {/* Intro */}
        <div className="bg-[#111827] border border-[#1f2937] p-6 rounded-xl space-y-3">
          <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Link2 className="w-6 h-6 text-indigo-400" />
            راهنمای اتصال کامل ربات به تلگرام و پنل سنایی (Sanaei X-UI v3.2)
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            این پنل به عنوان هسته مدیریت وب (Web Panel GUI) عمل می‌کند که دیتابیس مشترکی را با ربات تلگرام پایتون شما به صورت هماهنگ همگام‌سازی می‌نماید. شما می‌توانید با استفاده از API‌های داخلی پنل فوق‌العاده قدرتمند <b>3x-ui ثنایی (نسخه 3.2)</b>، کل پروسه تعریف کاربر، اختصاص حجم و لایسنس دهی را تمام خودکار کنید.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Step 1: Telegram Connection */}
          <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
            <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
              <span className="p-1 px-2.5 rounded bg-indigo-500/10 text-indigo-400 font-bold text-sm">۱</span>
              راه‌اندازی و اتصال به تلگرام (Telegram Bot API)
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              برای ساخت ربات و دریافت توکن، مراحل زیر را طی کنید:
            </p>
            <ul className="list-disc pl-4 text-xs text-gray-300 space-y-2 leading-relaxed">
              <li>به آیدی تلگرام <span className="text-indigo-400 font-semibold">@BotFather</span> مراجعه کنید.</li>
              <li>دستور <code className="bg-slate-900 border border-slate-800 px-1 rounded text-pink-400">/newbot</code> را تایپ کرده و نام و یوزرنیم ربات خود را انتخاب و ذخیره نمایید.</li>
              <li>توکن دریافتی <code className="bg-slate-900 border border-slate-800 px-1 rounded text-emerald-400">API Token</code> را بردارید و در بخش <b>تظیمات ربات</b> یا فایل <code className="font-mono">.env</code> قرار دهید.</li>
              <li>ربات شما با استفاده از کتابخانه‌ی تلگرامی پایتون شروع به پاسخگویی در تلگرام می‌کند.</li>
            </ul>

            <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-lg space-y-2">
              <span className="text-[10px] uppercase font-mono text-gray-400 flex items-center gap-1.5 font-semibold">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                دانلود پیش‌نیازهای ربات در سرور پایتون:
              </span>
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded font-mono text-xs text-indigo-300">
                <code>{codeSnippets.requirements}</code>
                <button 
                  onClick={() => handleCopy(codeSnippets.requirements, "req")}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded cursor-pointer transition"
                >
                  {copiedTextId === "req" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: X-UI Connection */}
          <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
            <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
              <span className="p-1 px-2.5 rounded bg-indigo-500/10 text-indigo-400 font-bold text-sm">۲</span>
              اتصال ربات پایتون به پنل ثنایی (Sanaei X-UI API)
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              ربات پایتون شما با استفاده از متد‌های <code className="text-indigo-400">REST API</code> به پنل X-UI شما متصل می‌گردد تا تراکنش‌های تولید کانفیگ و ثبت اکانت جدید را به صورت امن هندل کند:
            </p>
            <ul className="list-disc pl-4 text-xs text-gray-300 space-y-2 leading-relaxed">
              <li>ربات برای تمام درخواست‌ها ابتدا نشست احراز هویت ادمین را با ارسال اطلاعات ادمین به <code className="text-yellow-400">/login</code> دریافت کرده و کوکی جلسه را نگه می‌دارد.</li>
              <li>هنگامی که کاربری با موفقیت پرداخت می‌کند، ربات پایتون متد ساخت کلاینت <code className="text-pink-400">POST /panel/api/inbounds/addClient</code> را به پنل ارسال می‌کند.</li>
              <li>اطلاعات حساب کاربر، از جمله UUID کانفیگ، ایمیل کلاینت، سقف حجم کلی (ترافیک)، محدودیت آی‌پی و انقضا با فرمت JSON ارسال می‌شوند.</li>
            </ul>

            <div className="bg-[#1e293b]/30 p-3 rounded-lg border border-[#1f2937]/75 text-xs text-amber-400 flex gap-2.5 items-start">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="leading-relaxed">
                لطفا از فعال بودن سیستم سابزکرایب (Subscription) در تنظیمات پنل X-UI سنایی خود مطمئن شوید تا لینک‌های خروجی ساب به درستی برای کاربران لود شوند.
              </p>
            </div>
          </div>

        </div>

        {/* SQLite & Code Sync Details */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-[#2d3748] pb-3">
            <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-indigo-400" />
              کد پایتون اتصال و همگام‌سازی با درگاه‌های X-UI ثنای ۳.۲ و فایل فایل پیکربندی ربات پایتون (.env)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              PYTHON 3.10+
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Environment side info */}
            <div className="lg:col-span-1 space-y-4 text-xs text-gray-400 leading-relaxed">
              <p>
                یک فایل جدید به نام <code className="font-mono text-white bg-slate-900 border border-slate-800 px-1 py-0.5 rounded">.env</code> در کنار فایل اصلی ربات خود در سرور لینوکس خود قرار دهید و مقادیر زیر را جایگزین کنید:
              </p>

              <div className="bg-slate-950 p-4.5 rounded-lg border border-slate-800 font-mono text-[10px] leading-relaxed text-indigo-300 relative select-all">
                <button
                  type="button"
                  onClick={() => handleCopy(codeSnippets.envConfig, "env")}
                  className="absolute top-2 right-2 p-1 bg-slate-900 text-gray-300 rounded hover:text-white transition"
                >
                  {copiedTextId === "env" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre>{codeSnippets.envConfig}</pre>
              </div>

              <div className="bg-indigo-500/5 p-4 rounded-lg border border-indigo-500/10 text-xs text-indigo-400 space-y-1">
                <p className="font-bold text-gray-300">💡 راهنمایی برای پر کردن مقادیر:</p>
                <p>در صورتی که مایلید تمام فیلدهای این سورس‌کد را با مشخصات سرور واقعی مجاور و آی‌پی خود دریافت کنید، کافیست اطلاعات را در چت برای من ارسال کنید تا دقیقاً برای شما آماده کنم!</p>
              </div>
            </div>

            {/* Python code sidebar */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-semibold font-mono tracking-wider">SAMPLE EXECUTION CORE IN bot.py</span>
                <span className="text-[10px] text-slate-500 font-mono">bot_engine.py</span>
              </div>
              
              <div className="relative bg-slate-950 p-4 rounded-lg border border-slate-900 text-xs text-gray-300 font-mono max-h-[460px] overflow-y-auto overflow-x-auto leading-relaxed select-all">
                <button
                  type="button"
                  onClick={() => handleCopy(codeSnippets.pythonCode, "py")}
                  className="absolute top-2 right-2 p-1 bg-slate-900 text-gray-300 rounded hover:text-white transition"
                >
                  {copiedTextId === "py" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre className="text-indigo-200/90">{codeSnippets.pythonCode}</pre>
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  }

  // English localization
  return (
    <div id="guide-tab" className="space-y-6">
      {/* Intro */}
      <div className="bg-[#111827] border border-[#1f2937] p-6 rounded-xl space-y-3">
        <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
          <Link2 className="w-6 h-6 text-indigo-400" />
          Integration Guide: Run Python Bot & Connect Sanaei X-UI API
        </h2>
        <p className="text-sm text-gray-300 leading-relaxed">
          This system operates as a unified administrative cockpit (GUI Dashboard) that syncs data with your live Telegram bot script (written in Python) using a centralized sqlite3 or REST API proxy configuration. Fully customized for the <b>3x-ui Sanaei Panel (v3.2)</b>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Step 1 */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <span className="p-1 px-2.5 rounded bg-indigo-500/10 text-indigo-400 font-bold text-sm">1</span>
            Telegram Bot Setup (@BotFather)
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Follow these instructions to create your custom bot and acquire token:
          </p>
          <ul className="list-disc pl-4 text-xs text-gray-300 space-y-2 leading-relaxed">
            <li>Open Telegram and search for <span className="text-indigo-400 font-semibold">@BotFather</span>.</li>
            <li>Send the <code className="bg-slate-900 border border-slate-800 px-1 rounded text-pink-400">/newbot</code> command and choose your display name and username.</li>
            <li>Copy the generated <code className="bg-slate-900 border border-slate-800 px-1 rounded text-emerald-400">API Token</code> and paste it in our <b>Bot Settings</b> tab or inside your backend environment config or `.env` files.</li>
          </ul>

          <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-lg space-y-2">
            <span className="text-[10px] uppercase font-mono text-gray-400 flex items-center gap-1.5 font-semibold">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Install python dependencies:
            </span>
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded font-mono text-xs text-indigo-300">
              <code>{codeSnippets.requirements}</code>
              <button 
                onClick={() => handleCopy(codeSnippets.requirements, "req")}
                className="p-1 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded cursor-pointer transition"
              >
                {copiedTextId === "req" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <span className="p-1 px-2.5 rounded bg-indigo-500/10 text-indigo-400 font-bold text-sm">2</span>
            Establish Sanaei X-UI API Session
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            The Python bot connects with the X-UI panel manager via cookie-based REST APIs to provision and allocate client configs:
          </p>
          <ul className="list-disc pl-4 text-xs text-gray-300 space-y-2 leading-relaxed">
            <li>For every CRUD operation, the python script authenticates with <code className="text-yellow-400">/login</code> and stores the response cookie.</li>
            <li>When credit balance permits, it triggers <code className="text-pink-400">POST /panel/api/inbounds/addClient</code> payload to register a user.</li>
            <li>The response payload with customized subscription link will be retrieved and displayed to the recipient on Telegram.</li>
          </ul>

          <div className="bg-[#1e293b]/30 p-3 rounded-lg border border-[#1f2937]/75 text-xs text-amber-400 flex gap-2.5 items-start">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="leading-relaxed">
              Make sure to specify and authorize the exact X-UI port and address under settings to keep REST endpoints fully operational.
            </p>
          </div>
        </div>

      </div>

      {/* Shared sqlite info */}
      <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl space-y-4">
        <div className="flex justify-between items-center border-b border-[#2d3748] pb-3">
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-indigo-400" />
            Shared SQLite integration script & `.env` configuration file
          </h3>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            PYTHON 3.10+
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4 text-xs text-gray-400 leading-relaxed">
            <p>
              Prepare a standard <code className="font-mono text-white bg-slate-900 border border-slate-800 px-1 py-0.5 rounded">.env</code> inside your telegram script root directory and populate these options:
            </p>

            <div className="bg-slate-950 p-4.5 rounded-lg border border-slate-800 font-mono text-[10px] leading-relaxed text-indigo-300 relative select-all">
              <button
                type="button"
                onClick={() => handleCopy(codeSnippets.envConfig, "env")}
                className="absolute top-2 right-2 p-1 bg-slate-900 text-gray-300 rounded hover:text-white transition"
              >
                {copiedTextId === "env" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <pre>{codeSnippets.envConfig}</pre>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-400 font-semibold font-mono tracking-wider">SAMPLE METHOD FLOW IN bot.py</span>
              <span className="text-[10px] text-slate-500 font-mono">bot_engine.py</span>
            </div>
            
            <div className="relative bg-slate-950 p-4 rounded-lg border border-slate-900 text-xs text-gray-300 font-mono max-h-[460px] overflow-y-auto overflow-x-auto leading-relaxed select-all">
              <button
                type="button"
                onClick={() => handleCopy(codeSnippets.pythonCode, "py")}
                className="absolute top-2 right-2 p-1 bg-slate-950 text-gray-300 rounded hover:text-white transition"
              >
                {copiedTextId === "py" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <pre className="text-indigo-200/90">{codeSnippets.pythonCode}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
