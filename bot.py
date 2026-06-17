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
        "BTN_SUPPORT": "📞 پشتیبانی فنی (Support)"
    }
    try:
        db = read_db_json()
        settings_str = db.get("settings", {}).get("panel_config")
        if settings_str:
            panel_cfg = json.loads(settings_str)
            if panel_cfg.get("btnTextBuy"):
                config["BTN_BUY"] = panel_cfg["btnTextBuy"]
            if panel_cfg.get("btnTextProfile"):
                config["BTN_PROFILE"] = panel_cfg["btnTextProfile"]
            if panel_cfg.get("btnTextWallet"):
                config["BTN_WALLET"] = panel_cfg["btnTextWallet"]
            if panel_cfg.get("btnTextSupport"):
                config["BTN_SUPPORT"] = panel_cfg["btnTextSupport"]
            if panel_cfg.get("botToken"):
                config["BOT_TOKEN"] = panel_cfg["botToken"]
            if panel_cfg.get("baseUrl"):
                config["XUI_URL"] = normalize_xui_url(panel_cfg["baseUrl"])
            elif panel_cfg.get("panelUrl"):
                config["XUI_URL"] = normalize_xui_url(panel_cfg["panelUrl"])
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

# Clean SSL Warnings inside Python requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- Sanaei 3x-ui Admin API Helpers ---
def login_xui():
    """ Authenticate session with Sanaei X-UI administrator credentials """
    cfg = get_config()
    login_url = f"{cfg['XUI_URL']}/login"
    login_data = {
        "username": cfg['XUI_USER'],
        "password": cfg['XUI_PASS']
    }
    try:
        response = session.post(login_url, data=login_data, timeout=8, verify=False)
        res_json = response.json()
        if res_json.get("success"):
            print("[Sanaei X-UI API] Authenticated successfully with the panel.")
            return True
        else:
            print(f"[Sanaei X-UI API] Login rejected: {response.text}")
    except Exception as e:
        print(f"[Sanaei X-UI API] Handshake error at {login_url}: {e}")
    return False

def add_vpn_client_api(client_email, traffic_gb, duration_months, client_uuid=None):
    """ Call Sanaei 3x-ui API to create client on ALL 6 inbounds so the sub/ link returns all of them! """
    cfg = get_config()
    if not login_xui():
        print("[Sanaei API Error] Skipping user creation - login failed.")
        return None, None

    if not client_uuid:
         client_uuid = str(uuid.uuid4())
    total_bytes = int(traffic_gb * 1024 * 1024 * 1024)
    # Expiry timestamp in milliseconds
    expiry_time_ms = int((time.time() + (duration_months * 30 * 24 * 60 * 60)) * 1000)

    client_config = {
        "id": client_uuid,
        "email": client_email,
        "limitIp": 0,
        "totalGB": total_bytes,
        "expiryTime": expiry_time_ms,
        "enable": True,
        "tgId": "",
        "subId": client_email
    }

    # Inbound IDs specified by user to be selected by default
    inbound_ids = [1, 12, 16, 19, 24, 26]
    success_count = 0

    for inbound_id in inbound_ids:
        payload = {
            "id": inbound_id,
            "settings": json.dumps({"clients": [client_config]})
        }
        add_url = f"{cfg['XUI_URL']}/panel/api/inbounds/addClient"
        try:
            headers = {"Accept": "application/json", "Content-Type": "application/json"}
            response = session.post(add_url, json=payload, headers=headers, timeout=10, verify=False)
            res_json = response.json()
            if res_json.get("success"):
                print(f"[Sanaei API Sync] Created user '{client_email}' on inbound {inbound_id} successfully.")
                success_count += 1
            else:
                print(f"[Sanaei API Response] Creation error on inbound {inbound_id}: {response.text}")
        except Exception as e:
            print(f"[Sanaei API Request Error] Bound {inbound_id} timeout or error: {e}")

    if success_count > 0:
        sub_link = f"{cfg['XUI_URL']}/sub/{client_email}"
        return client_uuid, sub_link
    
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

def create_sub_key(key_id, tg_id, plan_id, plan_name, sub_link, expire_date, limit_gb):
    db = read_db_json()
    new_sub = {
        "id": key_id,
        "userId": tg_id,
        "planId": plan_id,
        "planName": plan_name,
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

    main_buttons = []
    if not hide_buy:
        main_buttons.append(types.KeyboardButton(cfg.get("BTN_BUY", "🛍️ خرید کانفیگ (Our Plans)")))
    if not hide_profile:
        main_buttons.append(types.KeyboardButton(cfg.get("BTN_PROFILE", "👤 اطلاعات حساب (My Profile)")))
    if not hide_wallet:
        main_buttons.append(types.KeyboardButton(cfg.get("BTN_WALLET", "💳 شارژ کیف پول (Top-up Wallet)")))
    if not hide_support:
        main_buttons.append(types.KeyboardButton(cfg.get("BTN_SUPPORT", "📞 پشتیبانی فنی (Support)")))
    
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
                    "duration": dp.get("durationMonths", 1)
                })
        else:
            # Fallback legacy values
            plans_data = [
                {"id": "std_30g", "name": "Standard 30GB - ۱ ماهه", "price": 45000, "traffic": 30, "duration": 1},
                {"id": "vip_70g", "name": "VIP Premium 70GB - ۲ ماهه", "price": 95000, "traffic": 70, "duration": 2},
                {"id": "ult_150g", "name": "Unlimited VoIP 150GB - ۳ ماهه", "price": 185000, "traffic": 150, "duration": 3}
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
    username_input = message.text.strip()
    
    # Simple regex validation to ensure safe client email/name (alphanumeric, no spaces, length 3-15)
    import re
    if not re.match("^[a-zA-Z0-9_-]{3,15}$", username_input):
        msg = bot.send_message(
            message.chat.id,
            "⚠️ <b>نام وارد شده نامعتبر است!</b>\n\n"
            "نام کاربری باید فقط شامل حروف انگلیسی، اعداد، خط تیره و بین ۳ تا ۱۵ کاراکتر باشد. (بدون وب، فضای خالی، حروف فارسی)\n\n"
            "لطفاً یک نام کاربری جدید و معتبر ارسال کنید:"
        )
        bot.register_next_step_handler(msg, process_purchase_username, plan_id, spec)
        return

    # Check if this name is already taken in our active keys (local prevention check)
    db = read_db_json()
    keys = db.get("subscription_keys", [])
      if not sub_link:
        # Fallback simulated dynamic link
        cfg = get_config()
        client_uuid = str(uuid.uuid4())
        sub_link = f"{cfg['XUI_URL']}/sub/{username_input}"
        print("[Bot Warning] Real API request failed or timed out. Simulated database recovery link established.")

    expire_date = time.strftime("%Y-%m-%d", time.localtime(time.time() + spec['duration'] * 30 * 24 * 60 * 60))
    sub_id = f"SUB-{int(time.time()) % 9000 + 1000}"

    create_sub_key(
        key_id=sub_id, 
        tg_id=tg_id, 
        plan_id=plan_id, 
        plan_name=spec['name'], 
        sub_link=sub_link, 
        expire_date=expire_date, 
        limit_gb=spec['traffic']
    )

    cfg = get_config()
    success_note = cfg.get("PURCHASE_SUCCESS_NOTE", "")
    note_append = f"\n\n{success_note}" if success_note else ""
    success_text = (
        f"🎉 <b>خرید کانفیگ شما با موفقیت تکمیل شد!</b>\n\n"
        f"👤 نام کاربری سرویس شما: <code>{username_input}</code>\n"
        f"💳 هزینه کسر شده: {spec['price']:,} تومان\n"
        f"💰 موجودی باقیمانده کیف پول: {int(new_balance):,} تومان\n\n"
        f"🔑 <b>کانفیگ VLESS اختصاصی شما صادر شد:</b>\n"
        f"• مسیر اشتراک (در V2rayNG وارد کنید):\n"
        f"<code>{sub_link}</code>\n\n"
        f"این نام کاربری به صورت همزمان بر روی تمامی اینباندهای فعال (سرعت فوق‌العاده) تنظیم گردید."
        f"{note_append}"
    )
    bot.send_message(message.chat.id, success_text)

@bot.callback_query_handler(func=lambda call: True)
def callback_handler(call):
    tg_id = call.from_user.id
    
    if call.data.startswith("buy_"):
        plan_id = call.data.split("_")[1]
        
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
                "duration": db_plan.get("durationMonths", 1)
            }
        else:
            # Details of the fallback plans
            plan_specs = {
                "std_30g": {"id": "std_30g", "name": "Standard 30GB", "price": 45000, "traffic": 30, "duration": 1},
                "vip_70g": {"id": "vip_70g", "name": "VIP Premium 70GB", "price": 95000, "traffic": 70, "duration": 2},
                "ult_150g": {"id": "ult_150g", "name": "Unlimited VoIP 150GB", "price": 185000, "traffic": 150, "duration": 3}
            }
            spec = plan_specs.get(plan_id)
            
        if not spec:
            bot.answer_callback_query(call.id, "خطا در پیدا کردن مشخصات پلان.")
            return
            
        user = get_user_data(tg_id)
        if not user:
            bot.answer_callback_query(call.id, "خطای نامشخص بانک اطلاعاتی.")
            return
            
        if user['walletBalance'] < spec['price']:
            bot.send_message(
                call.message.chat.id, 
                f"❌ <b>موجودی کیف پول شما کافی نیست!</b>\n\nمبلغ پلان: {spec['price']:,} تومان\nموجودی فعلی شما: {int(user['walletBalance']):,} تومان\n\nجهت خرید لطفا ابتدا حساب خود را شارژ کنید."
            )
            bot.answer_callback_query(call.id, "موجودی ناکافی!")
            return
            
        # Ask user what name they want on the panel config
        msg = bot.send_message(
            call.message.chat.id,
            f"✍️ <b>لطفاً نام یا شناسه انگلیسی دلخواه خود را برای کانفیگ بفرستید:</b>\n\n"
            f"• طرح انتخابی: <code>{spec['name']}</code>\n"
            f"• هزینه طرح: <code>{spec['price']:,}</code> تومان\n\n"
            f"⚠️ قوانین نام‌گذاری:\n"
            f"۱. فقط از حروف انگلیسی و اعداد استفاده کنید (مثال: <code>aria_vpn</code>)\n"
            f"۲. از فاصله، حروفی مانند @، یا کلمات فارسی استفاده نکنید.\n"
            f"۳. حداقل ۳ و حداکثر ۱۵ حرف باشد.",
            parse_mode="HTML"
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
            bot.send_message(call.message.chat.id, text, parse_mode="HTML")
            bot.answer_callback_query(call.id)
        except Exception as e:
            print(f"[Error Charge Amount Init] {e}")

    elif call.data == "upload_receipt":
        bot.send_message(
            call.message.chat.id, 
            "📸 لطفا ابتدا از دکمه‌های بالا مبلغی را برای شارژ انتخاب کنید تا جزئیات پرداخت کارت برای شما فرستاده شود."
        )
        bot.answer_callback_query(call.id)

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
                f"⌛ در حال انتقال و بررسی رسید شما توسط ادمین هستیم. لطفا کمی صبور باشید."
            )
            bot.reply_to(message, reply_text, parse_mode="HTML")
            
            # Send notification to owner/admin if configured
            owner_id = cfg.get("OWNER_ID")
            if owner_id and owner_id > 0:
                try:
                    admin_msg = (
                        f"🔔 <b>رسید جدید برای تایید واریز شد!</b>\n\n"
                        f"👤 کاربر: @{username} (<code>{tg_id}</code>)\n"
                        f"💰 مبلغ اعلام شده: {extracted_amount:,} تومان\n"
                        f"🆔 شناسه: <code>{tx_id}</code>\n\n"
                        f"لطفا جهت تایید به داشبورد مدیریت دالتون سرور مراجعه کنید."
                    )
                    bot.send_message(owner_id, admin_msg, parse_mode="HTML")
                except Exception as ex:
                    print(f"[Admin Notify Warning] {ex}")
        else:
            bot.reply_to(message, "❌ خطا در دانلود فایل تصویر فیش از سرورهای تلگرام. لطفا مجدد تلاش کنید.")
    except Exception as e:
        print(f"[Error Processing Telegram Receipt] {e}")
        bot.reply_to(message, "❌ خطا در پردازش فایل ارسالی. لطفا مطمئن شوید حجم فیش مناسب است.")

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
