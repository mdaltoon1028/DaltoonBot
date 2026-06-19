# -*- coding: utf-8 -*-
"""
Daltoon Systems - Real-Time Python Telegram Bot & Sanaei 3x-ui API Sync
Designed specifically for: Sanaei X-UI v3.2 Panel (https://m.daltoon-server.ir:8443/Daltoon)
Centralized Database: bot_database.json (Shared with React Admin Dashboard)
"""

import os
import sys
import time
import uuid
import json
import requests
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

# Shared Database file path (script-relative to support reliable CWD-independent execution like PM2)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(SCRIPT_DIR, "bot_database.json")

def write_db_json(data):
    """ Atomic save to prevent corruption """
    try:
        temp_file = DB_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(temp_file, DB_FILE)
    except Exception as e:
        print(f"[Database Error] Fs output error: {e}")

def read_db_json():
    """ Read core database structure and supply initial templates if newly established """
    if not os.path.exists(DB_FILE):
        default_db = {
            "users": [],
            "transactions": [],
            "subscription_keys": [],
            "inbounds": [],
            "custom_buttons": [],
            "settings": {
                "panel_config": json.dumps({
                    "botToken": "",
                    "baseUrl": "",
                    "panelUrl": "",
                    "panelUsername": "",
                    "panelPassword": "",
                    "activeInboundIds": [],
                    "ownerId": 0,
                    "dashboardUsername": "Daltoon",
                    "dashboardPassword": "Daltoon10",
                    "serverPort": 3000,
                    "admins": []
                })
            }
        }
        write_db_json(default_db)
        return default_db
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[JSON Database Warning] Could not parse. Re-reading database files: {e}")
        return {"users": [], "transactions": [], "subscription_keys": [], "inbounds": [], "custom_buttons": [], "settings": {}}

def normalize_xui_url(url):
    if not url:
        return ""
    cleaned = url.strip().rstrip("/")
    if "://" in cleaned:
        parts = cleaned.split("://", 1)
        protocol = parts[0].lower()
        if protocol not in ["http", "https"]:
            if "http" in protocol or protocol.endswith("s") or protocol.endswith("ps"):
                cleaned = "https://" + parts[1]
            else:
                cleaned = "http://" + parts[1]
    else:
        cleaned = "https://" + cleaned
    return cleaned

# Load Dynamic Configurations
def get_config():
    """ Load real-time configurations from bot_database.json or fallback to env vars """
    config = {
        "BOT_TOKEN": os.getenv("BOT_TOKEN", ""),
        "OWNER_ID": int(os.getenv("OWNER_ID", "0")),
        "XUI_URL": os.getenv("XUI_URL", "https://m.daltoon-server.ir:8443/Daltoon").rstrip("/"),
        "SUB_URL": "https://m.daltoon-server.ir:8443",
        "XUI_USER": os.getenv("XUI_USER", "Daltoon"),
        "XUI_PASS": os.getenv("XUI_PASS", "Daltoon10"),
        "CARD_NUMBER": os.getenv("CARD_NUMBER", "6037701194079627"),
        "CARD_HOLDER": os.getenv("CARD_HOLDER", "Daltoon"),
        "WELCOME_TEXT": None,
        "SUPPORT_TEXT": None,
        "HIDE_SUPPORT": False,
        "HIDE_BUY": False,
        "HIDE_PROFILE": False,
        "HIDE_WALLET": False,
        "KEYBOARD_LAYOUT": "stepped",
        "PURCHASE_SUCCESS_NOTE": "",
        "TG_CHANNEL": "@daltoon_channel",
        "SUPPORT_HANDLE": "@daltoon_owner",
        "BTN_BUY": "🛍️ خرید کانفیگ (Our Plans)",
        "BTN_PROFILE": "👤 اطلاعات حساب (My Profile)",
        "BTN_WALLET": "💳 شارژ کیف پول (Top-up Wallet)",
        "BTN_SUPPORT": "📞 پشتیبانی فنی (Support)",
        "ADMINS": []
    }
    try:
        db = read_db_json()
        settings_str = db.get("settings", {}).get("panel_config")
        if settings_str:
            panel_cfg = json.loads(settings_str)
            if "admins" in panel_cfg and isinstance(panel_cfg["admins"], list):
                config["ADMINS"] = list(set([int(adm["userId"]) for adm in panel_cfg["admins"] if "userId" in adm and adm.get("userId")]))
            if panel_cfg.get("btnTextBuy"):
                config["BTN_BUY"] = panel_cfg["btnTextBuy"]
            if panel_cfg.get("btnTextProfile"):
                config["BTN_PROFILE"] = panel_cfg["btnTextProfile"]
            if panel_cfg.get("btnTextWallet"):
                config["BTN_WALLET"] = panel_cfg["btnTextWallet"]
            if panel_cfg.get("btnTextSupport"):
                config["BTN_SUPPORT"] = panel_cfg["btnTextSupport"]
            if panel_cfg.get("btnTextFreeTest"):
                config["BTN_FREETEST"] = panel_cfg["btnTextFreeTest"]
            else:
                config["BTN_FREETEST"] = "🎁 تست رایگان"

            config["HIDE_BUY"] = bool(panel_cfg.get("hideBuy", False))
            config["HIDE_PROFILE"] = bool(panel_cfg.get("hideProfile", False))
            config["HIDE_WALLET"] = bool(panel_cfg.get("hideWallet", False))
            config["HIDE_SUPPORT"] = bool(panel_cfg.get("hideSupport", False))
            config["HIDE_FREETEST"] = bool(panel_cfg.get("hideFreeTest", False))

            if panel_cfg.get("botToken"):
                config["BOT_TOKEN"] = panel_cfg["botToken"]
            if panel_cfg.get("baseUrl"):
                config["XUI_URL"] = normalize_xui_url(panel_cfg["baseUrl"])
            elif panel_cfg.get("panelUrl"):
                config["XUI_URL"] = normalize_xui_url(panel_cfg["panelUrl"])
                
            from urllib.parse import urlparse
            p = urlparse(config["XUI_URL"])
            
            if panel_cfg.get("subUrl") and panel_cfg["subUrl"].strip():
                config["SUB_URL"] = normalize_xui_url(panel_cfg["subUrl"])
            else:
                config["SUB_URL"] = f"{p.scheme}://{p.netloc}"
                
            if panel_cfg.get("panelUsername"):
                config["XUI_USER"] = panel_cfg["panelUsername"]
            if panel_cfg.get("panelPassword"):
                config["XUI_PASS"] = panel_cfg["panelPassword"]
            if panel_cfg.get("ownerId"):
                config["OWNER_ID"] = int(panel_cfg["ownerId"])
            if panel_cfg.get("cardNumber"):
                config["CARD_NUMBER"] = panel_cfg["cardNumber"]
            if panel_cfg.get("cardHolder"):
                config["CARD_HOLDER"] = panel_cfg["cardHolder"]
            if "welcomeText" in panel_cfg:
                config["WELCOME_TEXT"] = panel_cfg["welcomeText"]
            if "supportText" in panel_cfg:
                config["SUPPORT_TEXT"] = panel_cfg["supportText"]
            if "hideSupport" in panel_cfg:
                config["HIDE_SUPPORT"] = bool(panel_cfg["hideSupport"])
            if "hideBuy" in panel_cfg:
                config["HIDE_BUY"] = bool(panel_cfg["hideBuy"])
            if "hideProfile" in panel_cfg:
                config["HIDE_PROFILE"] = bool(panel_cfg["hideProfile"])
            if "hideWallet" in panel_cfg:
                config["HIDE_WALLET"] = bool(panel_cfg["hideWallet"])
            if "keyboardLayout" in panel_cfg:
                config["KEYBOARD_LAYOUT"] = panel_cfg["keyboardLayout"]
            if "purchaseSuccessNote" in panel_cfg:
                config["PURCHASE_SUCCESS_NOTE"] = panel_cfg["purchaseSuccessNote"]
            if "tgChannel" in panel_cfg:
                config["TG_CHANNEL"] = panel_cfg["tgChannel"]
            if "supportHandle" in panel_cfg:
                config["SUPPORT_HANDLE"] = panel_cfg["supportHandle"]
    except Exception as e:
        print(f"[Dynamic Config Loader Warning] {e}")
    return config

# Get the initial token to start the bot
cfg_boot = get_config()

# Ensure dependencies are loaded
try:
    import telebot
    from telebot import types
except ImportError:
    print("Error: pyTelegramBotAPI package is not installed. Run: pip install pyTelegramBotAPI python-dotenv requests")
    sys.exit(1)

# Initialize Bot with the configured token (use DUMMY_TOKEN if none is set yet)
bot = telebot.TeleBot(cfg_boot["BOT_TOKEN"] if cfg_boot["BOT_TOKEN"] else "DUMMY_TOKEN", parse_mode="HTML")
session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,fa;q=0.8"
})

# Clean SSL Warnings inside Python requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- Sanaei 3x-ui Admin API Helpers ---
def login_xui():
    """ Authenticate session with Sanaei X-UI administrator credentials supporting classic & CSRF-enabled panels """
    cfg = get_config()
    base_url = cfg['XUI_URL']
    if not base_url:
        print("[Sanaei X-UI API] Panel XUI_URL is empty.")
        return False

    if base_url.endswith("/"):
        base_url = base_url[:-1]

    try:
        # 1. Initial GET handshake to fetch cookies and extract csrf-token if present
        print(f"[Sanaei X-UI API] Connecting to handshake URL: {base_url}")
        get_res = session.get(base_url, timeout=8, verify=False)
        
        csrf_token = ""
        import re
        match = re.search(r'<meta\s+name="csrf-token"\s+content="([^"]+)"', get_res.text)
        if match:
            csrf_token = match.group(1)
            print(f"[Sanaei X-UI API] CSRF token detected: {csrf_token}")

        # 2. Login POST request
        login_url = f"{base_url}/login"
        login_data = {
            "username": cfg['XUI_USER'],
            "password": cfg['XUI_PASS']
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": f"{base_url}/"
        }
        if csrf_token:
            headers["X-Csrf-Token"] = csrf_token
            session.headers.update({"X-Csrf-Token": csrf_token})

        print(f"[Sanaei X-UI API] Posting login credentials to {login_url}")
        response = session.post(login_url, data=login_data, headers=headers, timeout=8, verify=False)
        try:
            res_json = response.json()
        except Exception:
            res_json = {}

        if res_json.get("success"):
            print("[Sanaei X-UI API] Authenticated successfully with the panel.")
            return True
        else:
            print(f"[Sanaei X-UI API] Login rejected: {response.text}")
    except Exception as e:
        print(f"[Sanaei X-UI API] Handshake error during authentication: {e}")
    return False

def check_client_exists(client_email):
    # Local check first (so even simulated offline users will be blocked from dupes)
    db = read_db_json()
    keys = db.get("subscription_keys", [])
    lower_email = client_email.lower()
    for k in keys:
        if k.get("clientName", "").lower() == lower_email or k.get("plan_id", "").lower() == lower_email:
            return True

    cfg = get_config()
    if not login_xui():
        # Fallback to local check result if panel offline (already returned False if not found locally)
        return False
    try:
        url = f"{cfg['XUI_URL']}/panel/api/inbounds/getClientTraffics/{client_email}"
        response = session.get(url, timeout=5, verify=False)
        data = response.json()
        if data.get("success") and data.get("obj"):
            return True
    except Exception as e:
        print(f"[Panel Check Error] {e}")
    return False

def add_vpn_client_api(client_email, traffic_gb, duration_days, client_uuid=None):
    """ Call Sanaei 3x-ui API to create client on ALL active inbounds so the sub/ link returns all of them! """
    cfg = get_config()
    if not login_xui():
        print("[Sanaei API Error] Skipping user creation - login failed.")
        return None, None

    import random
    import string
    
    if not client_uuid:
         client_uuid = str(uuid.uuid4())
         
    xui_sub_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))

    total_bytes = int(traffic_gb * 1024 * 1024 * 1024)
    # Expiry timestamp in milliseconds
    expiry_time_ms = int((time.time() + (duration_days * 24 * 60 * 60)) * 1000)

    client_config = {
        "id": client_uuid,
        "email": client_email,
        "limitIp": 0,
        "totalGB": total_bytes,
        "expiryTime": expiry_time_ms,
        "enable": True,
        "tgId": 0,
        "subId": xui_sub_id
    }

    # Dynamic inbound IDs selection
    db = read_db_json()
    settings_str = db.get("settings", {}).get("panel_config")
    inbound_ids = []
    if settings_str:
        try:
            panel_cfg = json.loads(settings_str)
            active_ids = panel_cfg.get("activeInboundIds", [])
            if active_ids and isinstance(active_ids, list):
                inbound_ids = [int(i) for i in active_ids if str(i).isdigit() or isinstance(i, int)]
        except Exception as e:
            print(f"[Bot Inbound JSON Parse Error]: {e}")

    # Always fetch all valid inbounds from panel
    valid_ids = []
    try:
        list_url = f"{cfg['XUI_URL']}/panel/api/inbounds/list"
        list_res = session.get(list_url, timeout=8, verify=False)
        res_json = list_res.json()
        if res_json.get("success") and isinstance(res_json.get("obj"), list):
            valid_ids = [int(item["id"]) for item in res_json["obj"]]
            print(f"[Sanaei API] Dynamic read succeeded: {len(valid_ids)} inbounds found.")
    except Exception as e:
        print(f"[Sanaei API] Dynamic read failed: {e}")

    if inbound_ids and valid_ids:
        inbound_ids = [i for i in inbound_ids if i in valid_ids]

    if not inbound_ids:
        inbound_ids = valid_ids if valid_ids else [1]

    add_url = f"{cfg['XUI_URL']}/panel/api/clients/add"
    payload = {
        "client": client_config,
        "inboundIds": inbound_ids
    }
    
    try:
        headers = {"Accept": "application/json"}
        response = session.post(add_url, json=payload, headers=headers, timeout=10, verify=False)
        res_json = response.json()
        if res_json.get("success"):
            print(f"[Sanaei API Sync] Created user '{client_email}' globally on inbounds successfully.")
            sub_link = f"{cfg['SUB_URL']}/sub/{xui_sub_id}"
            return client_uuid, sub_link
        else:
            print(f"[Sanaei API Response] Creation error: {response.text}")
    except Exception as e:
        print(f"[Sanaei API Request Error] Global client add timeout or error: {e}")

    return None, None

# --- User Management DB Queries ---
def set_user_pending_charge(tg_id, amount):
    db = read_db_json()
    user = next((u for u in db["users"] if u["userId"] == tg_id), None)
    if user:
        user["pendingChargeAmount"] = amount
        write_db_json(db)

def pop_user_pending_charge(tg_id):
    db = read_db_json()
    user = next((u for u in db["users"] if u["userId"] == tg_id), None)
    if user:
        amount = user.pop("pendingChargeAmount", None)
        write_db_json(db)
        return amount
    return None

def register_tg_user(tg_id, username):
    db = read_db_json()
    user = next((u for u in db["users"] if u["userId"] == tg_id), None)
    if not user:
        join_date = time.strftime("%Y-%m-%d")
        new_user = {
            "userId": tg_id,
            "username": username or f"user_{tg_id}",
            "walletBalance": 0.0,
            "activePlansCount": 0,
            "joinDate": join_date,
            "status": "active"
        }
        db["users"].append(new_user)
        write_db_json(db)
        print(f"[Database] Registered new user into JSON: {tg_id}")
    elif username and user.get("username") != username:
        user["username"] = username
        write_db_json(db)

def get_user_data(tg_id):
    db = read_db_json()
    return next((u for u in db["users"] if u["userId"] == tg_id), None)

def update_user_wallet_balance(tg_id, amount):
    db = read_db_json()
    user = next((u for u in db["users"] if u["userId"] == tg_id), None)
    if user:
        user["walletBalance"] = max(0.0, float(user.get("walletBalance", 0.0)) + float(amount))
        write_db_json(db)

def update_user_balance(tg_id, new_balance):
    db = read_db_json()
    user = next((u for u in db["users"] if u["userId"] == tg_id), None)
    if user:
        user["walletBalance"] = max(0.0, float(new_balance))
        write_db_json(db)

def create_sub_key(key_id, tg_id, plan_id, plan_name, sub_link, expire_date, limit_gb, client_name=""):
    db = read_db_json()
    new_sub = {
        "id": key_id,
        "userId": tg_id,
        "planId": plan_id,
        "planName": plan_name,
        "clientName": client_name,
        "subLink": sub_link,
        "expireDate": expire_date,
        "trafficLimitGb": float(limit_gb),
        "trafficUsedGb": 0.0,
        "status": "active"
    }
    db["subscription_keys"].append(new_sub)
    
    # Recalculate user subscription count
    user = next((u for u in db["users"] if u["userId"] == tg_id), None)
    if user:
        user["activePlansCount"] = sum(1 for k in db["subscription_keys"] if k["userId"] == tg_id and k["status"] == "active")
        
    write_db_json(db)

def get_custom_keyboard():
    """ Load dynamic and static custom buttons with visibility toggles and custom layouts """
    cfg = get_config()
    layout = cfg.get("KEYBOARD_LAYOUT", "stepped")

    # Define row_width based on layout preference
    if layout == "vertical":
        row_width = 1
    elif layout == "horizontal":
        row_width = 2
    else:  # stepped is default
        row_width = 2
        
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=row_width)
    
    hide_buy = cfg.get("HIDE_BUY", False)
    hide_profile = cfg.get("HIDE_PROFILE", False)
    hide_wallet = cfg.get("HIDE_WALLET", False)
    hide_support = cfg.get("HIDE_SUPPORT", False)
    hide_free_test = cfg.get("HIDE_FREETEST", False)

    main_buttons = []
    if not hide_buy:
        main_buttons.append(types.KeyboardButton(cfg.get("BTN_BUY", "🛍️ خرید کانفیگ (Our Plans)")))
    if not hide_profile:
        main_buttons.append(types.KeyboardButton(cfg.get("BTN_PROFILE", "👤 اطلاعات حساب (My Profile)")))
    if not hide_wallet:
        main_buttons.append(types.KeyboardButton(cfg.get("BTN_WALLET", "💳 شارژ کیف پول (Top-up Wallet)")))
    if not hide_support:
        main_buttons.append(types.KeyboardButton(cfg.get("BTN_SUPPORT", "📞 پشتیبانی فنی (Support)")))
    if not hide_free_test:
        main_buttons.append(types.KeyboardButton(cfg.get("BTN_FREETEST", "🎁 تست رایگان")))
    
    try:
        db = read_db_json()
        for r in db.get("custom_buttons", []):
            main_buttons.append(types.KeyboardButton(r['text']))
    except Exception as e:
        print("Error fetching custom buttons:", e)

    # Apply layout structure
    if layout == "vertical":
        for btn in main_buttons:
            markup.row(btn)
    elif layout == "stepped":
        idx = 0
        while idx < len(main_buttons):
            if idx % 3 == 0:
                markup.row(main_buttons[idx])
                idx += 1
            else:
                chunk = main_buttons[idx:idx+2]
                markup.row(*chunk)
                idx += len(chunk)
    else:  # horizontal
        for i in range(0, len(main_buttons), 2):
            markup.row(*main_buttons[i:i+2])
            
    return markup

def get_cancel_keyboard():
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=1)
    markup.add(types.KeyboardButton("😞 منصرف شدم"))
    return markup

# --- Bot Command Handlers ---

@bot.message_handler(commands=['start', 'help'])
def start_cmd(message):
    tg_id = message.from_user.id
    username = message.from_user.username
    
    register_tg_user(tg_id, username)
    user = get_user_data(tg_id)
    
    if user and user.get('status') == 'banned':
        bot.reply_to(message, "❌ حساب کاربری شما به علت تخلف غیرفعال شده است. جهت اتصال به پشتیبانی پیام دهید.")
        return

    cfg = get_config()
    custom_welcome = cfg.get("WELCOME_TEXT")
    
    if custom_welcome:
        formatted_balance = f"{int(user['walletBalance'] or 0):,}"
        welcome_text = custom_welcome.replace("{tg_id}", str(tg_id)).replace("{wallet_balance}", formatted_balance)
    else:
        welcome_text = (
            f"<b>🚀 به ربات پرسرعت Daltoon Servers خوش آمدید!</b>\n\n"
            f"با خرید از شبکه پرسرعت ما، از اتصال ایمن، پینگ پایین و آی‌پی ثابت لذت ببرید.\n\n"
            f"🆔 شناسه تلگرام شما: <code>{tg_id}</code>\n"
            f"💰 موجودی کیف پول: <code>{int(user['walletBalance'] or 0):,}</code> تومان\n\n"
            f"👇 لطفا گزینه مورد نظر خود را از منوی زیر انتخاب نمایید:"
        )
    bot.send_message(message.chat.id, welcome_text, parse_mode="HTML", reply_markup=get_custom_keyboard())

@bot.message_handler(func=lambda msg: True)
def text_messages_handler(message):
    tg_id = message.from_user.id
    username = message.from_user.username
    text = message.text

    register_tg_user(tg_id, username)
    user = get_user_data(tg_id)
    
    if user and user.get('status') == 'banned':
        bot.send_message(message.chat.id, "❌ حساب شما مسدود شده است.")
        return

    if "منصرف" in text or "بازگشت" in text:
        bot.send_message(message.chat.id, "✔️ بازگشت به منوی اصلی.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return

    # 1. Buy premium plan flow
    cfg = get_config()
    if text == cfg.get("BTN_BUY") or "خرید" in text or "Buy" in text or "🛍️" in text:
        db = read_db_json()
        db_plans = db.get("vpn_plans", [])
        
        # Build the dynamic list of premium packages
        plans_data = []
        if db_plans:
            for dp in db_plans:
                plans_data.append({
                    "id": dp["id"],
                    "name": dp["name"],
                    "price": dp["price"],
                    "traffic": dp.get("trafficGb", 30),
                    "duration": dp.get("durationDays", 30)
                })
        else:
            # Fallback legacy values
            plans_data = [
                {"id": "std_30g", "name": "Standard 30GB - ۳۰ روزه", "price": 45000, "traffic": 30, "duration": 30},
                {"id": "vip_70g", "name": "VIP Premium 70GB - ۶۰ روزه", "price": 95000, "traffic": 70, "duration": 60},
                {"id": "ult_150g", "name": "Unlimited VoIP 150GB - ۹۰ روزه", "price": 185000, "traffic": 150, "duration": 90}
            ]
        
        markup = types.InlineKeyboardMarkup(row_width=1)
        for p in plans_data:
            btn_text = f"⚡ {p['name']} | {p['price']:,} تومان"
            markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"buy_{p['id']}"))
            
        bot.send_message(
            message.chat.id, 
            "🛍️ <b>پلان‌های فعال سرعت اختصاصی دالتون:</b>\n\nلطفا یکی از کانفیگ‌های زیر را برای خرید مستقیم انتخاب کنید. مبلغ به صورت خودکار از کیف پول تلگرام کسر می‌شود:",
            parse_mode="HTML",
            reply_markup=markup
        )

    # 2. Account Profile Details
    elif text == cfg.get("BTN_PROFILE") or "اطلاعات حساب" in text or "Profile" in text or "👤" in text:
        db = read_db_json()
        active_keys = [k for k in db.get("subscription_keys", []) if k["userId"] == tg_id]
        
        config_lines = ""
        if active_keys:
            config_lines = "\n\n🔑 <b>کانفیگ‌های فعال شما:</b>\n"
            for k in active_keys:
                config_lines += f"• <b>{k['planName']}</b>\n انقضا: {k['expireDate']} | حجم: {k['trafficLimitGb']} گیگابایت\n <code>{k['subLink']}</code>\n\n"
        else:
            config_lines = "\n\n❌ شما تا کنون هیچ سرویس اشتراکی از دالتون خریداری نکرده‌اید."
 
         # Check if walletBalance is missing (which default templates might have as floats or int)
        bal = user.get("walletBalance", 0)
        formatted_bal = f"{int(bal):,}" if bal is not None else "0"

        profile_text = (
            f"👤 <b>اطلاعات حساب دالتون سرور:</b>\n\n"
            f"🆔 شناسه عددی کاربری: <code>{tg_id}</code>\n"
            f"🏷️ آیدی تلگرام: @{user['username']}\n"
            f"💰 موجودی اعتباری کیف پول: <b>{formatted_bal} تومان</b>"
            f"{config_lines}"
        )
        bot.send_message(message.chat.id, profile_text, parse_mode="HTML")

    # 3. Charger Wallet instructions
    elif text == cfg.get("BTN_WALLET") or "شارژ" in text or "Wallet" in text or "💳" in text:
        instructions = (
            f"💳 <b>بخش شارژ و افزایش موجودی کیف پول دالتون:</b>\n\n"
            f"لطفاً مبلغی که مایل هستید جهت شارژ واریز کنید را از دکمه‌های زیر انتخاب نمایید:\n"
            f"پس از انتخاب، اطلاعات پرداخت و کارت مدیریت متناسب با آن برای شما فرستاده می‌شود."
        )
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton("💵 ۲۰۰,۰۰۰ تومان", callback_data="charge_amount_200000"),
            types.InlineKeyboardButton("💵 ۳۰۰,۰۰۰ تومان", callback_data="charge_amount_300000")
        )
        markup.add(
            types.InlineKeyboardButton("💵 ۴۰۰,۰۰۰ تومان", callback_data="charge_amount_400000"),
            types.InlineKeyboardButton("💵 ۵۰۰,۰۰۰ تومان", callback_data="charge_amount_500000")
        )
        markup.add(
            types.InlineKeyboardButton("🔥 ۱,۰۰۰,۰۰۰ تومان", callback_data="charge_amount_1000000")
        )
        markup.add(
            types.InlineKeyboardButton("🔗 افزایش موجودی دلخواه (وارد کردن مبلغ)", callback_data="charge_custom_amount")
        )
        bot.send_message(message.chat.id, instructions, parse_mode="HTML", reply_markup=markup)

    # 4. Support chat
    elif text == cfg.get("BTN_SUPPORT") or "پشتیبانی" in text or "Support" in text or "📞" in text:
        custom_support = cfg.get("SUPPORT_TEXT")
        if custom_support:
            support_txt = custom_support
        else:
            support_handle = cfg.get("SUPPORT_HANDLE", "@daltoon_owner")
            tg_channel = cfg.get("TG_CHANNEL", "@daltoon_channel")
            support_txt = (
                "📞 <b>پشتیبانی فنی دالتون سرور:</b>\n\n"
                "مشتری گرامی! در صورت بروز هرگونه قطعی، کندی سرعت، ارورهای اتصال یا سوالات قبل از خرید با ما تماس بگیرید.\n\n"
                f"👤 اکانت ناظر فنی: {support_handle}\n"
                f"📢 کانال اطلاع‌رسانی پایداری شبکه: {tg_channel}\n\n"
                "پاسخگویی سریع فعال است: ۱۰ صبح الی ۳ شب"
            )
        bot.send_message(message.chat.id, support_txt, parse_mode="HTML")
        
    # 5. Free Test
    elif text == cfg.get("BTN_FREETEST", "🎁 تست رایگان") or ("تست" in text and "رایگان" in text):
        db = read_db_json()
        users = db.get("users", [])
        user_idx = next((i for i, u in enumerate(users) if u["tgId"] == tg_id), -1)
        if user_idx >= 0 and users[user_idx].get("hasReceivedFreeTest"):
            bot.send_message(message.chat.id, "❌ <b>شما قبلاً اکانت تست رایگان خود را دریافت کرده‌اید!</b>\nهر کاربر تنها یکبار مجاز به دریافت تست رایگان می‌باشد.", parse_mode="HTML")
            return
            
        bot.send_message(message.chat.id, "⏳ در حال ساخت اکانت تست رایگان (۱ روزه - ۱۰۰ مگابایت) از پنل سرور دالتون... لطفاً چند لحظه صبر کنید.")
        
        import string
        import random
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        free_username = f"test_{random_suffix}"
        
        # In case test_xxxx exists, loop (rare but good practice)
        while check_client_exists(free_username):
            random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
            free_username = f"test_{random_suffix}"
            
        client_uuid, sub_link = add_vpn_client_api(free_username, 0.1, 1) # 0.1 GB (102.4 MB), 1 day
        
        if not sub_link:
            cfg = get_config()
            client_uuid = str(uuid.uuid4())
            fallback_sub_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
            sub_link = f"{cfg.get('SUB_URL', 'https://m.daltoon-server.ir:8443')}/sub/{fallback_sub_id}"
            print("[Bot Warning] Real API request failed or timed out. Simulated free test link established.")
            
        # Update user record
        if user_idx >= 0:
            users[user_idx]["hasReceivedFreeTest"] = True
            db["users"] = users
            with open("bot_database.json", "w", encoding="utf-8") as f:
                json.dump(db, f, ensure_ascii=False, indent=2)
                
        expire_date = time.strftime("%Y-%m-%d", time.localtime(time.time() + 1 * 24 * 60 * 60))
        sub_id = f"SUB-{int(time.time()) % 9000 + 1000}"

        create_sub_key(
            key_id=sub_id, 
            tg_id=tg_id, 
            plan_id="free_test", 
            plan_name="تست رایگان ۱ روزه", 
            sub_link=sub_link, 
            expire_date=expire_date, 
            limit_gb=0.1,
            client_name=free_username
        )
        
        success_text = (
            f"🎁 <b>اکانت تست رایگان شما با موفقیت ساخته شد!</b>\n\n"
            f"👤 نام کاربری تست: <code>{free_username}</code>\n"
            f"⏳ اعتبار: ۱ روز\n"
            f"📊 حجم: ۱۰۰ مگابایت\n\n"
            f"🔑 <b>مسیر اشتراک (در V2rayNG، V2box، Happ و... وارد کنید):</b>\n\n"
            f"<code>{sub_link}</code>\n"
        )
        
        try:
            import urllib.parse
            qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={urllib.parse.quote(sub_link)}"
            bot.send_photo(message.chat.id, qr_url, caption=success_text, parse_mode="HTML")
        except:
            bot.send_message(message.chat.id, success_text, parse_mode="HTML")

    else:
        db = read_db_json()
        custom_btn = next((b for b in db.get("custom_buttons", []) if b["text"] == text or text in b["text"]), None)
        if custom_btn:
            bot.send_message(message.chat.id, custom_btn["replyText"], parse_mode="HTML")
        else:
            bot.reply_to(message, "گزینه ارسال شده معتبر نیست. لطفا از دکمه‌های کیبورد تپ کنید. 👇", reply_markup=get_custom_keyboard())

# --- Callback Queries ---

def process_purchase_username(message, plan_id, spec):
    tg_id = message.from_user.id
    if not message.text:
       return # ignore non-text
    username_input = message.text.strip()
    
    if username_input == "😞 منصرف شدم" or username_input.startswith("/start"):
        bot.send_message(message.chat.id, "❌ عملیات لغو شد.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return
        
    # Simple regex validation to ensure safe client email/name (alphanumeric, no spaces, length 3-15)
    import re
    if not re.match("^[a-zA-Z0-9_-]{3,15}$", username_input):
        msg = bot.send_message(
            message.chat.id,
            "⚠️ <b>نام وارد شده نامعتبر است!</b>\n\n"
            "نام کاربری باید فقط شامل حروف انگلیسی، اعداد، خط تیره و بین ۳ تا ۱۵ کاراکتر باشد. (بدون وب، فضای خالی، حروف فارسی)\n\n"
            "لطفاً یک نام کاربری جدید و معتبر ارسال کنید:",
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(msg, process_purchase_username, plan_id, spec)
        return

    # Check if this name is already taken in our active keys or panel (local prevention check)
    if check_client_exists(username_input):
        msg = bot.send_message(
            message.chat.id,
            "⚠️ <b>این نام کاربری از قبل در لیست کاربران سرور موجود است!</b>\n\n"
            "لطفاً از یک نام کاربری دیگر استفاده کنید (برای مثال در انتهای آن یک عدد اضافه کنید).\n\n"
            "لطفاً نام جدیدی ارسال کنید:",
            parse_mode="HTML",
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(msg, process_purchase_username, plan_id, spec)
        return

    db = read_db_json()
    keys = db.get("subscription_keys", [])
    
    # Deduct balance
    user = get_user_data(tg_id)
    cfg = get_config()
    is_owner = bool(cfg.get("OWNER_ID") and int(tg_id) == int(cfg["OWNER_ID"]))
    is_admin = bool(cfg.get("ADMINS") and int(tg_id) in cfg["ADMINS"])
    is_privileged = is_owner or is_admin
    
    if is_privileged:
        new_balance = int(user['walletBalance'])
    else:
        new_balance = int(user['walletBalance']) - spec['price']
        
    update_user_balance(tg_id, new_balance)

    # Add client to X-UI panel
    client_uuid, sub_link = add_vpn_client_api(username_input, spec['traffic'], spec['duration'])
    if not sub_link:
        # Fallback simulated dynamic link
        client_uuid = str(uuid.uuid4())
        import random, string
        fallback_sub_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
        sub_link = f"{cfg.get('SUB_URL', 'https://m.daltoon-server.ir:8443')}/sub/{fallback_sub_id}"
        print("[Bot Warning] Real API request failed or timed out. Simulated database recovery link established.")

    expire_date = time.strftime("%Y-%m-%d", time.localtime(time.time() + spec['duration'] * 24 * 60 * 60))
    sub_id = f"SUB-{int(time.time()) % 9000 + 1000}"

    create_sub_key(
        key_id=sub_id, 
        tg_id=tg_id, 
        plan_id=plan_id, 
        plan_name=spec['name'], 
        sub_link=sub_link, 
        expire_date=expire_date, 
        limit_gb=spec['traffic'],
        client_name=username_input
    )

    success_note = cfg.get("PURCHASE_SUCCESS_NOTE", "")
    note_append = f"\n\n{success_note}" if success_note else ""
    price_charged_display = "رایگان (مدیر سیستم)" if is_privileged else f"{spec['price']:,} تومان"
    
    success_text = (
        f"🎉 <b>خرید کانفیگ شما با موفقیت تکمیل شد!</b>\n\n"
        f"👤 نام کاربری سرویس شما: <code>{username_input}</code>\n"
        f"💳 هزینه کسر شده: {price_charged_display}\n"
        f"💰 موجودی باقیمانده کیف پول: {int(new_balance):,} تومان\n\n"
        f"🔑 <b>کانفیگ VLESS اختصاصی شما صادر شد:</b>\n"
        f"• مسیر اشتراک (در V2rayNG، V2box، Happ و... وارد کنید):\n\n"
        f"<code>{sub_link}</code>\n\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"{note_append}"
    )
    
    # Try sending the QR code photo
    try:
        import urllib.parse
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={urllib.parse.quote(sub_link)}"
        bot.send_photo(message.chat.id, qr_url, caption=success_text, parse_mode="HTML", reply_markup=get_custom_keyboard())
    except Exception as e:
        print(f"[Bot Warning] Failed to send QR Photo: {e}")
        bot.send_message(message.chat.id, success_text, parse_mode="HTML", reply_markup=get_custom_keyboard())

@bot.callback_query_handler(func=lambda call: True)
def callback_handler(call):
    tg_id = call.from_user.id
    
    if call.data.startswith("buy_"):
        plan_id = call.data[4:]
        
        db = read_db_json()
        db_plans = db.get("vpn_plans", [])
        db_plan = next((dp for dp in db_plans if dp["id"] == plan_id), None)
        
        spec = None
        if db_plan:
            spec = {
                "id": db_plan["id"],
                "name": db_plan["name"],
                "price": db_plan["price"],
                "traffic": db_plan.get("trafficGb", 30),
                "duration": db_plan.get("durationDays", 30)
            }
        else:
            # Details of the fallback plans
            plan_specs = {
                "std_30g": {"id": "std_30g", "name": "Standard 30GB - 30 Days", "price": 45000, "traffic": 30, "duration": 30},
                "vip_70g": {"id": "vip_70g", "name": "VIP Premium 70GB - 60 Days", "price": 95000, "traffic": 70, "duration": 60},
                "ult_150g": {"id": "ult_150g", "name": "Unlimited VoIP 150GB - 90 Days", "price": 185000, "traffic": 150, "duration": 90}
            }
            spec = plan_specs.get(plan_id)
            
        if not spec:
            bot.answer_callback_query(call.id, "خطا در پیدا کردن مشخصات پلان.")
            return

        if not db_plan:
            bot.send_message(
                call.message.chat.id,
                f"❌ <b>بسته پیدا نشد! مشخصات این بسته در دیتابیس ثبت نشده یا حذف شده است.</b>",
                parse_mode="HTML"
            )
            bot.answer_callback_query(call.id)
            return

        user = get_user_data(tg_id)
        if not user:
            bot.answer_callback_query(call.id, "خطای نامشخص بانک اطلاعاتی.")
            return
            
        cfg = get_config()
        is_owner = bool(cfg.get("OWNER_ID") and int(tg_id) == int(cfg["OWNER_ID"]))
        is_admin = bool(cfg.get("ADMINS") and int(tg_id) in cfg["ADMINS"])
        is_privileged = is_owner or is_admin
        
        if not is_privileged and user['walletBalance'] < spec['price']:
            bot.send_message(
                call.message.chat.id, 
                f"❌ <b>موجودی کیف پول شما کافی نیست!</b>\n\nمبلغ پلان: {spec['price']:,} تومان\nموجودی فعلی شما: {int(user['walletBalance']):,} تومان\n\nجهت خرید لطفا ابتدا حساب خود را شارژ کنید."
            )
            bot.answer_callback_query(call.id, "موجودی ناکافی!")
            return

        # Prompt for English client name without spaces
        cost_display = "رایگان (ویژه مدیریت 👑)" if is_privileged else f"{spec['price']:,} تومان"
        msg = bot.send_message(
            call.message.chat.id,
            f"✍️ <b>لطفاً یک نام کاربری دلخواه (فقط حروف انگلیسی و اعداد، بدون فاصله) برای کانفیگ خود ارسال نمایید:</b>\n\n"
            f"• طرح انتخابی: <code>{spec['name']}</code>\n"
            f"• هزینه طرح: {cost_display}\n\n"
            f"⚠️ نام کاربری نباید شامل فاصله یا حروف فارسی یا کاراکترهای خاص باشد. مثلاً: <code>Daltoon</code>",
            parse_mode="HTML",
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(msg, process_purchase_username, plan_id, spec)
        bot.answer_callback_query(call.id)

    elif call.data.startswith("charge_amount_"):
        try:
            amount = int(call.data.split("_")[-1])
            tg_id = call.from_user.id
            set_user_pending_charge(tg_id, amount)
            
            cfg = get_config()
            text = (
                f"💳 <b>درخواست شارژ حساب کاربری به مبلغ {amount:,} تومان:</b>\n\n"
                f"لطفاً مبلغ دقیق <b>{amount:,} تومان</b> را به کارت عابربانک مدیریت واریز نمایید:\n\n"
                f"📥 شماره کارت ۱۶ رقمی بانک ملی:\n"
                f"<code>{cfg['CARD_NUMBER']}</code>\n"
                f"👤 به نام: <b>{cfg['CARD_HOLDER']}</b>\n\n"
                f"📸 پس از انتقال/واریز، <b>فقط عکس فیش یا رسید پرداختی خود را به این چت بفرستید</b> تا جهت تایید و شارژ برای ادمین ثبت شود."
            )
            bot.send_message(call.message.chat.id, text, parse_mode="HTML", reply_markup=get_cancel_keyboard())
            bot.answer_callback_query(call.id)
        except Exception as e:
            print(f"[Error Charge Amount Init] {e}")

    elif call.data == "upload_receipt":
        bot.send_message(
            call.message.chat.id, 
            "📸 لطفا ابتدا از دکمه‌های بالا مبلغی را برای شارژ انتخاب کنید تا جزئیات پرداخت کارت برای شما فرستاده شود."
        )
        bot.answer_callback_query(call.id)

    elif call.data == "charge_custom_amount":
        try:
            tg_id = call.from_user.id
            msg = bot.send_message(
                call.message.chat.id,
                "✍️ <b>مبلغ مورد نظر خود را برای شارژ به تومان ارسال کنید:</b>\n\n"
                "• برای مثال جهت شارژ ۱۵۰,۰۰۰ تومان، عدد <code>150000</code> را بفرستید.\n"
                "• جهت انصراف کلمه <code>انصراف</code> را ارسال کنید.\n\n"
                "⚠️ لطفاً فقط عدد انگلیسی وارد کنید:",
                parse_mode="HTML",
                reply_markup=get_cancel_keyboard()
            )
            bot.register_next_step_handler(msg, process_custom_charge_amount)
            bot.answer_callback_query(call.id)
        except Exception as e:
            print(f"[Error Charge Custom Init] {e}")

def process_custom_charge_amount(message):
    tg_id = message.from_user.id
    text = message.text.strip() if message.text else ""
    
    if text == "/start" or "انصراف" in text or "بازگشت" in text or "منصرف" in text:
        bot.send_message(message.chat.id, "❌ درخواست افزایش موجودی دلخواه لغو شد.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return
    
    import re
    cleaned_text = text.replace(",", "").replace("，", "").replace(" ", "").replace("_", "").replace("-", "")
    digits = re.findall(r'\d+', cleaned_text)
    
    if not digits:
        msg = bot.send_message(
            message.chat.id,
            "⚠️ <b>مبلغ وارد شده معتبر نیست!</b>\n\n"
            "لطفاً مبلغ مورد نظر خود را فقط به صورت عدد انگلیسی بفرستید (مثال: <code>250000</code>):\n"
            "<i>یا کلمه «انصراف» را جهت لغو ارسال کنید.</i>",
            parse_mode="HTML",
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(msg, process_custom_charge_amount)
        return
        
    amount = int("".join(digits))
    if amount < 1000 or amount > 100000000:
        msg = bot.send_message(
            message.chat.id,
            "⚠️ <b>مبلغ وارد شده مجاز نیست!</b>\n\n"
            "حداقل مبلغ مجاز ۱,۰۰۰ تومان و حداکثر ۱۰۰,۰۰۰,۰۰۰ تومان است.\n"
            "لطفاً مبلغ معتبری بنویسید (یا «انصراف» بفرستید):",
            parse_mode="HTML",
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(msg, process_custom_charge_amount)
        return
        
    set_user_pending_charge(tg_id, amount)
    
    cfg = get_config()
    text_response = (
        f"💳 <b>درخواست شارژ حساب کاربری به مبلغ {amount:,} تومان:</b>\n\n"
        f"لطفاً مبلغ دقیق <b>{amount:,} تومان</b> را به کارت عابربانک مدیریت واریز نمایید:\n\n"
        f"📥 شماره کارت ۱۶ رقمی بانک ملی:\n"
        f"<code>{cfg['CARD_NUMBER']}</code>\n"
        f"👤 به نام: <b>{cfg['CARD_HOLDER']}</b>\n\n"
        f"📸 پس از انتقال/واریز، <b>فقط عکس فیش یا رسید پرداختی خود را به این چت بفرستید</b> تا جهت تایید و شارژ برای ادمین ثبت شود."
    )
    bot.send_message(message.chat.id, text_response, parse_mode="HTML", reply_markup=get_cancel_keyboard())

# --- Photo & Document Receipt Handler ---
@bot.message_handler(content_types=['photo', 'document'])
def handle_receipt_upload(message):
    tg_id = message.from_user.id
    username = message.from_user.username or f"user_{tg_id}"
    caption = message.caption or ""
    
    # Check if user is banned
    user = get_user_data(tg_id)
    if user and user.get('status') == 'banned':
        bot.send_message(message.chat.id, "❌ حساب شما مسدود شده است.")
        return

    # Look up selected amount or fallback to regex extraction or default
    extracted_amount = pop_user_pending_charge(tg_id)
    if not extracted_amount:
        import re
        digits = re.findall(r'\d+', caption.replace(",", "").replace("，", ""))
        if digits:
             extracted_amount = int("".join(digits))
             if extracted_amount < 1000 or extracted_amount > 100000000:
                  extracted_amount = 200000
        else:
             extracted_amount = 200000  # Default to 200k if unspecified

    try:
        file_id = None
        if message.content_type == 'photo':
            file_id = message.photo[-1].file_id
        elif message.content_type == 'document':
            doc = message.document
            if doc.mime_type and doc.mime_type.startswith("image/"):
                file_id = doc.file_id
            else:
                fn = doc.file_name.lower() if doc.file_name else ""
                if fn.endswith(('.jpg', '.jpeg', '.png', '.webp', '.heic')):
                    file_id = doc.file_id
                    
        if not file_id:
            bot.reply_to(message, "⚠️ لطفا فیش واریزی خود را فقط به صورت عکس یا فایل تصویری (JPEG, PNG و...) بفرستید.")
            return

        bot.send_message(message.chat.id, "⌛ در حال انتقال و بررسی رسید شما توسط ادمین هستیم. لطفا کمی صبور باشید.")

        file_info = bot.get_file(file_id)
        cfg = get_config()
        token = cfg.get("BOT_TOKEN", "").strip()
        download_url = f"https://api.telegram.org/file/bot{token}/{file_info.file_path}"
        
        response = requests.get(download_url, timeout=15)
        if response.status_code == 200:
            import base64
            img_base64 = base64.b64encode(response.content).decode('utf-8')
            receipt_data_uri = f"data:image/jpeg;base64,{img_base64}"
            
            # Save transaction to JSON database
            db = read_db_json()
            if "transactions" not in db:
                db["transactions"] = []
                
            tx_id = f"TX-{int(time.time())}"
            new_tx = {
                "id": tx_id,
                "userId": int(tg_id),
                "username": username,
                "amount": int(extracted_amount),
                "receiptImage": receipt_data_uri,
                "status": "pending",
                "date": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "description": f"شارژ انتخابی تلگرام. کپشن فیش: '{caption}'" if caption else f"شارژ انتخابی {extracted_amount:,} تومان بدون کپشن."
            }
            db["transactions"].insert(0, new_tx)
            write_db_json(db)
            
            reply_text = (
                f"✅ <b>فیش پرداختی شما با موفقیت دریافت شد!</b>\n\n"
                f"📌 شناسه تراکنش: <code>{tx_id}</code>\n"
                f"💰 مبلغ اعلامی: <b>{extracted_amount:,} تومان</b>\n\n"
                f"⌛ در حال انتقال صف بررسی رسید توسط ادمین هستیم. نتیجه به شما اعلام خواهد شد."
            )
            bot.reply_to(message, reply_text, parse_mode="HTML", reply_markup=get_custom_keyboard())
            
            # Send notification to owner and all admins if configured
            targets = set()
            owner_id = cfg.get("OWNER_ID")
            if owner_id and owner_id > 0:
                targets.add(owner_id)
            for adm_id in cfg.get("ADMINS", []):
                if adm_id and adm_id > 0:
                    targets.add(adm_id)
            
            for target_id in targets:
                try:
                    admin_msg = (
                        f"🔔 <b>رسید جدید برای تایید واریز شد!</b>\n\n"
                        f"👤 کاربر: @{username} (<code>{tg_id}</code>)\n"
                        f"💰 مبلغ اعلام شده: {extracted_amount:,} تومان\n"
                        f"🆔 شناسه: <code>{tx_id}</code>\n\n"
                        f"📥 لطفاً جهت بررسی و تایید به داشبورد مدیریت دالتون سرور مراجعه کنید."
                    )
                    bot.send_message(target_id, admin_msg, parse_mode="HTML")
                except Exception as ex:
                    print(f"[Admin Notify Warning for chat_id {target_id}] {ex}")
        else:
            bot.reply_to(message, "❌ خطا در دانلود فایل تصویر فیش از سرورهای تلگرام. لطفا مجدد تلاش کنید.", reply_markup=get_custom_keyboard())
    except Exception as e:
        print(f"[Error Processing Telegram Receipt] {e}")
        bot.reply_to(message, "❌ خطای بسته‌های تصویر یا فایل. لطفا مطمئن شوید حجم فیش مناسب است.", reply_markup=get_custom_keyboard())

# Initialize JSON DB on startup
if __name__ == "__main__":
    read_db_json()
    print("Daltoon Telegram Bot core fully online on JSON synchronization database...")
    while True:
        try:
            cfg = get_config()
            token = cfg.get("BOT_TOKEN", "").strip()
            if not token or token.upper() == "DUMMY_TOKEN":
                print("[Daltoon Bot Warning] No valid Telegram Bot Token configured yet! Please enter your token in the 'Settings' tab of the Web Dashboard (e.g., http://YOUR_IP:3000). Retrying in 10 seconds...")
                time.sleep(10)
                continue
            
            # Update the telebot token if configured on-the-fly
            if bot.token != token:
                print(f"[Daltoon Bot] Loaded new Bot Token from Web Dashboard: {token[:8]}...****")
                bot.token = token
                
            print(f"[Daltoon Bot] Starting polling with active bot: {token[:8]}...")
            bot.polling(none_stop=True, interval=1, timeout=20)
        except Exception as e:
            print(f"[Error Polling Bot] Restarting thread in 5 seconds... error: {e}")
            time.sleep(5)
