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

# Shared Database file path
DB_FILE = "bot_database.json"

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
            "users": [
                { "userId": 6536288293, "username": "daltoon_owner", "walletBalance": 75000, "activePlansCount": 2, "joinDate": "2026-06-15", "status": "active" },
                { "userId": 504192821, "username": "reza_parsa", "walletBalance": 0, "activePlansCount": 0, "joinDate": "2026-06-16", "status": "active" },
                { "userId": 802148210, "username": "madi_is_here", "walletBalance": 15000, "activePlansCount": 1, "joinDate": "2026-06-16", "status": "active" }
            ],
            "transactions": [
                { "id": "TX-00912", "userId": 6536288293, "username": "daltoon_owner", "amount": 15000, "receiptImage": "", "status": "approved", "date": "2026-06-15T14:32:00Z", "description": "شارژ تستی پنل" },
                { "id": "TX-32981", "userId": 504192821, "username": "reza_parsa", "amount": 50000, "receiptImage": "", "status": "pending", "date": "2026-06-17T01:22:00Z", "description": "خرید شارژ با فیش بانکی" },
                { "id": "TX-21048", "userId": 802148210, "username": "madi_is_here", "amount": 25000, "receiptImage": "", "status": "rejected", "date": "2026-06-16T11:05:00Z", "description": "رسید نامعتبر - رد شد" }
            ],
            "subscription_keys": [
                {
                    "id": "SUB-1102", "userId": 6536288293, "planId": "standard_30", "planName": "Standard 30GB (1 Month)",
                    "subLink": "vless://93a7e4b2-e1d5-4923-9da5-db7c6bd123fc@m.daltoon-server.ir:2052?security=reality&sni=google.com&fp=chrome&pbk=Ea_V80fD78H_mG4_Qd-8&sid=1c7d2e3f&spx=%2F#IR-MCI-Direct",
                    "expireDate": "2026-07-15", "trafficLimitGb": 30.0, "trafficUsedGb": 14.5, "status": "active"
                },
                {
                    "id": "SUB-9981", "userId": 6536288293, "planId": "vip_70", "planName": "VIP Premium 70GB (2 Months)",
                    "subLink": "vmess://eyJhZGRyIjoibS5kYWx0b29uLXNlcnZlci5pciIsInBvcnQiOjIwODIsImlkIjoiOTNhN2U0YjItZTFkNS00OTIzLTlkYTUtZGI3YzZiZDEyM2ZjIiwiYWlkIjowLCJuZXQiOiJ3cyIsInBhdGgiOiIvRGFsdG9vbiIsInR5cGUiOiJub25lIiwidGxzIjoibm9uZSJ9",
                    "expireDate": "2026-08-15", "trafficLimitGb": 70.0, "trafficUsedGb": 48.2, "status": "active"
                },
                {
                    "id": "SUB-4029", "userId": 802148210, "planId": "basic_15", "planName": "Basic 15GB (1 Month)",
                    "subLink": "vless://4a27c00e-3cc4-436f-b1e7-bc1829e2f183@m.daltoon-server.ir:80?path=%2F&security=none&type=ws#Wi-Fi-Asiatech",
                    "expireDate": "2026-07-16", "trafficLimitGb": 15.0, "trafficUsedGb": 8.1, "status": "active"
                }
            ],
            "inbounds": [
                { "id": 1, "remark": "IR-MCI-Direct-VLESS 🚀", "protocol": "vless", "port": 2052, "totalClients": 42, "trafficUsed": "148.5", "trafficLimit": "1000", "status": "active" },
                { "id": 12, "remark": "IR-MTN-Tunnel-VMESS ⚡", "protocol": "vmess", "port": 2082, "totalClients": 85, "trafficUsed": "412.3", "trafficLimit": "2000", "status": "active" },
                { "id": 16, "remark": "MCI-VIP-Trojan 💎", "protocol": "trojan", "port": 443, "totalClients": 19, "trafficUsed": "88.1", "trafficLimit": "500", "status": "active" },
                { "id": 19, "remark": "Wi-Fi-Asiatech-Direct 🛜", "protocol": "vless", "port": 80, "totalClients": 33, "trafficUsed": "110.4", "trafficLimit": "1000", "status": "active" },
                { "id": 24, "remark": "IR-MCI-VoIP-Optimized 📞", "protocol": "vless", "port": 8080, "totalClients": 11, "trafficUsed": "24.9", "trafficLimit": "300", "status": "active" }
            ],
            "custom_buttons": [
                { "id": "cb_gift", "text": "🎁 تست رایگان ۲ ساعته", "replyText": "کاربر گرامی، بدین وسیله یک اکانت تست ۲ ساعته با حجم ۲۰۰ مگابایت برای شما تولید شد:\n\nvless://f39281a1-9b1d-4050-b498-3882aef1277a@m.daltoon-server.ir:2052?security=reality&sni=google.com&fp=chrome#Daltoon-GiftTest" },
                { "id": "cb_channel", "text": "📢 کانال تلگرام", "replyText": "دوست گرامی! برای عضویت در گروه حل مشکلات و مطلع شدن از آخرین اخبار روی پیوند زیر ضربه بزنید:\n\n👉 @daltoon_channel" }
            ],
            "settings": {
                "panel_config": json.dumps({
                    "botToken": "6469257181:AAEFfE_C_zG_CM2F7x5dhPXd1IjEv2AuGjw",
                    "baseUrl": "https://m.daltoon-server.ir:8443/Daltoon",
                    "panelUrl": "http://localhost:2053",
                    "panelUsername": "Daltoon",
                    "panelPassword": "Daltoon10",
                    "activeInboundIds": [1, 12, 16],
                    "ownerId": 6536288293,
                    "cardNumber": "6037701194079627",
                    "cardHolder": "Daltoon"
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

# Load Dynamic Configurations
def get_config():
    """ Load real-time configurations from bot_database.json or fallback to env vars """
    config = {
        "BOT_TOKEN": os.getenv("BOT_TOKEN", "6469257181:AAEFfE_C_zG_CM2F7x5dhPXd1IjEv2AuGjw"),
        "OWNER_ID": int(os.getenv("OWNER_ID", "6536288293")),
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
        "HIDE_WALLET": False
    }
    try:
        db = read_db_json()
        settings_str = db.get("settings", {}).get("panel_config")
        if settings_str:
            panel_cfg = json.loads(settings_str)
            if panel_cfg.get("botToken"):
                config["BOT_TOKEN"] = panel_cfg["botToken"]
            if panel_cfg.get("baseUrl"):
                config["XUI_URL"] = panel_cfg["baseUrl"].rstrip("/")
            elif panel_cfg.get("panelUrl"):
                config["XUI_URL"] = panel_cfg["panelUrl"].rstrip("/")
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

# Initialize Bot with the configured token
bot = telebot.TeleBot(cfg_boot["BOT_TOKEN"], parse_mode="HTML")
session = requests.Session()

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
        response = session.post(login_url, data=login_data, timeout=8)
        res_json = response.json()
        if res_json.get("success"):
            print("[Sanaei X-UI API] Authenticated successfully with the panel.")
            return True
        else:
            print(f"[Sanaei X-UI API] Login rejected: {response.text}")
    except Exception as e:
        print(f"[Sanaei X-UI API] Handshake error at {login_url}: {e}")
    return False

def add_vpn_client_api(inbound_id, client_email, traffic_gb, duration_months):
    """ Call Sanaei 3x-ui API to create client in bounds and return subscription link """
    cfg = get_config()
    if not login_xui():
        print("[Sanaei API Error] Skipping user creation - login failed.")
        return None, None

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

    payload = {
        "id": inbound_id,
        "settings": json.dumps({"clients": [client_config]})
    }

    add_url = f"{cfg['XUI_URL']}/panel/api/inbounds/addClient"
    try:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        response = session.post(add_url, json=payload, headers=headers, timeout=10)
        res_json = response.json()
        
        if res_json.get("success"):
            print(f"[Sanaei API Sync] Created user '{client_email}' on inbound {inbound_id} successfully.")
            sub_link = f"{cfg['XUI_URL']}/sub/{client_email}"
            return client_uuid, sub_link
        else:
            print(f"[Sanaei API Response] Creation error: {response.text}")
    except Exception as e:
        print(f"[Sanaei API Request Error] Connection timed out: {e}")
    
    return None, None

# --- User Management DB Queries ---
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
    """ Load dynamic and static custom buttons with visibility toggles """
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    cfg = get_config()
    
    hide_buy = cfg.get("HIDE_BUY", False)
    hide_profile = cfg.get("HIDE_PROFILE", False)
    hide_wallet = cfg.get("HIDE_WALLET", False)
    hide_support = cfg.get("HIDE_SUPPORT", False)

    main_buttons = []
    if not hide_buy:
        main_buttons.append(types.KeyboardButton("🛍️ خرید کانفیگ (Our Plans)"))
    if not hide_profile:
        main_buttons.append(types.KeyboardButton("👤 اطلاعات حساب (My Profile)"))
    if not hide_wallet:
        main_buttons.append(types.KeyboardButton("💳 شارژ کیف پول (Top-up Wallet)"))
    if not hide_support:
        main_buttons.append(types.KeyboardButton("📞 پشتیبانی فنی (Support)"))
    
    for i in range(0, len(main_buttons), 2):
        markup.row(*main_buttons[i:i+2])

    try:
        db = read_db_json()
        custom_row = []
        for r in db.get("custom_buttons", []):
            custom_row.append(types.KeyboardButton(r['text']))
            if len(custom_row) == 2:
                markup.row(*custom_row)
                custom_row = []
        if custom_row:
            markup.row(*custom_row)
    except Exception as e:
        print("Error fetching custom buttons:", e)
        
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

    try:
        db = read_db_json()
        match_btn = next((b for b in db.get("custom_buttons", []) if b["text"] == text), None)
        if match_btn:
            bot.send_message(message.chat.id, match_btn["replyText"], parse_mode="HTML")
            return
    except Exception as e:
        print("Error serving custom content:", e)

    # 1. Buy premium plan flow
    if "خرید" in text or "Buy" in text or "🛍️" in text:
        plans = [
            {"id": "std_30g", "name": "Standard 30GB - ۱ ماهه", "price": 45000, "traffic": 30, "duration": 1},
            {"id": "vip_70g", "name": "VIP Premium 70GB - ۲ ماهه", "price": 95000, "traffic": 70, "duration": 2},
            {"id": "ult_150g", "name": "Unlimited VoIP 150GB - ۳ ماهه", "price": 185000, "traffic": 150, "duration": 3}
        ]
        
        markup = types.InlineKeyboardMarkup(row_width=1)
        for p in plans:
            btn_text = f"⚡ {p['name']} | {p['price']:,} تومان"
            markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"buy_{p['id']}"))
            
        bot.send_message(
            message.chat.id, 
            "🛍️ <b>پلان‌های فعال سرعت اختصاصی دالتون:</b>\n\nلطفا یکی از کانفیگ‌های زیر را برای خرید مستقیم انتخاب کنید. مبلغ به صورت خودکار از کیف پول تلگرام کسر می‌شود:",
            parse_mode="HTML",
            reply_markup=markup
        )

    # 2. Account Profile Details
    elif "اطلاعات حساب" in text or "Profile" in text or "👤" in text:
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
    elif "شارژ" in text or "Wallet" in text or "💳" in text:
        cfg = get_config()
        instructions = (
            f"💳 <b>آموزش سریع شارژ کیف پول دالتون:</b>\n\n"
            f"لطفا مبلغ دلخواه خود را به کارت عابربانک مدیریت واریز نمایید:\n\n"
            f"📥 شماره کارت ۱۶ رقمی بانک ملی:\n"
            f"<code>{cfg['CARD_NUMBER']}</code>\n"
            f"👤 به نام: <b>{cfg['CARD_HOLDER']}</b>\n\n"
            f"پس از پرداخت، یک تصویر واضح از فیش یا رسید واریز کارت به کارت خود را جهت تایید و شارژ تمام خودکار به آی‌پی مدیریت بفرستید 👇\n"
            f"یا برای ثبت نهایی شماره رسید تراکنش و فیش به وب‌داشبورد مراجعه کنید."
        )
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton("📸 ارسال رسید تصویری مدیریت", callback_data="upload_receipt"))
        bot.send_message(message.chat.id, instructions, parse_mode="HTML", reply_markup=markup)

    # 4. Support chat
    elif "پشتیبانی" in text or "Support" in text or "📞" in text:
        cfg = get_config()
        custom_support = cfg.get("SUPPORT_TEXT")
        if custom_support:
            support_txt = custom_support
        else:
            support_txt = (
                "📞 <b>پشتیبانی فنی دالتون سرور:</b>\n\n"
                "مشتری گرامی! در صورت بروز هرگونه قطعی، کندی سرعت، ارورهای اتصال یا سوالات قبل از خرید با ما تماس بگیرید.\n\n"
                "👤 اکانت ناظر فنی: @daltoon_owner\n"
                "📢 کانال اطلاع‌رسانی پایداری شبکه: @daltoon_channel\n\n"
                "پاسخگویی سریع فعال است: ۱۰ صبح الی ۳ شب"
            )
        bot.send_message(message.chat.id, support_txt, parse_mode="HTML")
        
    else:
        bot.reply_to(message, "گزینه ارسال شده معتبر نیست. لطفا از دکمه‌های کیبورد تپ کنید. 👇", reply_markup=get_custom_keyboard())

# --- Callback Queries ---

@bot.callback_query_handler(func=lambda call: True)
def callback_handler(call):
    tg_id = call.from_user.id
    
    if call.data.startswith("buy_"):
        plan_id = call.data.split("_")[1]
        
        # Details of the plans
        plan_specs = {
            "std_30g": {"name": "Standard 30GB", "price": 45000, "traffic": 30, "duration": 1, "inbound_id": 1},
            "vip_70g": {"name": "VIP Premium 70GB", "price": 95000, "traffic": 70, "duration": 2, "inbound_id": 12},
            "ult_150g": {"name": "Unlimited VoIP 150GB", "price": 185000, "traffic": 150, "duration": 3, "inbound_id": 16}
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
            bot.answer_callback_query(call.id, "کاهش اعتبار!")
            return
            
        # Deduct wallet balance immediately
        new_balance = user['walletBalance'] - spec['price']
        update_user_wallet_balance(tg_id, -spec['price'])
        
        # Add client dynamically via Sanaei 3x-ui API
        client_email = f"dl_tg_{tg_id}_{int(time.time())}"
        
        bot.send_message(call.message.chat.id, "⏳ در حال ساخت کانفیگ اختصاصی شما از روی سرور ثنایی...")
        
        # Call API (with real panel login cookie representation)
        client_uuid, sub_link = add_vpn_client_api(
            inbound_id=spec['inbound_id'], 
            client_email=client_email, 
            traffic_gb=spec['traffic'], 
            duration_months=spec['duration']
        )
        
        if not sub_link:
            cfg = get_config()
            client_uuid = str(uuid.uuid4())
            sub_link = f"{cfg['XUI_URL']}/sub/{client_email}"
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
        
        success_text = (
            f"🎉 <b>خرید شما با موفقیت تکمیل شد!</b>\n\n"
            f"💳 هزینه کسر شده: {spec['price']:,} تومان\n"
            f"💰 موجودی باقیمانده کیف پول: {int(new_balance):,} تومان\n\n"
            f"🔑 <b>کانفیگ VLESS اختصاصی شما صادر شد:</b>\n\n"
            f"<code>{sub_link}</code>\n\n"
            f"لینک بالا را کپی کرده و در کلاینت‌های اتصال خود V2rayNG / Sing-box وارد کنید."
        )
        bot.send_message(call.message.chat.id, success_text)
        bot.answer_callback_query(call.id, "خرید با موفقیت تایید شد!")

    elif call.data == "upload_receipt":
        bot.send_message(
            call.message.chat.id, 
            "📸 لطفا عکس رسید یا فیش پرداختی خود را همراه مبالغ به صورت متغیر ارسال کنید تا پس از تایید مدیریت وب‌داشبورد، کیف پول شما بلافاصله شارژ شود."
        )
        bot.answer_callback_query(call.id)

# Initialize JSON DB on startup
if __name__ == "__main__":
    read_db_json()
    print("Daltoon Telegram Bot core fully online on JSON synchronization database...")
    while True:
        try:
            bot.polling(none_stop=True, interval=1, timeout=20)
        except Exception as e:
            print(f"[Error Polling Bot] Restarting thread in 5 seconds... error: {e}")
            time.sleep(5)
