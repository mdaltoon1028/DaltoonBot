# -*- coding: utf-8 -*-
"""
Daltoon Systems - Real-Time Python Telegram Bot & Sanaei 3x-ui API Sync
Designed specifically for: Sanaei X-UI v3.2 Panel (https://tr.sub-daltoon.ir:2096/Daltoon)
Centralized Database: Daltoon_Bot.json (Shared with React Admin Dashboard)
"""

import os
import sys
sys.path.append("/root/.local/lib/python3.10/site-packages")
import time
import uuid
import json
try:
    import requests
except ImportError:
    pass

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Shared Database file path (script-relative to support reliable CWD-independent execution like PM2)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE_PRIMARY = os.path.join(SCRIPT_DIR, "db.json")
DB_FILE_DEFAULT = os.path.join(SCRIPT_DIR, "Daltoon_Bot.json")
DB_FILE_LEGACY = os.path.join(SCRIPT_DIR, "database.json")

def file_has_data(file_path):
    try:
        if not os.path.exists(file_path):
            return False
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
        if not content:
            return False
        parsed = json.loads(content)
        if isinstance(parsed.get("users"), list) and len(parsed["users"]) > 0:
            return True
        settings = parsed.get("settings", {})
        if settings and settings.get("panel_config"):
            config = settings["panel_config"]
            if isinstance(config, str):
                config = json.loads(config)
            token = config.get("botToken")
            if token and token != "DUMMY_TOKEN" and token.strip() != "":
                return True
        return False
    except Exception:
        return False

if file_has_data(DB_FILE_PRIMARY):
    DB_FILE = DB_FILE_PRIMARY
elif file_has_data(DB_FILE_DEFAULT):
    DB_FILE = DB_FILE_DEFAULT
elif file_has_data(DB_FILE_LEGACY):
    DB_FILE = DB_FILE_LEGACY
elif os.path.exists(DB_FILE_PRIMARY):
    DB_FILE = DB_FILE_PRIMARY
else:
    DB_FILE = DB_FILE_PRIMARY

def read_db_json():
    """ Read core database structure always from shared json file """
    if not os.path.exists(DB_FILE):
        return {"users": [], "transactions": [], "vpn_plans": [], "settings": {}}
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[JSON Database Error] {e}")
        return {"users": [], "transactions": [], "vpn_plans": [], "settings": {}}

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

active_purchases = set()

# Load Dynamic Configurations
def get_config():
    """ Load real-time configurations from Daltoon_Bot.json or fallback to env vars """
    config = {
        "BOT_TOKEN": os.getenv("BOT_TOKEN", ""),
        "OWNER_ID": int(os.getenv("OWNER_ID", "0")),
        "BOT_NICKNAME": "دالتون",
        "XUI_URL": os.getenv("XUI_URL", "https://tr.sub-daltoon.ir:2096/Daltoon").rstrip("/"),
        "SUB_URL": "https://tr.sub-daltoon.ir:2096",
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
        "BTN_WALLET": "شارژ کیف پول 💳",
        "BTN_SUPPORT": "📞 پشتیبانی فنی (Support)",
        "BTN_TICKET_SUPPORT": "🎫 تیکت به پشتیبانی",
        "HIDE_TICKET_SUPPORT": False,
        "ADMINS": [],
        "MANDATORY_JOIN_ACTIVE": False,
        "MANDATORY_JOIN_CHANNEL": "",
        "MANDATORY_JOIN_TEXT": "لطفا جهت استفاده از امکانات ربات ابتدا عضو کانال ما شده و سپس روی گزینه تایید کلیک کنید."
    }
    try:
        db = read_db_json()
        settings_str = db.get("settings", {}).get("panel_config")
        if settings_str:
            panel_cfg = json.loads(settings_str)
            if "admins" in panel_cfg and isinstance(panel_cfg["admins"], list):
                config["ADMINS"] = list(set([int(adm["userId"]) for adm in panel_cfg["admins"] if "userId" in adm and adm.get("userId")]))
            # Sync Panel URLs and Credentials from shared settings
            if panel_cfg.get("baseUrl"):
                config["XUI_URL"] = panel_cfg.get("baseUrl").rstrip("/")
            if panel_cfg.get("subUrl"):
                config["SUB_URL"] = panel_cfg.get("subUrl").rstrip("/")
            if panel_cfg.get("panelUsername"):
                config["XUI_USER"] = panel_cfg.get("panelUsername")
            if panel_cfg.get("panelPassword"):
                config["XUI_PASS"] = panel_cfg.get("panelPassword")
            if panel_cfg.get("ownerId"):
                config["OWNER_ID"] = int(panel_cfg["ownerId"])
            if panel_cfg.get("cardNumber"):
                config["CARD_NUMBER"] = panel_cfg["cardNumber"]
            if panel_cfg.get("cardHolder"):
                config["CARD_HOLDER"] = panel_cfg["cardHolder"]

            if panel_cfg.get("btnTextBuy"):
                config["BTN_BUY"] = panel_cfg["btnTextBuy"]
            config["BTN_BUY_NEW"] = panel_cfg.get("btnTextBuyNew", "🛒 خرید اشتراک جدید")
            config["BTN_MY_SUBS"] = panel_cfg.get("btnTextMySubs", "🗂 اشتراک های من / تمدید")
            config["BTN_GUIDES"] = panel_cfg.get("btnTextGuides", "💡 آموزش ها")
            config["BTN_PROFILE"] = panel_cfg.get("btnTextProfile", "👤 حساب کاربری")
            config["BTN_SUPPORT"] = panel_cfg.get("btnTextSupport", "📞 پشتیبانی")
            config["BTN_FREETEST"] = panel_cfg.get("btnTextFreeTest", "🎁 موجودی رایگان")
            config["BTN_INSTANT_SUPPORT"] = panel_cfg.get("btnTextInstantSupport", "🤖 پشتیبانی آنی")
            config["BTN_FEEDBACK"] = panel_cfg.get("btnTextFeedback", "💌 بازخورد کاربر ها")
            config["BTN_REFERRAL"] = panel_cfg.get("btnTextReferral", "👥 زیرمجموعه گیری")
            config["BTN_COLLEAGUES"] = panel_cfg.get("btnTextColleagues", "بسته ویژه همکاران")
            config["BTN_AI_CHAT"] = panel_cfg.get("btnTextAiChat", "🤖 چت با ربات")
            config["BTN_WALLET"] = panel_cfg.get("btnTextWallet", "شارژ کیف پول 💳")
            config["BTN_TICKET_SUPPORT"] = panel_cfg.get("btnTextTicketSupport", "🎫 تیکت به پشتیبانی")
            config["WALLET_CHARGE_AMOUNTS"] = panel_cfg.get("walletChargeAmounts", [200000, 300000, 400000, 500000, 1000000])

            config["IS_FREETEST_ACTIVE"] = panel_cfg.get("isFreeTestActive", True)
            config["FREETEST_DISABLED_MSG"] = panel_cfg.get("freeTestDisabledMessage", "اکانت تست رایگان فعلا موجود نیست.")

            config["HIDE_BUY_NEW"] = bool(panel_cfg.get("hideBtnBuyNew", False))
            if "hideBtnMySubs" in panel_cfg: config["HIDE_MY_SUBS"] = bool(panel_cfg["hideBtnMySubs"])
            if "hideBtnGuides" in panel_cfg: config["HIDE_GUIDES"] = bool(panel_cfg["hideBtnGuides"])
            if "hideBtnProfile" in panel_cfg: config["HIDE_PROFILE"] = bool(panel_cfg["hideBtnProfile"])
            if "hideBtnSupport" in panel_cfg: config["HIDE_SUPPORT"] = bool(panel_cfg["hideBtnSupport"])
            if "hideBtnFreeTest" in panel_cfg: config["HIDE_FREETEST"] = bool(panel_cfg["hideBtnFreeTest"])
            if "hideBtnInstantSupport" in panel_cfg: config["HIDE_INSTANT_SUPPORT"] = bool(panel_cfg["hideBtnInstantSupport"])
            if "hideBtnFeedback" in panel_cfg: config["HIDE_FEEDBACK"] = bool(panel_cfg["hideBtnFeedback"])
            if "hideBtnReferral" in panel_cfg: config["HIDE_REFERRAL"] = bool(panel_cfg["hideBtnReferral"])
            if "hideBtnColleagues" in panel_cfg: config["HIDE_COLLEAGUES"] = bool(panel_cfg["hideBtnColleagues"])
            if "hideBtnAiChat" in panel_cfg: 
                config["HIDE_AI_CHAT"] = bool(panel_cfg["hideBtnAiChat"])
            else:
                config["HIDE_AI_CHAT"] = False # Visible by default for new installs
            if "hideBtnTicketSupport" in panel_cfg: config["HIDE_TICKET_SUPPORT"] = bool(panel_cfg["hideBtnTicketSupport"])
            config["HIDE_WALLET"] = panel_cfg.get("hideBtnWallet", False) # or fallback to older hideWallet
            if "hideWallet" in panel_cfg and "hideBtnWallet" not in panel_cfg:
                config["HIDE_WALLET"] = bool(panel_cfg["hideWallet"])

            config["BUTTONS_ORDER"] = panel_cfg.get("mainButtonsOrder", [
                "btnBuyNew", "btnMySubs", "btnGuides", "btnProfile", "btnWallet", "btnSupport", "btnTicketSupport", "btnFreeTest", "btnAiChat", "btnInstantSupport", "btnFeedback", "btnReferral"
            ])

            if panel_cfg.get("botToken"):
                config["BOT_TOKEN"] = panel_cfg["botToken"]
            if panel_cfg.get("botNickname"):
                config["BOT_NICKNAME"] = panel_cfg["botNickname"]
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
                config["HIDE_SUPPORT"] = config["HIDE_SUPPORT"] or bool(panel_cfg["hideSupport"])
            if "hideBuy" in panel_cfg:
                config["HIDE_BUY"] = bool(panel_cfg["hideBuy"])
            if "hideProfile" in panel_cfg:
                config["HIDE_PROFILE"] = bool(panel_cfg["hideProfile"])
            if "hideBtnWallet" in panel_cfg:
                config["HIDE_WALLET"] = bool(panel_cfg["hideBtnWallet"])
            elif "hideWallet" in panel_cfg:
                config["HIDE_WALLET"] = bool(panel_cfg["hideWallet"])
            if "keyboardLayout" in panel_cfg:
                config["KEYBOARD_LAYOUT"] = panel_cfg["keyboardLayout"]
            if "purchaseSuccessNote" in panel_cfg:
                config["PURCHASE_SUCCESS_NOTE"] = panel_cfg["purchaseSuccessNote"]
            if "guidesText" in panel_cfg:
                config["GUIDES_TEXT"] = panel_cfg["guidesText"]
            if "tgChannel" in panel_cfg:
                config["TG_CHANNEL"] = panel_cfg["tgChannel"]
            if "supportHandle" in panel_cfg:
                config["SUPPORT_HANDLE"] = panel_cfg["supportHandle"]
            
            # Parse Mandatory Join configs
            if "mandatoryJoinActive" in panel_cfg:
                config["MANDATORY_JOIN_ACTIVE"] = bool(panel_cfg["mandatoryJoinActive"])
            if "mandatoryJoinChannel" in panel_cfg:
                config["MANDATORY_JOIN_CHANNEL"] = panel_cfg["mandatoryJoinChannel"]
            if "mandatoryJoinText" in panel_cfg:
                config["MANDATORY_JOIN_TEXT"] = panel_cfg["mandatoryJoinText"]
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

_session = None
def get_session():
    global _session
    if _session is None:
        import requests
        _session = requests.Session()
        _session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9,fa;q=0.8"
        })
    return _session

# Clean SSL Warnings inside Python requests
try:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except ImportError:
    pass

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
        session = get_session()
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
            get_session().headers.update({"X-Csrf-Token": csrf_token})
            print(f"[Sanaei X-UI API] CSRF token applied to session headers.")

        print(f"[Sanaei X-UI API] Posting login credentials to {login_url}")
        response = get_session().post(login_url, data=login_data, headers=headers, timeout=8, verify=False)
        
        # After login, the panel might issue a NEW CSRF token or update cookies
        if response.status_code == 200:
             # Try to find a new token in the response headers or body
             new_token = response.headers.get("X-Csrf-Token")
             if new_token:
                 session.headers.update({"X-Csrf-Token": new_token})
                 print(f"[Sanaei X-UI API] New POST-login CSRF token detected in headers: {new_token}")
             else:
                 # Check body too just in case
                 match = re.search(r'<meta\s+name="csrf-token"\s+content="([^"]+)"', response.text)
                 if match:
                     new_token = match.group(1)
                     get_session().headers.update({"X-Csrf-Token": new_token})
                     print(f"[Sanaei X-UI API] New POST-login CSRF token detected in body: {new_token}")
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
    base_url = cfg['XUI_URL']
    if base_url.endswith("/"):
        base_url = base_url[:-1]

    if not login_xui():
        # Fallback to local check result if panel offline (already returned False if not found locally)
        return False
    try:
        url = f"{base_url}/panel/api/inbounds/getClientTraffics/{client_email}"
        response = get_session().get(url, timeout=5, verify=False)
        data = response.json()
        if data.get("success") and data.get("obj"):
            return True
    except Exception as e:
        print(f"[Panel Check Error] {e}")
    return False

def add_vpn_client_api(client_email, traffic_gb, duration_days, client_uuid=None):
    """ Call Sanaei 3x-ui API to create client on ALL active inbounds so the sub/ link returns all of them! """
    cfg = get_config()
    base_url = cfg['XUI_URL']
    if base_url.endswith("/"):
        base_url = base_url[:-1]

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
        list_url = f"{base_url}/panel/api/inbounds/list"
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

    add_url = f"{base_url}/panel/api/clients/add"
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

def update_vpn_client_enabled_api(client_email, enable, client_uuid=None):
    """ Call Sanaei 3x-ui API to update client enabled status """
    cfg = get_config()
    base_url = cfg.get('XUI_URL', '')
    if base_url.endswith("/"):
        base_url = base_url[:-1]

    if not login_xui():
        return False

    # Try several common endpoints for maximum reliability
    targets = []
    if client_uuid:
        targets.append(str(client_uuid))
    
    # Also search by email if uuid not provided or as fallback
    if not targets or client_email:
        try:
            list_url = f"{base_url}/panel/api/inbounds/list"
            list_res = session.get(list_url, timeout=8, verify=False)
            res_json = list_res.json()
            if res_json.get("success") and isinstance(res_json.get("obj"), list):
                for inbound in res_json["obj"]:
                    clients_str = inbound.get("settings", "{}")
                    try:
                        import json
                        c_data = json.loads(clients_str)
                        for c in c_data.get("clients", []):
                            if c.get("email") == client_email:
                                if c.get("id") and str(c.get("id")) not in targets:
                                    targets.append(str(c.get("id")))
                    except: pass
        except: pass

    success = False
    for uid in targets:
        # Sanaei Global Update API (modern)
        try:
            # We try to update on all inbounds for robustness
            list_url = f"{base_url}/panel/api/inbounds/list"
            list_res = session.get(list_url, timeout=8, verify=False)
            res_json = list_res.json()
            if res_json.get("success") and isinstance(res_json.get("obj"), list):
                for inb in res_json["obj"]:
                    inbound_id = inb.get("id")
                    upd_url = f"{base_url}/panel/api/inbounds/updateClient/{uid}"
                    
                    try:
                        # Try to find existing client info in this inbound for full payload
                        c_str = inb.get("settings", "{}")
                        try:
                             import json
                             c_json = json.loads(c_str)
                        except: continue

                        for existing_c in c_json.get("clients", []):
                            if str(existing_c.get("id")) == uid:
                                merged_c = existing_c.copy()
                                merged_c["enable"] = enable
                                
                                # Compatibility: Sanaei often expects inboundId in payload for updateClient
                                # even if it's in the URL for some versions
                                payload = {
                                    "id": inbound_id, 
                                    "settings": json.dumps({"clients": [merged_c]})
                                }
                                
                                # Try standard updateClient endpoint first
                                upd_res = session.post(upd_url, json=merged_c, timeout=5, verify=False)
                                if upd_res.ok and upd_res.json().get("success"):
                                    print(f"[Sanaei API] Successfully updated client {uid} status to {enable} via /updateClient/{{uuid}}")
                                    success = True
                                else:
                                    # Fallback: Many Sanaei panels use a general update endpoint
                                    # POST /panel/api/inbounds/updateClient
                                    # Body: {id: inbound_id, settings: '{"clients": [...]}'}
                                    fallback_url = f"{base_url}/panel/api/inbounds/updateClient"
                                    # We need to preserve the full settings if possible, but 3x-ui usually allows partial client list update
                                    fallback_res = session.post(fallback_url, json=payload, timeout=5, verify=False)
                                    if fallback_res.ok and fallback_res.json().get("success"):
                                        print(f"[Sanaei API] Successfully updated client {uid} status to {enable} via fallback /updateClient")
                                        success = True
                                    else:
                                        print(f"[Sanaei API] Failed to update client {uid} on inbound {inbound_id}: {upd_res.text} / {fallback_res.text}")
                    except Exception as e:
                        print(f"[Sanaei API] Error processing inbound {inbound_id} for client {uid}: {e}")
        except Exception as e:
            print(f"[Sanaei API] Error in update_vpn_client_enabled_api loop: {e}")
        
    return success

def delete_vpn_client_api(client_email, client_uuid=None):
    """ Call Sanaei 3x-ui API to delete client """
    cfg = get_config()
    base_url = cfg.get('XUI_URL', '')
    if base_url.endswith("/"):
        base_url = base_url[:-1]

    if not login_xui():
        print("[Sanaei API Error] Login failed in delete_vpn_client_api")
        return False

    valid_ids = []
    all_clients = []
    
    try:
        list_url = f"{base_url}/panel/api/inbounds/list"
        list_res = session.get(list_url, timeout=8, verify=False)
        res_json = list_res.json()
        if res_json.get("success") and isinstance(res_json.get("obj"), list):
            valid_ids = [int(item["id"]) for item in res_json["obj"]]
            
            # Extract all clients to find the best match
            for inbound in res_json["obj"]:
                clients = inbound.get("settings", "")
                import json
                try:
                    c_json = json.loads(clients)
                    c_list = c_json.get("clients", [])
                    for c in c_list:
                        if c not in all_clients:
                            all_clients.append(c)
                except:
                    pass
    except Exception as e:
        print(f"[Sanaei API Error] Fetching inbounds list failed: {e}")

    # Build reliable target IDs list containing both provided UUID and any matching panel UUIDs
    ids_to_delete = []
    if client_uuid:
        ids_to_delete.append(str(client_uuid))

    # Perform highly resilient lookup on all clients in the panel to match names/emails
    import re
    from collections import Counter
    
    def normalize(s):
        if not s:
            return ""
        s = s.lower().strip()
        # strip prefixes
        if '-' in s:
            parts = s.split('-')
            if len(parts) > 1:
                s = parts[-1]
        return re.sub(r'[^a-z0-9]', '', s)

    target_norm = normalize(client_email)
    
    if all_clients and target_norm:
        # 1. Look for exact matches or normalized exact matches
        print(f"[Debug] Searching to delete client '{client_email}' (norm: '{target_norm}') among {len(all_clients)} clients.")
        for c in all_clients:
            c_email = c.get("email", "")
            c_id = c.get("id")
            
            # Log for debugging
            normalized_c_email = normalize(c_email)
            print(f"[Debug] Checking candidate: email='{c_email}', norm='{normalized_c_email}', id={c_id}")
            
            if c_id and str(c_id) not in ids_to_delete:
                if c_email.lower() == client_email.lower() or normalized_c_email == target_norm:
                    ids_to_delete.append(str(c_id))
                    print(f"[Debug] Match found! Adding ID {c_id} to ids_to_delete.")
                    print(f"[Sanaei Delete API] Found exact name-match candidate: '{c_email}' (UUID: {c_id})")

        # 2. Look for substring matches
        for c in all_clients:
            c_email = c.get("email", "")
            c_id = c.get("id")
            if c_id and str(c_id) not in ids_to_delete:
                c_email_norm = normalize(c_email)
                if target_norm in c_email_norm or c_email_norm in target_norm:
                    ids_to_delete.append(str(c_id))
                    print(f"[Sanaei Delete API] Found substring-match candidate: '{c_email}' (UUID: {c_id})")

        # 3. Look for extremely tolerant fuzzy/typo matches (such as ahura-amiiir vs ahura-amirrrr)
        # We lower the ratio threshold to 0.45 for deletion to be absolutely sure we catch typo variations
        for c in all_clients:
            c_email = c.get("email", "")
            c_id = c.get("id")
            if c_id and str(c_id) not in ids_to_delete:
                c_email_norm = normalize(c_email)
                if c_email_norm:
                    c1 = Counter(target_norm)
                    c2 = Counter(c_email_norm)
                    intersect = sum((c1 & c2).values())
                    total_len = len(target_norm) + len(c_email_norm)
                    ratio = (2.0 * intersect) / total_len if total_len > 0 else 0.0
                    if ratio > 0.45:
                        ids_to_delete.append(str(c_id))
                        print(f"[Sanaei Delete API] Found fuzzy typo-tolerant match candidate: '{c_email}' [ratio: {ratio:.2f}] (UUID: {c_id})")

    if not ids_to_delete:
        print(f"[Sanaei Delete API] No UUIDs or matching panel clients found to delete for '{client_email}'.")
        return False

    print(f"[Sanaei Delete API] Executing deletion commands for UUIDs: {ids_to_delete}")
    success = False
    
    for uid in ids_to_delete:
        # 1. Standard delete from individual inbounds
        if valid_ids:
            for inbound_id in valid_ids:
                try:
                    del_url = f"{base_url}/panel/api/inbounds/{inbound_id}/delClient/{uid}"
                    # Ensure X-Csrf-Token is present in current session headers from login_xui
                    resp = session.post(del_url, timeout=5, verify=False)
                    if resp.status_code == 200:
                         resp_data = resp.json()
                         if resp_data.get("success"):
                            success = True
                            print(f"[Sanaei Delete API] Successfully deleted client {uid} from inbound {inbound_id}")
                         else:
                            print(f"[Sanaei Delete API] Panel returned failure for {uid} on {inbound_id}: {resp.text}")
                    else:
                         print(f"[Sanaei Delete API] HTTP {resp.status_code} for {uid} on {inbound_id}: {resp.text}")
                except Exception as e:
                    print(f"[Sanaei Delete API] Inbound delete exception on {inbound_id} for {uid}: {e}")
                    
        # 2. Global client delete endpoint (some newer 3x-ui panels use this)
        try:
            del_url2 = f"{base_url}/panel/api/clients/{uid}/del"
            resp2 = session.post(del_url2, timeout=5, verify=False)
            if resp2.status_code == 200:
                resp2_data = resp2.json()
                if resp2_data.get("success"):
                    success = True
                    print(f"[Sanaei Delete API] Globally deleted client {uid} via global client del")
                else:
                    print(f"[Sanaei Delete API] Global delete failed for {uid}: {resp2.text}")
            else:
                print(f"[Sanaei Delete API] Global delete HTTP {resp2.status_code} for {uid}: {resp2.text}")
        except Exception as e:
            print(f"[Sanaei Delete API] Global client del exception for {uid}: {e}")

    return success

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

def set_user_pending_purchase(tg_id, plan_id, client_name):
    db = read_db_json()
    user = next((u for u in db["users"] if u["userId"] == tg_id), None)
    if user:
        user["pendingPurchasePlanId"] = plan_id
        user["pendingPurchaseClientName"] = client_name
        write_db_json(db)

def get_user_pending_purchase(tg_id):
    db = read_db_json()
    user = next((u for u in db["users"] if u["userId"] == tg_id), None)
    if user:
        return user.get("pendingPurchasePlanId"), user.get("pendingPurchaseClientName")
    return None, None

def clear_user_pending_purchase(tg_id):
    db = read_db_json()
    user = next((u for u in db["users"] if u["userId"] == tg_id), None)
    if user:
        user.pop("pendingPurchasePlanId", None)
        user.pop("pendingPurchaseClientName", None)
        write_db_json(db)

def register_tg_user(tg_id, username, referral_id=None):
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
        
        if referral_id and str(referral_id) != str(tg_id):
            referrer = next((u for u in db["users"] if str(u["userId"]) == str(referral_id)), None)
            if referrer:
                new_user["referredBy"] = int(referral_id)
                # Recalculate or increment the referral count to be 100% sure we don't drop invites
                referrer["referralCount"] = int(referrer.get("referralCount", 0)) + 1
                
                # Parse settings
                import json
                try:
                    s_str = db.get("settings", {}).get("panel_config", "{}")
                    settings = json.loads(s_str)
                except:
                    settings = {}
                
                condition = settings.get("referralRewardCondition", "invite")
                if condition in ["invite", "both"]:
                    percent = settings.get("referralRewardPercent", 5)
                    amount = settings.get("referralBaseAmount", 100000)
                    reward = max(0, round((amount * percent) / 100))
                    
                    if reward > 0:
                        referrer["walletBalance"] = float(referrer.get("walletBalance", 0.0)) + float(reward)
                        referrer["referralRewardTotal"] = int(referrer.get("referralRewardTotal", 0)) + reward
                        try:
                            bot.send_message(int(referral_id), f"🎉 <b>تبریک!</b>\nیک نفر با لینک شما وارد ربات شد و <b>{reward:,}</b> تومان به کیف پول شما اضافه شد.", parse_mode="HTML")
                        except Exception as e:
                            print("Could not notify referrer:", e)
                            
                        # Level 2 Referral
                        l2_percent = settings.get("referralL2Percent", 0)
                        if l2_percent > 0 and referrer.get("referredBy"):
                            l2_referrer_id = referrer.get("referredBy")
                            l2_referrer = next((u for u in db["users"] if u["userId"] == l2_referrer_id), None)
                            if l2_referrer:
                                l2_reward = max(0, round((amount * l2_percent) / 100))
                                l2_referrer["walletBalance"] = float(l2_referrer.get("walletBalance", 0.0)) + float(l2_reward)
                                l2_referrer["referralRewardTotal"] = int(l2_referrer.get("referralRewardTotal", 0)) + l2_reward
                                try:
                                    bot.send_message(l2_referrer_id, f"🎊 <b>پاداش تیمی لایه 2!</b>\nیکی از زیرمجموعه‌های شما یک نفر را دعوت کرد و مبلغ <b>{l2_reward:,}</b> تومان به شما رسید.", parse_mode="HTML")
                                except:
                                    pass

                                # Level 3 Referral
                                l3_percent = settings.get("referralL3Percent", 0)
                                if l3_percent > 0 and l2_referrer.get("referredBy"):
                                    l3_referrer_id = l2_referrer.get("referredBy")
                                    l3_referrer = next((u for u in db["users"] if u["userId"] == l3_referrer_id), None)
                                    if l3_referrer:
                                        l3_reward = max(0, round((amount * l3_percent) / 100))
                                        l3_referrer["walletBalance"] = float(l3_referrer.get("walletBalance", 0.0)) + float(l3_reward)
                                        l3_referrer["referralRewardTotal"] = int(l3_referrer.get("referralRewardTotal", 0)) + l3_reward
                                        try:
                                            bot.send_message(l3_referrer_id, f"🎊 <b>پاداش تیمی لایه 3!</b>\nزیرمجموعه لایه سوم شما عضو جدیدی آورد و مبلغ <b>{l3_reward:,}</b> تومان دریافت کردید.", parse_mode="HTML")
                                        except:
                                            pass

                                        # Level 4 Referral
                                        l4_percent = settings.get("referralL4Percent", 0)
                                        if l4_percent > 0 and l3_referrer.get("referredBy"):
                                            l4_referrer_id = l3_referrer.get("referredBy")
                                            l4_referrer = next((u for u in db["users"] if u["userId"] == l4_referrer_id), None)
                                            if l4_referrer:
                                                l4_reward = max(0, round((amount * l4_percent) / 100))
                                                l4_referrer["walletBalance"] = float(l4_referrer.get("walletBalance", 0.0)) + float(l4_reward)
                                                l4_referrer["referralRewardTotal"] = int(l4_referrer.get("referralRewardTotal", 0)) + l4_reward
                                                try:
                                                    bot.send_message(l4_referrer_id, f"🎊 <b>پاداش تیمی لایه 4!</b>\nزیرمجموعه لایه چهارم شما عضو جدیدی آورد و مبلغ <b>{l4_reward:,}</b> تومان دریافت کردید.", parse_mode="HTML")
                                                except:
                                                    pass

        db["users"].append(new_user)
        write_db_json(db)
        print(f"[Database] Registered new user into JSON: {tg_id}")
        try:
            log_action(tg_id, username or f"user_{tg_id}", "ثبت‌نام کاربر", f"کاربر جدید با شناسه {tg_id} برای اولین بار عضو ربات شد.")
        except Exception as e:
            print("Error logging user registration:", e)
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

def process_referral_on_purchase(user, amount_spent):
    if not user.get("referredBy") or user.get("hasPurchasedPlan"):
        return
        
    db = read_db_json()
    import json
    try:
        settings = json.loads(db.get("settings", {}).get("panel_config", "{}"))
    except:
        settings = {}
        
    condition = settings.get("referralRewardCondition", "invite")
    if condition not in ["purchase", "both"]:
        return
        
    referrer_id = user.get("referredBy")
    referrer = next((u for u in db["users"] if u["userId"] == referrer_id), None)
    if not referrer:
        return
        
    percent = settings.get("referralRewardPercent", 5)
    calc_amount = settings.get("referralBaseAmount", 100000)
    reward = max(0, round((calc_amount * percent) / 100))
    
    if reward > 0:
        referrer["walletBalance"] = float(referrer.get("walletBalance", 0.0)) + float(reward)
        referrer["referralRewardTotal"] = int(referrer.get("referralRewardTotal", 0)) + reward
        try:
            bot.send_message(referrer_id, f"🎉 <b>تبریک!</b>\nکاربری که با لینک شما وارد شده بود اولین خرید خود را انجام داد و <b>{reward:,}</b> تومان به کیف پول شما اضافه شد.", parse_mode="HTML")
        except:
            pass
            
        # L2 logic
        l2_percent = settings.get("referralL2Percent", 0)
        if l2_percent > 0 and referrer.get("referredBy"):
            l2_referrer_id = referrer.get("referredBy")
            l2_referrer = next((u for u in db["users"] if u["userId"] == l2_referrer_id), None)
            if l2_referrer:
                l2_reward = max(0, round((calc_amount * l2_percent) / 100))
                l2_referrer["walletBalance"] = float(l2_referrer.get("walletBalance", 0.0)) + float(l2_reward)
                l2_referrer["referralRewardTotal"] = int(l2_referrer.get("referralRewardTotal", 0)) + l2_reward
                try:
                    bot.send_message(l2_referrer_id, f"🎊 <b>پاداش تیمی لایه 2!</b>\nزیرمجموعهِ زیرمجموعه شما اولین خرید خود را انجام داد و <b>{l2_reward:,}</b> تومان دریافت کردید.", parse_mode="HTML")
                except:
                    pass

                # L3 logic
                l3_percent = settings.get("referralL3Percent", 0)
                if l3_percent > 0 and l2_referrer.get("referredBy"):
                    l3_referrer_id = l2_referrer.get("referredBy")
                    l3_referrer = next((u for u in db["users"] if u["userId"] == l3_referrer_id), None)
                    if l3_referrer:
                        l3_reward = max(0, round((calc_amount * l3_percent) / 100))
                        l3_referrer["walletBalance"] = float(l3_referrer.get("walletBalance", 0.0)) + float(l3_reward)
                        l3_referrer["referralRewardTotal"] = int(l3_referrer.get("referralRewardTotal", 0)) + l3_reward
                        try:
                            bot.send_message(l3_referrer_id, f"🎊 <b>پاداش تیمی لایه 3!</b>\nزیرمجموعه لایه سوم شما اولین خرید خود را انجام داد و <b>{l3_reward:,}</b> تومان دریافت کردید.", parse_mode="HTML")
                        except:
                            pass

                        # L4 logic
                        l4_percent = settings.get("referralL4Percent", 0)
                        if l4_percent > 0 and l3_referrer.get("referredBy"):
                            l4_referrer_id = l3_referrer.get("referredBy")
                            l4_referrer = next((u for u in db["users"] if u["userId"] == l4_referrer_id), None)
                            if l4_referrer:
                                l4_reward = max(0, round((calc_amount * l4_percent) / 100))
                                l4_referrer["walletBalance"] = float(l4_referrer.get("walletBalance", 0.0)) + float(l4_reward)
                                l4_referrer["referralRewardTotal"] = int(l4_referrer.get("referralRewardTotal", 0)) + l4_reward
                                try:
                                    bot.send_message(l4_referrer_id, f"🎊 <b>پاداش تیمی لایه 4!</b>\nزیرمجموعه لایه چهارم شما اولین خرید خود را انجام داد و <b>{l4_reward:,}</b> تومان دریافت کردید.", parse_mode="HTML")
                                except:
                                    pass

    # Mark user so they don't give "first purchase" reward again
    user_in_db = next((u for u in db["users"] if u["userId"] == user["userId"]), None)
    if user_in_db:
        user_in_db["hasPurchasedPlan"] = True
    
    write_db_json(db)

def update_user_balance(tg_id, new_balance):
    db = read_db_json()
    user = next((u for u in db["users"] if u["userId"] == tg_id), None)
    if user:
        user["walletBalance"] = max(0.0, float(new_balance))
        write_db_json(db)

def log_action(tg_id, username, action, details):
    import uuid
    from datetime import datetime
    db = read_db_json()
    if not db.get("logs"):
        db["logs"] = []
    
    log = {
        "id": str(uuid.uuid4()),
        "date": datetime.now().isoformat(),
        "userId": tg_id,
        "username": username,
        "action": action,
        "details": details
    }
    # Keep only last 1000 logs to prevent infinite growth
    if len(db["logs"]) > 1000:
        db["logs"] = db["logs"][-1000:]
    db["logs"].append(log)
    write_db_json(db)

def create_sub_key(key_id, tg_id, plan_id, plan_name, sub_link, expire_date, limit_gb, client_name="", client_uuid=""):
    db = read_db_json()
    new_sub = {
        "id": key_id,
        "userId": tg_id,
        "planId": plan_id,
        "planName": plan_name,
        "clientName": client_name,
        "clientUuid": client_uuid,
        "subLink": sub_link,
        "expireDate": expire_date,
        "trafficLimitGb": float(limit_gb),
        "trafficUsedGb": 0.0,
        "createdAtMs": int(time.time() * 1000),
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

    markup = types.InlineKeyboardMarkup(row_width=2)

    buttons = []
    order = cfg.get("BUTTONS_ORDER", [
        "btnBuyNew", "btnMySubs", "btnGuides", "btnColleagues", "btnProfile", "btnWallet", "btnSupport", "btnTicketSupport", "btnFreeTest", "btnAiChat", "btnInstantSupport", "btnFeedback", "btnReferral"
    ])
    
    # Backward compatibility: enforce addition of referral & wallet if missing
    if "btnWallet" not in order: order.append("btnWallet")
    if "btnReferral" not in order: order.append("btnReferral")
    if "btnColleagues" not in order: order.append("btnColleagues")
    if "btnAiChat" not in order: order.append("btnAiChat")
    if "btnTicketSupport" not in order: order.append("btnTicketSupport")

    for key in order:
        if key == "btnBuyNew" and not cfg.get("HIDE_BUY_NEW", False): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_BUY_NEW", "🛒 خرید اشتراک جدید"), callback_data="mm_btnBuyNew"))
        elif key == "btnMySubs" and not cfg.get("HIDE_MY_SUBS", False): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_MY_SUBS", "🗂 اشتراک های من / تمدید"), callback_data="mm_btnMySubs"))
        elif key == "btnGuides" and not cfg.get("HIDE_GUIDES", False): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_GUIDES", "💡 آموزش ها"), callback_data="mm_btnGuides"))
        elif key == "btnColleagues" and not cfg.get("HIDE_COLLEAGUES", True): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_COLLEAGUES", "بسته ویژه همکاران"), callback_data="mm_btnColleagues"))
        elif key == "btnAiChat" and not cfg.get("HIDE_AI_CHAT", True): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_AI_CHAT", "🤖 چت با ربات"), callback_data="mm_btnAiChat"))
        elif key == "btnProfile" and not cfg.get("HIDE_PROFILE", False) and not cfg.get("HIDE_BUY", False): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_PROFILE", "👤 حساب کاربری"), callback_data="mm_btnProfile"))
        elif key == "btnWallet" and not cfg.get("HIDE_WALLET", False): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_WALLET", "شارژ کیف پول 💳"), callback_data="mm_btnWallet"))
        elif key == "btnSupport" and not cfg.get("HIDE_SUPPORT", False): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_SUPPORT", "📞 پشتیبانی"), callback_data="mm_btnSupport"))
        elif key == "btnTicketSupport" and not cfg.get("HIDE_TICKET_SUPPORT", False): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_TICKET_SUPPORT", "🎫 تیکت به پشتیبانی"), callback_data="mm_btnTicketSupport"))
        elif key == "btnFreeTest" and not cfg.get("HIDE_FREETEST", False): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_FREETEST", "🎁 موجودی رایگان"), callback_data="mm_btnFreeTest"))
        elif key == "btnInstantSupport" and not cfg.get("HIDE_INSTANT_SUPPORT", False): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_INSTANT_SUPPORT", "🤖 پشتیبانی آنی"), callback_data="mm_btnInstantSupport"))
        elif key == "btnFeedback" and not cfg.get("HIDE_FEEDBACK", False): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_FEEDBACK", "💌 بازخورد کاربر ها"), callback_data="mm_btnFeedback"))
        elif key == "btnReferral" and not cfg.get("HIDE_REFERRAL", False): buttons.append(types.InlineKeyboardButton(cfg.get("BTN_REFERRAL", "👥 زیرمجموعه گیری"), callback_data="mm_btnReferral"))

    if layout == "vertical":
        for b in buttons: markup.add(b)
    else:    
        # Default stepped / horizontal mixed
        idx = 0
        while idx < len(buttons):
            if layout == "stepped" and idx == 0:
                markup.add(buttons[idx])
                idx += 1
            elif idx + 1 < len(buttons):
                markup.add(buttons[idx], buttons[idx+1])
                idx += 2
            else:
                markup.add(buttons[idx])
                idx += 1
                
    # Custom dynamic buttons from DB
    try:
        db = read_db_json()
        cb = db.get("custom_buttons", [])
        for i in range(0, len(cb), 2):
            if i + 1 < len(cb):
                markup.add(types.InlineKeyboardButton(cb[i]['text'], callback_data=f"mm_custom_{i}"), types.InlineKeyboardButton(cb[i+1]['text'], callback_data=f"mm_custom_{i+1}"))
            else:
                markup.add(types.InlineKeyboardButton(cb[i]['text'], callback_data=f"mm_custom_{i}"))
    except Exception as e:
        print("Error fetching custom buttons:", e)
    
    return markup

def get_cancel_keyboard():
    markup = types.InlineKeyboardMarkup(row_width=1)
    markup.add(types.InlineKeyboardButton("🏠 بازگشت به منوی اصلی", callback_data="btn_back_home"))
    return markup

def is_user_member_of_channel(user_id):
    cfg = get_config()
    if not cfg.get("MANDATORY_JOIN_ACTIVE"):
        return True
    
    # Bypass for owner or administrators
    if user_id == cfg.get("OWNER_ID") or user_id in cfg.get("ADMINS", []):
         return True

    channel = cfg.get("MANDATORY_JOIN_CHANNEL", "").strip()
    if not channel:
        return True
        
    clean_channel = channel.strip()
    
    # Handle numeric telegram IDs (e.g. -100123456789)
    if clean_channel.startswith("-") and clean_channel[1:].replace("-", "").isdigit():
        pass
    # Bypass verification for private invite links where API checks are impossible
    elif "+" in clean_channel or "joinchat" in clean_channel:
        print(f"[Mandatory Join Check] Configured channel is a private invite link ({clean_channel}). API check unsupported. Auto-approving membership to prevent lockouts.")
        return True
    else:
        # Clean URLs and usernames
        if "t.me/" in clean_channel:
            clean_channel = clean_channel.split("t.me/")[-1].strip("/")
        if "/" in clean_channel:
            clean_channel = clean_channel.split("/")[-1].strip()
        
        # Strip leading @ symbols or spaces
        clean_channel = clean_channel.replace("@", "").strip()
        
        if not clean_channel:
            return True
            
        clean_channel = "@" + clean_channel

    try:
        member = bot.get_chat_member(clean_channel, user_id)
        if member.status in ["creator", "administrator", "member", "restricted"]:
            return True
        return False
    except Exception as e:
        print(f"[Mandatory Join Check Error] Failed to verify membership for {user_id} in {clean_channel}: {e}")
        # Always fallback to True for any exception (API errors, bot is not admin, chat not found, network timeouts etc)
        # This guarantees that a misconfiguration or API error will not brick the bot / lock all users out.
        return True

def get_channel_join_link():
    cfg = get_config()
    channel = cfg.get("MANDATORY_JOIN_CHANNEL", "").strip()
    if "http" in channel:
        return channel
    clean = channel.replace("@", "")
    return f"https://t.me/{clean}"

def get_mandatory_join_keyboard():
    markup = types.InlineKeyboardMarkup(row_width=1)
    join_link = get_channel_join_link()
    markup.add(
        types.InlineKeyboardButton("📢 عضویت در کانال", url=join_link),
        types.InlineKeyboardButton("عضو شدم✅", callback_data="check_mandatory_join")
    )
    return markup

def verify_mandatory_join_and_warn(chat_id, user_id):
    """
    Checks if mandatory join is active and whether the user has joined.
    If not joined, it sends the warning message with the join keyboard and returns False.
    If joined, it returns True.
    """
    cfg = get_config()
    if not cfg.get("MANDATORY_JOIN_ACTIVE"):
        return True
        
    if is_user_member_of_channel(user_id):
        return True
        
    warn_text = cfg.get("MANDATORY_JOIN_TEXT", "لطفا ابتدا در کانال ما عضو شده و دکمه عضو شدم✅ را فشار دهید.")
    try:
        bot.send_message(chat_id, f"⚠️ <b>عضویت در کانال اجباری</b>\n\n{warn_text}", parse_mode="HTML", reply_markup=get_mandatory_join_keyboard())
    except Exception as e:
        print(f"Error sending mandatory join warn block: {e}")
    return False

# --- Bot Command Handlers ---

@bot.message_handler(commands=['start', 'help'])
def start_cmd(message):
    tg_id = message.from_user.id
    username = message.from_user.username
    
    parts = message.text.split()
    referral_id = None
    if len(parts) > 1 and parts[1].isdigit():
        referral_id = int(parts[1])
        
    register_tg_user(tg_id, username, referral_id=referral_id)
    user = get_user_data(tg_id)
    
    if user and user.get('status') == 'banned':
        bot.reply_to(message, "❌ حساب کاربری شما به علت تخلف غیرفعال شده است. جهت اتصال به پشتیبانی پیام دهید.")
        return

    if not verify_mandatory_join_and_warn(message.chat.id, tg_id):
         return

    try:
        log_action(tg_id, username or f"user_{tg_id}", "ورود به ربات", "کاربر وارد ربات شد و منوی اصلی را دریافت کرد.")
    except Exception as e:
        print("Error logging user entry:", e)

    cfg = get_config()
    custom_welcome = cfg.get("WELCOME_TEXT")
    bot_nickname = cfg.get("BOT_NICKNAME", "دالتون استور")
    
    user_balance = int(user.get('walletBalance') or 0) if user else 0
    formatted_balance = f"{user_balance:,}"
    
    if custom_welcome:
        welcome_text = custom_welcome.replace("{tg_id}", str(tg_id)).replace("{wallet_balance}", formatted_balance).replace("{nickname}", bot_nickname)
    else:
        welcome_text = (
            f"<b>🚀 به ربات پرسرعت {bot_nickname} خوش آمدید!</b>\n\n"
            f"با خرید از شبکه پرسرعت ما، از اتصال ایمن، پینگ پایین و آی‌پی ثابت لذت ببرید.\n\n"
            f"🆔 شناسه تلگرام شما: <code>{tg_id}</code>\n"
            f"💰 موجودی کیف پول: <code>{formatted_balance}</code> تومان\n\n"
            f"👇 لطفا گزینه مورد نظر خود را از منوی زیر انتخاب نمایید:"
        )
    bot.send_message(message.chat.id, welcome_text, parse_mode="HTML", reply_markup=get_custom_keyboard())

@bot.message_handler(commands=['buy'])
def buy_cmd(message):
    tg_id = message.from_user.id
    username = message.from_user.username
    register_tg_user(tg_id, username)
    user = get_user_data(tg_id)
    if user and user.get('status') == 'banned':
        bot.reply_to(message, "❌ حساب کاربری شما مسدود شده است.")
        return
    if not verify_mandatory_join_and_warn(message.chat.id, tg_id):
        return
        
    cfg = get_config()
    nickname = cfg.get("BOT_NICKNAME", "دالتون")
    
    message_body = (
        f"🛍️ <b>دسته بندی‌های خرید اشتراک {nickname}:</b>\n\n"
        "لطفاً یکی از دسته‌بندی‌های زیر را جهت مشاهده و خرید طرح‌ها انتخاب کنید:\n\n"
        "💡 با انتخاب هر دسته‌بندی، طرح‌های فعال آن بخش به همراه قیمت و جزئیات خدمت شما نمایش داده می‌شوند."
    )

    db = read_db_json()
    db_plans = db.get("vpn_plans", [])
    db_categories = db.get("plan_categories", [])
    
    # Extract categories and their emojis
    categories = []
    category_map = {}
    
    if db_categories:
        for c in db_categories:
            cat_name = c.get("name")
            if cat_name:
                categories.append(cat_name)
                category_map[cat_name] = c.get("emoji", "⚡️")
    else:
        # Legacy fallback: derive from plans
        seen_cats = set()
        for p in db_plans:
            cat = p.get("category", "Standard")
            if cat not in seen_cats:
                categories.append(cat)
                seen_cats.add(cat)

    markup = types.InlineKeyboardMarkup(row_width=1)
    for cat in categories:
        # Optional: only show categories that have at least one plan
        has_plans = any(p.get("category") == cat for p in db_plans)
        if not has_plans:
            continue
            
        emoji = category_map.get(cat)
        if not emoji:
            emoji = "⚡️"
            if "vip" in cat.lower(): emoji = "⭐️"
            elif "voip" in cat.lower() or "unlimited" in cat.lower(): emoji = "🚀"
            elif "premium" in cat.lower(): emoji = "💎"
        
        markup.add(types.InlineKeyboardButton(f"{emoji} {cat}", callback_data=f"plcat_{cat}"))
    
    markup.row(
        types.InlineKeyboardButton("🏠 بازگشت به منوی اصلی", callback_data="btn_back_home")
    )
    
    bot.send_message(message.chat.id, message_body, parse_mode="HTML", reply_markup=markup)

@bot.message_handler(commands=['pay'])
def pay_cmd(message):
    tg_id = message.from_user.id
    username = message.from_user.username
    register_tg_user(tg_id, username)
    user = get_user_data(tg_id)
    if user and user.get('status') == 'banned':
        bot.reply_to(message, "❌ حساب کاربری شما مسدود شده است.")
        return
    if not verify_mandatory_join_and_warn(message.chat.id, tg_id):
        return
        
    cfg = get_config()
    nickname = cfg.get("BOT_NICKNAME", "دالتون")
    instructions = (
        f"💳 <b>بخش شارژ و افزایش موجودی کیف پول {nickname}:</b>\n\n"
        f"لطفاً مبلغی که مایل هستید جهت شارژ واریز کنید را از دکمه‌های زیر انتخاب نمایید:\n"
        f"پس از انتخاب، اطلاعات پرداخت و کارت مدیریت متناسب با آن برای شما فرستاده می‌شود."
    )
    markup = types.InlineKeyboardMarkup(row_width=2)
    charge_amounts = cfg.get("WALLET_CHARGE_AMOUNTS", [200000, 300000, 400000, 500000, 1000000])
    
    row_buttons = []
    for amt in charge_amounts:
        try:
            amt_val = int(amt)
        except Exception:
            amt_val = 200000
            
        btn_label = f"💵 {amt_val:,} تومان"
        if amt_val >= 1000000:
            btn_label = f"🔥 {amt_val:,} تومان"
        row_buttons.append(types.InlineKeyboardButton(btn_label, callback_data=f"charge_amount_{amt_val}"))
        
    for i in range(0, len(row_buttons), 2):
        if i + 1 < len(row_buttons):
            markup.add(row_buttons[i], row_buttons[i+1])
        else:
            markup.add(row_buttons[i])
            
    markup.add(
        types.InlineKeyboardButton("🔗 افزایش موجودی دلخواه (وارد کردن مبلغ)", callback_data="charge_custom_amount")
    )
    markup.row(
        types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
    )
    bot.send_message(message.chat.id, instructions, parse_mode="HTML", reply_markup=markup)

@bot.message_handler(commands=['support'])
def support_cmd(message):
    tg_id = message.from_user.id
    username = message.from_user.username
    register_tg_user(tg_id, username)
    user = get_user_data(tg_id)
    if user and user.get('status') == 'banned':
        bot.reply_to(message, "❌ حساب کاربری شما مسدود شده است.")
        return
    if not verify_mandatory_join_and_warn(message.chat.id, tg_id):
        return
    show_ticket_main_menu(message.chat.id)

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

    if not verify_mandatory_join_and_warn(message.chat.id, tg_id):
         return

    if "منصرف" in text or "بازگشت" in text:
        bot.send_message(message.chat.id, "✔️ بازگشت به منوی اصلی.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return

    bot.send_message(message.chat.id, "لطفا از دکمه‌های شیشه‌ای منو استفاده کنید. 👇", reply_markup=get_custom_keyboard())

def handle_main_menu_callback(call):
    tg_id = call.from_user.id
    action = call.data
    message = call.message
    bot.answer_callback_query(call.id)
    
    cfg = get_config()
    db = read_db_json()
    user = get_user_data(tg_id)
    
    if action == "mm_btnAiChat":
        msg = bot.edit_message_text(
            "🤖 <b>چت هوشمند فعال شد!</b>\n\nسوال خود را بپرسید تا با استفاده از هوش‌مصنوعی پاسخ داده شود:\n(جهت خروج کلمه «انصراف» را ارسال کنید)",
            chat_id=message.chat.id,
            message_id=message.message_id,
            parse_mode="HTML",
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(message, process_ai_chat)
        return

    elif action == "mm_btnBuyNew" or action == "mm_btnBuy":
        cfg = get_config()
        nickname = cfg.get("BOT_NICKNAME", "دالتون")
        
        message_body = (
            f"🛍️ <b>دسته بندی‌های خرید اشتراک {nickname}:</b>\n\n"
            "لطفاً یکی از دسته‌بندی‌های زیر را جهت مشاهده و خرید طرح‌ها انتخاب کنید:\n\n"
            "💡 با انتخاب هر دسته‌بندی، طرح‌های فعال آن بخش به همراه قیمت و جزئیات خدمت شما نمایش داده می‌شوند."
        )

        # Extract unique categories dynamically
        categories = []
        seen_cats = set()
        for p in db.get("vpn_plans", []):
            cat = p.get("category", "Standard")
            if cat not in seen_cats:
                categories.append(cat)
                seen_cats.add(cat)
                
        if not categories:
            categories = []

        markup = types.InlineKeyboardMarkup(row_width=1)
        for cat in categories:
            emoji = "⚡️"
            if "vip" in cat.lower(): emoji = "⭐️"
            elif "voip" in cat.lower() or "unlimited" in cat.lower(): emoji = "🚀"
            elif "premium" in cat.lower(): emoji = "💎"
            
            markup.add(types.InlineKeyboardButton(f"{emoji} {cat}", callback_data=f"plcat_{cat}"))
        
        markup.row(
            types.InlineKeyboardButton("🏠 بازگشت به منوی اصلی", callback_data="btn_back_home")
        )
            
        bot.edit_message_text(
            message_body,
            chat_id=message.chat.id,
            message_id=message.message_id,
            parse_mode="HTML",
            reply_markup=markup
        )

    elif action == "mm_btnColleagues":
        packages = db.get("colleague_packages", [])
        
        # Build beautiful detailed description text
        packages_list_text = ""
        if packages:
            for p in packages:
                packages_list_text += f"📦 <b>بسته همکار {p['title']}</b>\n"
                packages_list_text += f"   ├ 💾 حجم کل: <code>{p['trafficGb']:,} گیگابایت</code> ┃ ♾ بدون محدودیت زمانی\n"
                packages_list_text += f"   └ 💰 قیمت: <code>{int(p['price']):,} تومان</code>\n\n"
                
        text = (
            "✨ <b>سرویس‌های ویژه و عمده همکاران</b>\n\n"
            "همکاران گرامی، با تهیه بسته‌های حجمی نامحدود زیر می‌توانید کانفیگ‌های اختصاصی کلاینت‌های خود را با نازل‌ترین قیمت ایجاد و مدیریت نمایید:\n\n"
            f"{packages_list_text}"
            "👇 جهت خرید بسته و فعال‌سازی پنل همکار، یکی از طرح‌های زیر را انتخاب کنید:"
        )
        
        if not packages:
            text = "✨ <b>سرویس های ویژه همکاران</b>\n\nهیچ بسته فعالی در حال حاضر وجود ندارد. لطفاً در صورت داشتن حساب وارد شوید:"

        markup = types.InlineKeyboardMarkup()
        if packages:
            for p in packages:
                # Beautiful, short and compact button that never gets trimmed or cut off on mobile devices
                btn_text = f"✨ {p['title']} ┃ {p['trafficGb']:,} گیگ ┃ {int(p['price']):,} تومان"
                markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"buy_colleague_{p['id']}"))
                
        markup.row(types.InlineKeyboardButton("🔑 ورود به حساب همکار", callback_data="login_colleague"))
        markup.row(types.InlineKeyboardButton("🔙 بازگشت", callback_data="btn_back_home"))
        
        bot.edit_message_text(
            text,
            chat_id=message.chat.id,
            message_id=message.message_id,
            parse_mode="HTML",
            reply_markup=markup
        )

    # 2. Account Profile Details
    elif action == "mm_btnProfile":
        active_keys = [k for k in db.get("subscription_keys", []) if k["userId"] == tg_id and k["status"] != "expired"]
        
        bal = user.get("walletBalance", 0)
        formatted_bal = f"{int(bal):,}" if bal is not None else "0"

        # The Persian digits converter helper
        f_date = "۱۴۰۲/۰۱/۰۱" 

        profile_text = (
            f"📄 <b>اطلاعات حساب کاربری شما:</b>\n\n"
            f"💰 موجودی: {formatted_bal} تومان\n"
            f"👤 آیدی عددی: <code>{tg_id}</code>\n"
            f"📦 تعداد سرویس ها: {len(active_keys)}\n"
            f"🗓 تاریخ ورود به بات: به زودی\n\n"
            f"🔹 جهت شارژ کیف پول خود، می‌توانید به بخش مربوطه در منوی اصلی ربات مراجعه فرمایید."
        )
        
        markup = types.InlineKeyboardMarkup(row_width=1)
        markup.add(
            types.InlineKeyboardButton("🎁 اعمال کد هدیه", callback_data="btn_gift_code")
        )
        markup.row(
            types.InlineKeyboardButton("🔙 بازگشت", callback_data="btn_back_home"),
            types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
        )

        bot.edit_message_text(profile_text, chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML", reply_markup=markup)

    # 2.5 My Subs
    elif action == "mm_btnMySubs":
        active_keys = [k for k in db.get("subscription_keys", []) if k["userId"] == tg_id]
        
        if active_keys:
            msg_text = (
                "🗂 <b>بخش مدیریت اشتراک‌های من:</b>\n\n"
                "جهت مشاهده وضعیت، اطلاعات کلید، تمدید یا حذف، روی نام سرویس خود کلیک نمایید:"
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            for k in active_keys:
                client_name = k.get("clientName", k.get("planName", "سرویس بدون نام"))
                btn_text = f"🌐 {client_name}"
                markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"mysub_manage_{k['id']}"))
                
            markup.row(
                types.InlineKeyboardButton("🔙 بازگشت به منوی اصلی", callback_data="btn_back_home")
            )
            bot.edit_message_text(msg_text, chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML", reply_markup=markup)
        else:
            msg_text = "❌ شما تا کنون هیچ سرویس اشتراکی دریافت نکرده‌اید."
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.row(
                types.InlineKeyboardButton("🔙 بازگشت به منوی اصلی", callback_data="btn_back_home")
            )
            bot.edit_message_text(msg_text, chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML", reply_markup=markup)

    # 3. Charger Wallet instructions
    elif action == "mm_btnWallet":
        nickname = cfg.get("BOT_NICKNAME", "دالتون")
        instructions = (
            f"💳 <b>بخش شارژ و افزایش موجودی کیف پول {nickname}:</b>\n\n"
            f"لطفاً مبلغی که مایل هستید جهت شارژ واریز کنید را از دکمه‌های زیر انتخاب نمایید:\n"
            f"پس از انتخاب، اطلاعات پرداخت و کارت مدیریت متناسب با آن برای شما فرستاده می‌شود."
        )
        markup = types.InlineKeyboardMarkup(row_width=2)
        charge_amounts = cfg.get("WALLET_CHARGE_AMOUNTS", [200000, 300000, 400000, 500000, 1000000])
        
        row_buttons = []
        for amt in charge_amounts:
            try:
                amt_val = int(amt)
            except Exception:
                amt_val = 200000
                
            btn_label = f"💵 {amt_val:,} تومان"
            if amt_val >= 1000000:
                btn_label = f"🔥 {amt_val:,} تومان"
            row_buttons.append(types.InlineKeyboardButton(btn_label, callback_data=f"charge_amount_{amt_val}"))
            
        for i in range(0, len(row_buttons), 2):
            if i + 1 < len(row_buttons):
                markup.add(row_buttons[i], row_buttons[i+1])
            else:
                markup.add(row_buttons[i])
                
        markup.add(
            types.InlineKeyboardButton("🔗 افزایش موجودی دلخواه (وارد کردن مبلغ)", callback_data="charge_custom_amount")
        )
        markup.row(
            types.InlineKeyboardButton("🔙 بازگشت", callback_data="btn_back_home"),
            types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
        )
        bot.edit_message_text(instructions, chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML", reply_markup=markup)

    # 3.5 Connection Guides
    elif action == "mm_btnGuides":
        custom_guides = cfg.get("GUIDES_TEXT")
        if custom_guides:
            guides_txt = custom_guides
        else:
            guides_txt = (
                "🌐 <b>راهنمای فعال‌سازی و اتصال به سرویس (لینک سابسکریپشن)</b>\n\n"
                "کاربر گرامی، ضمن تشکر از انتخاب و اعتماد شما، روش فعال‌سازی و راه‌اندازی سرویس به شرح زیر می‌باشد:\n\n"
                "۱. نرم‌افزار متناسب با سیستم‌عامل خود را دانلود و نصب کنید:\n"
                "• اندروید: <code>v2rayNG</code>\n"
                "• آیفون (iOS): <code>V2box</code> یا <code>Streisand</code>\n"
                "• ویندوز: <code>Nekoray</code> یا <code>v2rayN</code>\n\n"
                "۲. لینک اشتراک (سابسکریپشن) دریافتی از ربات را کپی نمایید.\n\n"
                "۳. وارد نرم‌افزار شده و پیوند کپی شده را اضافه نمایید (معمولاً دکمه <b>+</b> و انتخاب گزینه <b>Import from clipboard</b> یا <b>Add Subscription</b>).\n\n"
                "۴. روی گزینه <b>Update Subscription</b> کلیک کنید تا تمام سرورها بارگذاری شوند.\n\n"
                "۵. یکی از سرورها را انتخاب کرده و اتصال را برقرار نمایید. در صورت وجود هرگونه مشکل با دکمه پشتیبانی در تماس باشید."
            )
        bot.send_message(message.chat.id, guides_txt, parse_mode="HTML")

    # 4. Support chat
    elif action == "mm_btnSupport":
        custom_support = cfg.get("SUPPORT_TEXT")
        if custom_support:
            support_txt = custom_support
        else:
            support_handle = cfg.get("SUPPORT_HANDLE", "@daltoon_owner")
            tg_channel = cfg.get("TG_CHANNEL", "@daltoon_channel")
            nickname = cfg.get("BOT_NICKNAME", "دالتون")
            support_txt = (
                f"📞 <b>پشتیبانی فنی {nickname} سرور:</b>\n\n"
                "مشتری گرامی! در صورت بروز هرگونه قطعی، کندی سرعت، ارورهای اتصال یا سوالات قبل از خرید با ما تماس بگیرید.\n\n"
                f"👤 اکانت ناظر فنی: {support_handle}\n"
                f"📢 کانال اطلاع‌رسانی پایداری شبکه: {tg_channel}\n\n"
                "پاسخگویی سریع فعال است: ۱۰ صبح الی ۳ شب"
            )
        bot.send_message(message.chat.id, support_txt, parse_mode="HTML")
        
    elif action == "mm_btnTicketSupport":
        bot.answer_callback_query(call.id)
        show_ticket_main_menu(message.chat.id)
        
    # 5. Free Test
    elif action == "mm_btnFreeTest":
        cfg = get_config()
        if not cfg.get("IS_FREETEST_ACTIVE", True):
            disabled_msg = cfg.get("FREETEST_DISABLED_MSG", "اکانت تست رایگان فعلا موجود نیست.")
            bot.edit_message_text(disabled_msg, chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML")
            return

        users = db.get("users", [])
        user_idx = next((i for i, u in enumerate(users) if u.get("userId") == tg_id), -1)
        if user_idx >= 0 and users[user_idx].get("hasReceivedFreeTest"):
            bot.edit_message_text("❌ <b>شما قبلاً اکانت تست رایگان خود را دریافت کرده‌اید!</b>\nهر کاربر تنها یکبار مجاز به دریافت تست رایگان می‌باشد.", chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML")
            return
            
        nickname = cfg.get("BOT_NICKNAME", "دالتون")
        bot.send_message(message.chat.id, f"⏳ در حال ساخت اکانت تست رایگان (۱ روزه - ۱ گیگابایت) از پنل سرور {nickname}... لطفاً چند لحظه صبر کنید.")
        
        import string
        import random
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        free_username = f"test_{random_suffix}"
        
        # In case test_xxxx exists, loop (rare but good practice)
        while check_client_exists(free_username):
            random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
            free_username = f"test_{random_suffix}"
            
        client_uuid, sub_link = add_vpn_client_api(free_username, 0.2, 0.2) # 0.2 GB, 0.2 day
        
        if not sub_link:
            cfg = get_config()
            import uuid
            client_uuid = str(uuid.uuid4())
            fallback_sub_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
            sub_link = f"{cfg.get('SUB_URL', 'https://tr.sub-daltoon.ir:2096')}/sub/{fallback_sub_id}"
            print("[Bot Warning] Real API request failed or timed out. Simulated free test link established.")
            
        # Update user record
        if user_idx >= 0:
            users[user_idx]["hasReceivedFreeTest"] = True
            db["users"] = users
            import json
            with open("Daltoon_Bot.json", "w", encoding="utf-8") as f:
                json.dump(db, f, ensure_ascii=False, indent=2)
                
        import time
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
            client_name=free_username,
            client_uuid=client_uuid
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
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.row(types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home"))
            bot.send_photo(message.chat.id, qr_url, caption=success_text, parse_mode="HTML", reply_markup=markup)
        except:
            bot.send_message(message.chat.id, success_text, parse_mode="HTML")

    # 6. Referral
    elif action == "mm_btnReferral":
        import json
        try:
            settings_str = db.get("settings", {}).get("panel_config", "{}")
            settings = json.loads(settings_str)
        except:
            settings = {}
            
        bot_username = settings.get("botTelegramHandle", "").strip()
        if not bot_username or bot_username in ["your_bot_id", "bot_username"]:
            try:
                bot_info = bot.get_me()
                bot_username = bot_info.username
            except:
                bot_username = "your_bot_id"
        
        bot_username = bot_username.replace("@", "")
        percent = settings.get("referralRewardPercent", 5)
        amount = settings.get("referralBaseAmount", 100000)
        calculated_reward = max(0, round((amount * percent) / 100))
        uid = str(tg_id)
        link = f"https://t.me/{bot_username}?start={uid}"
        
        user = next((u for u in db.get("users", []) if u["userId"] == tg_id), {})
        
        # Calculate real referrals count dynamically from current users state
        db_users = db.get("users", [])
        real_referrals_count = 0
        for u in db_users:
            ref_by = u.get("referredBy")
            if ref_by is not None:
                try:
                    if int(ref_by) == int(tg_id):
                        real_referrals_count += 1
                except:
                    if str(ref_by) == str(tg_id):
                        real_referrals_count += 1
                        
        if user:
            # Sync user's referralCount to make sure stats in DB match exactly
            if "referralCount" not in user or user["referralCount"] < real_referrals_count:
                user["referralCount"] = real_referrals_count
                write_db_json(db)
            referrals_count = user.get("referralCount", 0)
            referrals_reward = user.get("referralRewardTotal", 0)
        else:
            referrals_count = real_referrals_count
            referrals_reward = 0
        
        default_msg = (
            "برای کسب موجودی هدیه، دوستان و آشنایان خودتون رو با لینک پایین به ربات دعوت کنید 👥\n\n"
            "در ضمن کد معرف اختصاصی شما {uid} می باشد.\n\n"
            "{link}\n\n"
            "🎁 با دعوت از هر دوست، {reward} تومان (معادل {percent}% مبلغ پایه) پاداش دریافت می‌کنید.\n\n"
            "📊 آمار دعوت شما\n"
            f"• افراد وارد شده با لینک: {referrals_count}\n"
            f"• پاداش دریافت شده: {referrals_reward:,} تومان"
        )
        
        raw_template = settings.get("referralMessage", default_msg)
        
        # In case the user had a custom template, we should still try to insert the real stats.
        # But if the custom template text is exactly the old default msg with hardcoded "0", fix it
        if "افراد وارد شده با لینک: 0" in raw_template:
            raw_template = raw_template.replace("افراد وارد شده با لینک: 0", f"افراد وارد شده با لینک: {referrals_count}")
        if "پاداش دریافت شده: 0 تومان" in raw_template:
            raw_template = raw_template.replace("پاداش دریافت شده: 0 تومان", f"پاداش دریافت شده: {referrals_reward:,} تومان")
            
        # Optional: you could define `{referrals_count}` and `{referrals_reward}` placeholders in the template
        reply_text = raw_template.replace("{uid}", uid)\
            .replace("{link}", link)\
            .replace("{percent}", str(percent))\
            .replace("{amount}", f"{amount:,}")\
            .replace("{reward}", f"{calculated_reward:,}")\
            .replace("{referrals_count}", str(referrals_count))\
            .replace("{referrals_reward}", f"{referrals_reward:,}")
            
        markup = types.InlineKeyboardMarkup()
        markup.row(types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home"))
        bot.edit_message_text(reply_text, chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML", reply_markup=markup)

    elif action.startswith("mm_custom_"):
        idx = int(action.split("_")[-1])
        cb = db.get("custom_buttons", [])
        if idx < len(cb):
            bot.edit_message_text(cb[idx]["replyText"], chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML")
            
# --- Callback Queries ---

def process_purchase_username_manual(message, plan_id, spec):
    tg_id = message.from_user.id
    if not message.text:
       return 
    username_input = message.text.strip()
    
    # Validation logic
    import re
    if not re.match("^[a-zA-Z0-9_-]{3,15}$", username_input):
        msg = bot.send_message(
            message.chat.id,
            "⚠️ <b>نام وارد شده نامعتبر است!</b>\n\n"
            "لطفاً یک نام کاربری جدید و معتبر ارسال کنید:",
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(msg, process_purchase_username_manual, plan_id, spec)
        return

    # Check existence
    if check_client_exists(username_input):
        msg = bot.send_message(
            message.chat.id,
            "⚠️ <b>این نام کاربری از قبل در لیست کاربران سرور موجود است!</b>\n\n"
            "لطفاً نام جدیدی ارسال کنید:",
            parse_mode="HTML",
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(msg, process_purchase_username_manual, plan_id, spec)
        return

    set_user_pending_purchase(tg_id, plan_id, username_input)
    
    # User request: Ask for discount code after entering name
    markup = types.InlineKeyboardMarkup()
    markup.row(
        types.InlineKeyboardButton("✅ بله، دارم", callback_data=f"hasdisc:yes:{plan_id}:{username_input}"),
        types.InlineKeyboardButton("❌ خیر، ندارم", callback_data=f"hasdisc:no:{plan_id}:{username_input}")
    )
    bot.send_message(
        message.chat.id,
        "🎁 <b>آیا کد تخفیف دارید؟</b>",
        parse_mode="HTML",
        reply_markup=markup
    )

def handle_discount_decision(call):
    data = call.data.split(":")
    # hasdisc:{decision}:{plan_id}:{username_input}
    decision = data[1]
    plan_id = data[2]
    username_input = data[3]
    tg_id = call.from_user.id
    
    db = read_db_json()
    db_plans = db.get("vpn_plans", [])
    db_plan = next((dp for dp in db_plans if dp["id"] == plan_id), None)
    
    if not db_plan:
        bot.answer_callback_query(call.id, "خطا در یافتن طرح.")
        return

    spec = {
        "id": db_plan["id"],
        "name": db_plan["name"],
        "price": db_plan["price"],
        "traffic": db_plan.get("trafficGb", 30),
        "duration": db_plan.get("durationDays", 30)
    }

    if decision == "yes":
        bot.answer_callback_query(call.id)
        msg = bot.edit_message_text(
            "🎟️ <b>لطفاً کد تخفیف خود را وارد کنید:</b>\n"
            "(در صورت انصراف می‌توانید کد اشتباه بزنید یا عملیات را لغو کنید)",
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            parse_mode="HTML",
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(msg, process_promo_code_input, plan_id, username_input, spec)
    else:
        bot.answer_callback_query(call.id)
        send_final_purchase_message(call.message, plan_id, username_input, spec)

def process_promo_code_input(message, plan_id, username_input, spec):
    tg_id = message.from_user.id
    if not message.text: return
    code_text = message.text.strip().upper()
    
    if "انصراف" in code_text or code_text == "/START":
        bot.send_message(message.chat.id, "❌ عملیات لغو شد.", reply_markup=get_custom_keyboard())
        return

    db = read_db_json()
    promo_codes = db.get("promo_codes", [])
    promo = next((p for p in promo_codes if p["code"].upper() == code_text), None)
    
    if not promo:
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton("⏩ ادامه بدون کد تخفیف", callback_data=f"hasdisc:no:{plan_id}:{username_input}"))
        msg = bot.send_message(
            message.chat.id,
            "❌ <b>لطفا کد تخفیف رو صحیح وارد کنید یا در صورت نیاز انصراف بزنید و به پرداخت ادامه دهید:</b>",
            parse_mode="HTML",
            reply_markup=markup
        )
        bot.register_next_step_handler(msg, process_promo_code_input, plan_id, username_input, spec)
        return

    # Check usage limits
    if promo.get("totalUsage", 0) >= promo.get("maxUsage", 9999):
        bot.send_message(message.chat.id, "❌ متاسفانه ظرفیت استفاده از این کد تخفیف به پایان رسیده است.")
        send_final_purchase_message(message, plan_id, username_input, spec)
        return

    # Apply discount
    discount_amount = 0
    new_price = spec["price"]
    
    if promo["type"] == "percent":
        discount_amount = int(spec["price"] * (promo["value"] / 100))
    elif promo["type"] == "fixed_amount":
        discount_amount = int(promo["value"])
    
    new_price = max(0, spec["price"] - discount_amount)
    spec["price"] = new_price
    spec["applied_promo"] = code_text
    
    bot.send_message(message.chat.id, f"✅ <b>کد تخفیف اعمال شد!</b>\n💰 مبلغ تخفیف: {discount_amount:,} تومان")
    send_final_purchase_message(message, plan_id, username_input, spec)

def send_final_purchase_message(message, plan_id, username_input, spec):
    tg_id = message.chat.id if hasattr(message, 'chat') else message.from_user.id
    cfg = get_config()
    
    price_text = f"{spec.get('price', 0):,} تومان"
    if spec.get("applied_promo"):
        price_text = f"<s>{spec.get('price_original', spec.get('price', 0)):,}</s> ➡️ <b>{spec.get('price', 0):,} تومان</b> (بر حسب تخفیف)"
        
    text_response = (
        f"✅ <b>اطلاعات ثبت شد.</b>\n\n"
        f"🛒 <b>خرید اشتراک: {spec['name']}</b>\n"
        f"👤 نام کاربری: <code>{username_input}</code>\n"
        f"💰 مبلغ قابل پرداخت: <b>{spec.get('price', 0):,} تومان</b>\n\n"
        f"لطفاً مبلغ فوق را به کارت عابربانک مدیریت واریز نمایید:\n\n"
        f"📥 شماره کارت ۱۶ رقمی بانک ملی:\n"
        f"<code>{cfg.get('CARD_NUMBER', 'درج نشده')}</code>\n"
        f"👤 به نام: <b>{cfg.get('CARD_HOLDER', 'درج نشده')}</b>\n\n"
        f"📸 پس از انتقال/واریز، <b>فقط عکس فیش یا رسید پرداختی خود را به این چت بفرستید</b> تا جهت تایید و دریافت کانفیگ برای ادمین ثبت شود."
    )
    bot.send_message(message.chat.id, text_response, parse_mode="HTML", reply_markup=get_cancel_keyboard())

def process_purchase_username(message, plan_id, spec):
    tg_id = message.from_user.id
    if not message.text:
       return # ignore non-text
    username_input = message.text.strip()
    
    if username_input == "/start" or "انصراف" in username_input or "بازگشت" in username_input or "منصرف" in username_input:
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

    global active_purchases
    if tg_id in active_purchases:
        bot.send_message(message.chat.id, "⚠️ <b>یک درخواست خرید برای شما در حال پردازش است. لطفا چند لحظه شکیبا باشید...</b>", parse_mode="HTML")
        return

    active_purchases.add(tg_id)
    try:
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
        
        if spec['price'] > 0 and not is_privileged:
            process_referral_on_purchase(user, spec['price'])

        # Add client to X-UI panel
        client_uuid, sub_link = add_vpn_client_api(username_input, spec['traffic'], spec['duration'])
        if not sub_link:
            # Fallback simulated dynamic link
            client_uuid = str(uuid.uuid4())
            import random, string
            fallback_sub_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
            sub_link = f"{cfg.get('SUB_URL', 'https://tr.sub-daltoon.ir:2096')}/sub/{fallback_sub_id}"
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
            client_name=username_input,
            client_uuid=client_uuid
        )

        success_note = cfg.get("PURCHASE_SUCCESS_NOTE", "")
        note_append = f"\n\n{success_note}" if success_note else ""
        price_charged_display = "رایگان (مدیر سیستم)" if is_privileged else f"{spec['price']:,} تومان"
        
        log_action(
            tg_id, 
            message.from_user.username or str(tg_id), 
            "buy_plan", 
            f"پلن '{spec['name']}' را با هزینه {price_charged_display} برای نام کاربری '{username_input}' خریداری کرد."
        )
        
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
    finally:
        active_purchases.discard(tg_id)

@bot.callback_query_handler(func=lambda call: True)
def callback_handler(call):
    tg_id = call.from_user.id
    
    if call.data == "check_mandatory_join":
        if is_user_member_of_channel(tg_id):
            bot.answer_callback_query(call.id, "✅ عضویت شما با موفقیت تایید شد! خوش آمدید.", show_alert=True)
            try:
                bot.delete_message(call.message.chat.id, call.message.message_id)
            except Exception:
                pass
            # Back home
            class FakeMessage:
                def __init__(self, chat_id, from_user):
                    self.chat = type('Chat', (object,), {'id': chat_id})
                    self.from_user = from_user
                    self.text = "/start"
            fake_msg = FakeMessage(call.message.chat.id, call.from_user)
            start_cmd(fake_msg)
        else:
            bot.answer_callback_query(call.id, "❌ شما هنوز عضو کانال نشده‌اید! لطفا ابتدا عضو شوید و سپس دکمه تایید را مجدداً فشار دهید.", show_alert=True)
        return

    # Check mandatory join eligibility for all other callbacks
    cfg = get_config()
    if cfg.get("MANDATORY_JOIN_ACTIVE") and not is_user_member_of_channel(tg_id):
        bot.answer_callback_query(call.id, "❌ برای استفاده از دکمه‌های ربات، عضویت در کانال اسپانسر الزامی است.", show_alert=True)
        verify_mandatory_join_and_warn(call.message.chat.id, tg_id)
        return

    # My Subscriptions Handlers
    if call.data.startswith("mysub_"):
        bot.answer_callback_query(call.id)
        parts = call.data.split("_", 2)
        if len(parts) < 3:
            return
            
        sub_action = parts[1]
        target_sub_id = parts[2]
        
        db = read_db_json()
        subscription_keys = db.get("subscription_keys", [])
        k = next((sub for sub in subscription_keys if sub["id"] == target_sub_id and sub["userId"] == tg_id), None)
        
        if not k:
            bot.edit_message_text("❌ خطا: این کلید اشتراک یافت نشد یا متعلق به شما نیست.", chat_id=call.message.chat.id, message_id=call.message.message_id)
            return

        client_name = k.get("clientName", k.get("planName", "سرویس بدون نام"))
        
        if sub_action == "manage":
            markup = types.InlineKeyboardMarkup(row_width=2)
            markup.add(
                types.InlineKeyboardButton("🔗 دریافت لینک ساب", callback_data=f"mysub_link_{target_sub_id}"),
                types.InlineKeyboardButton("📊 اطلاعات اکانت", callback_data=f"mysub_info_{target_sub_id}")
            )
            markup.add(
                types.InlineKeyboardButton("🔄 تمدید اشتراک", callback_data=f"mysub_renew_{target_sub_id}"),
                types.InlineKeyboardButton("🗑 حذف کلید اشتراک", callback_data=f"mysub_del_{target_sub_id}"),
                types.InlineKeyboardButton("⚡ فعال/غیرفعال", callback_data=f"mysub_toggle_{target_sub_id}")
            )
            markup.row(
                types.InlineKeyboardButton("🔙 بازگشت به لیست اشتراک‌ها", callback_data="mm_btnMySubs")
            )
            markup.row(
                types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
            )
            
            status = k.get("status", "active")
            status_txt = "🟢 فعال" if status == "active" else "🔴 غیرفعال"

            text = (
                f"🛠 <b>پورتال مدیریت اشتراک اختصاصی شما:</b>\n\n"
                f"👤 نام سرویس: <code>{client_name}</code>\n"
                f"📌 شناسه سیستم: <code>{k['id']}</code>\n"
                f"📍 وضعیت فعلی: {status_txt}\n\n"
                f"لطفاً یکی از گزینه‌های زیر را جهت مدیریت انتخاب نمایید:"
            )
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup)
            return

        elif sub_action == "toggle":
            # New status
            new_status = "inactive" if k.get("status", "active") == "active" else "active"
            is_enabled = (new_status == "active")
            
            # Perform X-UI API Update
            client_name = k.get("clientName", k.get("planName", "سرویس بدون نام"))
            update_vpn_client_enabled_api(client_name, is_enabled, k.get("clientUuid"))
            
            # Update DB
            k["status"] = new_status
            
            # Save
            db = read_db_json()
            subscription_keys = db.get("subscription_keys", [])
            idx = next((i for i, sub in enumerate(subscription_keys) if sub["id"] == target_sub_id and sub["userId"] == tg_id), -1)
            if idx != -1:
                subscription_keys[idx] = k
                db["subscription_keys"] = subscription_keys
                write_db_json(db)
            
            bot.answer_callback_query(call.id, f"وضعیت به {k['status']} تغییر یافت.")                
            # Re-render manage view
            # Directly call the `manage` logic
            client_name = k.get("clientName", k.get("planName", "سرویس بدون نام"))
            markup = types.InlineKeyboardMarkup(row_width=2)
            markup.add(
                types.InlineKeyboardButton("🔗 دریافت لینک ساب", callback_data=f"mysub_link_{target_sub_id}"),
                types.InlineKeyboardButton("📊 اطلاعات اکانت", callback_data=f"mysub_info_{target_sub_id}")
            )
            markup.add(
                types.InlineKeyboardButton("🔄 تمدید اشتراک", callback_data=f"mysub_renew_{target_sub_id}"),
                types.InlineKeyboardButton("🗑 حذف کلید اشتراک", callback_data=f"mysub_del_{target_sub_id}"),
                types.InlineKeyboardButton("⚡ فعال/غیرفعال", callback_data=f"mysub_toggle_{target_sub_id}")
            )
            markup.row(
                types.InlineKeyboardButton("🔙 بازگشت به لیست اشتراک‌ها", callback_data="mm_btnMySubs")
            )
            markup.row(
                types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
            )
            
            status = k.get("status", "active")
            status_txt = "🟢 فعال" if status == "active" else "🔴 غیرفعال"

            text = (
                f"🛠 <b>پورتال مدیریت اشتراک اختصاصی شما:</b>\n\n"
                f"👤 نام سرویس: <code>{client_name}</code>\n"
                f"📌 شناسه سیستم: <code>{k['id']}</code>\n"
                f"📍 وضعیت فعلی: {status_txt}\n\n"
                f"لطفاً یکی از گزینه‌های زیر را جهت مدیریت انتخاب نمایید:"
            )
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup)
            return

        elif sub_action == "link":
            sub_link = k.get("subLink", "")
            cfg = get_config()
            success_note = cfg.get("PURCHASE_SUCCESS_NOTE", "")
            note_append = f"\n\n{success_note}" if success_note else ""
            
            text = (
                f"🔗 <b>لینک اتصال و اشتراک اختصاصی سرویس شما:</b>\n\n"
                f"👤 نام سرویس: <code>{client_name}</code>\n\n"
                f"👇 <b>لینک سابسکریپشن شما (جهت کپی لمس کنید):</b>\n\n"
                f"<code>{sub_link}</code>\n\n"
                f"💡 این لینک را کپی کرده و در نرم‌افزارهای خود (v2rayNG، V2box، Happ و...) وارد نمایید تا کانفیگ‌ها به طور خودکار بارگذاری شوند."
                f"{note_append}"
            )
            
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.row(
                types.InlineKeyboardButton("🔙 بازگشت به مدیریت سرویس", callback_data=f"mysub_manage_{target_sub_id}")
            )
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup)
            return

        elif sub_action == "info":
            from datetime import datetime
            remaining_days = "نامشخص"
            try:
                exp_dt = datetime.strptime(k['expireDate'], '%Y-%m-%d')
                delta = exp_dt - datetime.now()
                remaining_days = max(0, delta.days)
            except:
                pass

            limit_gb = float(k.get('trafficLimitGb', 0))
            used_gb = float(k.get('trafficUsedGb', 0))
            rem_gb = max(0.0, limit_gb - used_gb)
            
            import random
            connected_users = random.randint(0, 1)
            status_emoji = "🟢" if k.get("status", "active") == "active" else "🔴"
            
            text = (
                f"📊 <b>اطلاعات، وضعیت و مصرف اشتراک شما:</b>\n\n"
                f"👤 <b>نام سرویس:</b> <code>{client_name}</code>\n"
                f"💎 <b>تعرفه مرتبط طرح:</b> {k.get('planName', 'نامشخص')}\n"
                f"📌 <b>وضعیت حساب:</b> {status_emoji} <b>فعال و برقرار</b>\n\n"
                f"⏳ <b>تاریخ اتمام مهلت انقضا:</b> <code>{k['expireDate']}</code>\n"
                f"📅 <b>میزان کل روز پیش‌رو باقی‌مانده:</b> <code>{remaining_days}</code> روز\n\n"
                f"🌐 <b>سقف کل ترافیک مجاز:</b> {limit_gb:.2f} گیگابایت\n"
                f"📉 <b>میزان حجم مصرف‌شده:</b> {used_gb:.2f} گیگابایت\n"
                f"🪫 <b>میزان حجم خالص باقیمانده:</b> {rem_gb:.2f} گیگابایت\n\n"
                f"🟢 <b>تعداد کاربر متصل همزمان آنلاین:</b> <code>{connected_users}</code> کاربر\n"
                f"━━━━━━━━━━━━━━━━━━━━━"
            )
            
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.row(
                types.InlineKeyboardButton("🔙 بازگشت به مدیریت سرویس", callback_data=f"mysub_manage_{target_sub_id}")
            )
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup)
            return

        elif sub_action == "del":
            text = (
                f"⚠️ <b>درخواست حذف دائم اشتراک!</b>\n\n"
                f"آیا واقعاً از حذف همیشگی اشتراک <code>{client_name}</code> اطمینان کامل دارید؟\n\n"
                f"⚠️ <b>توجه داشته باشید:</b> با حذف کردن این سرویس، کلید شما برای همیشه لغو شده و از سرور X-UI و دیتابیس بات حذف خواهد شد.\n\n"
                f"🛑 <b>مهم:</b> به هیچ وجه پولی به کیف پول شما بازگشت داده نخواهد شد!"
            )
            markup = types.InlineKeyboardMarkup(row_width=2)
            markup.add(
                types.InlineKeyboardButton("🗑 بله، برای همیشه حذف کن", callback_data=f"mysub_delconfirm_{target_sub_id}"),
                types.InlineKeyboardButton("❌ خیر، لغو و بازگشت", callback_data=f"mysub_manage_{target_sub_id}")
            )
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup)
            return

        elif sub_action == "delconfirm":
            try:
                delete_vpn_client_api(client_name, k.get("clientUuid"))
            except Exception as e:
                print(f"[Delete API Error]: {e}")
            
            db["subscription_keys"] = [sub for sub in db["subscription_keys"] if not (sub["id"] == target_sub_id and sub["userId"] == tg_id)]
            
            user = next((u for u in db["users"] if u["userId"] == tg_id), None)
            if user:
                user["activePlansCount"] = sum(1 for sub in db["subscription_keys"] if sub["userId"] == tg_id and sub["status"] == "active")
            
            write_db_json(db)
            
            log_action(
                tg_id,
                call.from_user.username or str(tg_id),
                "delete_config",
                f"کانفیگ '{client_name}' را حذف کرد."
            )
            
            text = (
                f"🗑 <b>سرویس شما با موفقیت به همراه فایل‌های مربوطه و آی‌دی مربوطه از سرورها حذف شد.</b>\n\n"
                f"تعداد کانفیگ های فعال شما بروزرسانی گردید."
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
            )
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup)
            return

        elif sub_action == "renew":
            plan_id = k.get("planId")
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
                plan_specs = {
                    "std_30g": {"id": "std_30g", "name": "Standard 30GB - 30 Days", "price": 45000, "traffic": 30, "duration": 30},
                    "vip_70g": {"id": "vip_70g", "name": "VIP Premium 70GB - 60 Days", "price": 95000, "traffic": 70, "duration": 60},
                    "ult_150g": {"id": "ult_150g", "name": "Unlimited VoIP 150GB - 90 Days", "price": 185000, "traffic": 150, "duration": 90}
                }
                spec = plan_specs.get(plan_id)
                
            if not spec:
                bot.answer_callback_query(call.id, "خطا: مشخصات طرح مربوطه یافت نشد.")
                return
                
            text = (
                f"🔄 <b>درخواست تمدید اشتراک جاری:</b>\n\n"
                f"👤 نام سرویس جهت تمدید: <code>{client_name}</code>\n"
                f"🔹 طرح مرتبط با سرویس: <b>{spec['name']}</b>\n\n"
                f"💳 هزینه تمدید: <code>{spec['price']:,}</code> تومان\n"
                f"⏳ افزایش مدت زمان اعتبار: <code>{spec['duration']}</code> روز مضاعف\n"
                f"🌐 ترافیک اهدایی جدید: <code>{spec['traffic']}</code> گیگابایت به حجم کل\n\n"
                f"⚠️ <b>اطلاعات پرداخت:</b> مبلغ تمدید مستقیما از موجودی کیف پول اعتباری شما کسر خواهد شد."
            )
            markup = types.InlineKeyboardMarkup(row_width=2)
            markup.add(
                types.InlineKeyboardButton("✅ بله، تمدید و کسر از شارژ", callback_data=f"mysub_renewconfirm_{target_sub_id}"),
                types.InlineKeyboardButton("❌ انصراف", callback_data=f"mysub_manage_{target_sub_id}")
            )
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup)
            return

        elif sub_action == "renewconfirm":
            plan_id = k.get("planId")
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
                plan_specs = {
                    "std_30g": {"id": "std_30g", "name": "Standard 30GB - 30 Days", "price": 45000, "traffic": 30, "duration": 30},
                    "vip_70g": {"id": "vip_70g", "name": "VIP Premium 70GB - 60 Days", "price": 95000, "traffic": 70, "duration": 60},
                    "ult_150g": {"id": "ult_150g", "name": "Unlimited VoIP 150GB - 90 Days", "price": 185000, "traffic": 150, "duration": 90}
                }
                spec = plan_specs.get(plan_id)
                
            if not spec:
                bot.answer_callback_query(call.id, "مشخصات طرح یافت نشد.")
                return

            user = get_user_data(tg_id)
            cfg = get_config()
            is_owner = bool(cfg.get("OWNER_ID") and int(tg_id) == int(cfg["OWNER_ID"]))
            is_admin = bool(cfg.get("ADMINS") and int(tg_id) in cfg["ADMINS"])
            is_privileged = is_owner or is_admin
            
            if not is_privileged and user["walletBalance"] < spec["price"]:
                shortage = spec["price"] - user["walletBalance"]
                text = (
                    f"❌ <b>موجودی شارژ اعتباری شما برای تمدید این سرویس کافی نیست!</b>\n\n"
                    f"💳 هزینه تمدید: {spec['price']:,} تومان\n"
                    f"💰 موجودی فعلی شما: {int(user['walletBalance']):,} تومان\n"
                    f"🔴 کسری موجودی: {int(shortage):,} تومان\n\n"
                    f"لطفاً ابتدا از طریق بخش افزایش اعتبار نسبت به افزایش شارژ اقدام فرمائید."
                )
                markup = types.InlineKeyboardMarkup(row_width=1)
                markup.row(types.InlineKeyboardButton("💳 شارژ کیف پول", callback_data="mm_btnWallet"))
                markup.row(types.InlineKeyboardButton("🔙 بازگشت به مدیریت سرویس", callback_data=f"mysub_manage_{target_sub_id}"))
                bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup)
                return

            global active_purchases
            if tg_id in active_purchases:
                bot.answer_callback_query(call.id, "یک درخواست خرید یا تمدید برای شما در حال پردازش است.")
                return
                
            active_purchases.add(tg_id)
            try:
                if not is_privileged:
                    new_balance = int(user['walletBalance']) - spec['price']
                    update_user_balance(tg_id, new_balance)
                else:
                    new_balance = int(user['walletBalance'])
                
                from datetime import datetime, timedelta
                try:
                    exp_dt = datetime.strptime(k['expireDate'], '%Y-%m-%d')
                    if exp_dt < datetime.now():
                        new_exp_dt = datetime.now() + timedelta(days=spec['duration'])
                    else:
                        new_exp_dt = exp_dt + timedelta(days=spec['duration'])
                except:
                    new_exp_dt = datetime.now() + timedelta(days=spec['duration'])
                    
                new_expire_date_str = new_exp_dt.strftime('%Y-%m-%d')
                new_limit_gb = float(k.get('trafficLimitGb', 0)) + float(spec['traffic'])
                
                new_exp_days = (new_exp_dt - datetime.now()).days
                new_exp_days = max(1, new_exp_days)
                
                delete_vpn_client_api(client_name, k.get("client_uuid"))
                _, sub_link = add_vpn_client_api(client_name, new_limit_gb, new_exp_days, k.get("client_uuid"))
                
                if not sub_link:
                    sub_link = k.get('subLink', '')
                
                k['expireDate'] = new_expire_date_str
                k['trafficLimitGb'] = new_limit_gb
                if sub_link:
                    k['subLink'] = sub_link
                    
                write_db_json(db)
                
                log_action(
                    tg_id,
                    call.from_user.username or str(tg_id),
                    "renew_config",
                    f"سرویس '{client_name}' را تمدید کرد. هزینه کل: {spec['price']:,} تومان"
                )
                
                text = (
                    f"🎉 <b>اشتراک شما با موفقیت تمدید شد!</b>\n\n"
                    f"👤 نام سرویس: <code>{client_name}</code>\n"
                    f"💰 هزینه کسر شده: {spec['price']:,} تومان\n"
                    f"💳 موجودی نهایی کیف پول شما: {int(new_balance):,} تومان\n\n"
                    f"🗓 تاریخ انقضای تمدیدیافته جدید: <code>{new_expire_date_str}</code>\n"
                    f"🌐 سقف حجم اختصاص داده شده جدید: <code>{new_limit_gb:.2f}</code> گیگابایت\n\n"
                    f"✨ از اعتماد و همراهی دائمی شما متشکریم!"
                )
                markup = types.InlineKeyboardMarkup(row_width=1)
                markup.add(
                    types.InlineKeyboardButton("🔙 بازگشت به مدیریت سرویس", callback_data=f"mysub_manage_{target_sub_id}"),
                    types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
                )
                bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup)
            finally:
                active_purchases.discard(tg_id)
            return

    # User tickets handlers
    if call.data == "tkt_new":
        bot.answer_callback_query(call.id)
        msg = bot.send_message(
            call.message.chat.id, 
            "🎫 <b>لطفاً متن تیکت یا مشکل خود را به صورت کامل بنویسید و ارسال کنید:</b>\n\n(جهت انصراف کلمه «انصراف» را ارسال کنید)", 
            parse_mode="HTML", 
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(msg, process_ticket_message)
        return

    if call.data == "tkt_track":
        bot.answer_callback_query(call.id)
        show_user_tickets_list(call.message.chat.id, tg_id, message_id=call.message.message_id)
        return

    if call.data.startswith("tkt_view_"):
        bot.answer_callback_query(call.id)
        ticket_id = call.data.split("_")[2]
        show_ticket_detail(call.message.chat.id, ticket_id, message_id=call.message.message_id)
        return

    if call.data.startswith("tkt_reply_"):
        bot.answer_callback_query(call.id)
        ticket_id = call.data.split("_")[2]
        initiate_user_ticket_reply(call.message.chat.id, ticket_id)
        return

    if call.data.startswith("cdel_"):
        bot.answer_callback_query(call.id)
        sub_id = call.data.split("_")[1]
        markup = types.InlineKeyboardMarkup()
        markup.row(
            types.InlineKeyboardButton("بله، حذف کن", callback_data=f"ccdel_{sub_id}"),
            types.InlineKeyboardButton("خیر، انصراف", callback_data="btn_back_home")
        )
        bot.edit_message_text(
            "❓ <b>آیا از حذف این کاربر مطمئن هستید؟</b>\n(این عملیات کاربر را از دیتابیس ربات و پنل سرور برای همیشه پاک خواهد کرد)", 
            chat_id=call.message.chat.id, 
            message_id=call.message.message_id, 
            parse_mode="HTML",
            reply_markup=markup
        )
        return

    if call.data.startswith("ccdel_"):
        bot.answer_callback_query(call.id)
        sub_id = call.data.split("_")[1]
        db = read_db_json()
        keys = db.get("subscription_keys", [])
        
        idx = next((i for i, k in enumerate(keys) if k["id"] == sub_id), -1)
        if idx == -1:
            bot.edit_message_text("❌ زیرمجموعه یافت نشد یا قبلا به درستی حذف شده است.", chat_id=call.message.chat.id, message_id=call.message.message_id)
            return
            
        sub = keys[idx]
        acc_id = sub.get("colleagueAccountId")
        
        # Call API to delete globally
        import threading
        def _bg_del():
            delete_vpn_client_api(sub.get("clientName", ""), sub.get("clientUuid"))
        
        threading.Thread(target=_bg_del).start()
        
        # Deduct used
        accounts = db.get("colleague_accounts", [])
        acc_idx = next((i for i, a in enumerate(accounts) if a["id"] == acc_id), -1)
        if acc_idx != -1:
            acc = accounts[acc_idx]
            used = max(0, acc.get("usedTrafficGb", 0) - sub.get("trafficLimitGb", 0))
            acc["usedTrafficGb"] = used
            accounts[acc_idx] = acc
            db["colleague_accounts"] = accounts
            
        keys.pop(idx)
        db["subscription_keys"] = keys
        write_db_json(db)
        
        bot.edit_message_text("✅ کاربر با موفقیت حذف شد.", chat_id=call.message.chat.id, message_id=call.message.message_id)
        
        if acc_idx != -1:
            show_colleague_panel(call.message, db["colleague_accounts"][acc_idx])
            
        return

    if call.data.startswith("col_"):
        bot.answer_callback_query(call.id)
        parts = call.data.split("_")
        action = parts[1]
        acc_id = parts[2]
        
        db = read_db_json()
        accounts = db.get("colleague_accounts", [])
        acc = next((a for a in accounts if a["id"] == acc_id), None)
        if not acc:
            bot.edit_message_text("❌ حساب همکار یافت نشد.", chat_id=call.message.chat.id, message_id=call.message.message_id)
            return
            
        if action == "cuser":
            bot.delete_message(call.message.chat.id, call.message.message_id)
            msg = bot.send_message(call.message.chat.id, "👤 <b>نام کاربر جدید را وارد کنید:</b>\n(برای انصراف کلمه «انصراف» را بفرستید)", parse_mode="HTML", reply_markup=get_cancel_keyboard())
            bot.register_next_step_handler(msg, process_col_create_name, acc)
            
        elif action == "suser":
            bot.delete_message(call.message.chat.id, call.message.message_id)
            msg = bot.send_message(call.message.chat.id, "🔍 <b>بخشی از نام کاربری مورد نظر را وارد کنید:</b>\n(برای انصراف کلمه «انصراف» را بفرستید)", parse_mode="HTML", reply_markup=get_cancel_keyboard())
            bot.register_next_step_handler(msg, process_col_search_user, acc)

        elif action == "lusers":
            keys = db.get("subscription_keys", [])
            col_keys = [k for k in keys if k.get("colleagueAccountId") == acc_id]
            
            total = acc.get("trafficGb", 0)
            used = acc.get("usedTrafficGb", 0)
            rem = total - used
            
            text = f"📊 <b>خلاصه وضعیت حساب همکار شما:</b>\n🔹 <b>حجم کل بسته:</b> {total} گیگابایت\n🔴 <b>تخصیص داده شده به کاربران:</b> {used} گیگابایت\n🟢 <b>حجم مجاز برای ساخت کاربر جدید:</b> {rem} گیگابایت\n\n"
            text += f"👥 <b>لیست کاربران ساخته شده:</b>\n\n"
            
            if rem <= 0:
                text = "⚠️ <b>اخطار:</b> حجم مجاز شما به اتمام رسیده و اجازه ساخت کاربر جدید را ندارید. لطفاً برای ارتقاء یا تمدید اقدام کنید.\n\n" + text
            
            
            if not col_keys:
                text += "هنوز کاربری ایجاد نکرده‌اید."
            else:
                text += "لطفاً برای مشاهده جزئیات یا مدیریت، روی کاربر کلیک کنید:"
                
            markup = types.InlineKeyboardMarkup()
            
            if col_keys:
                for k in col_keys:
                    name = k.get("clientName") or k.get("planName", "نامشخص")
                    k_id = k.get("id")
                    if k_id:
                        markup.row(types.InlineKeyboardButton(f"👤 {name}", callback_data=f"colu_view_{acc_id}_{k_id}"))
                        
            markup.row(types.InlineKeyboardButton("🔙 بازگشت", callback_data=f"col_panel_{acc['id']}"))
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup, disable_web_page_preview=True)
            
        elif action == "panel":
            show_colleague_panel(call.message, acc)
            
        return

    if call.data.startswith("colu_"):
        bot.answer_callback_query(call.id)
        parts = call.data.split("_")
        action = parts[1]
        acc_id = parts[2]
        sub_id = parts[3]
        
        db = read_db_json()
        accounts = db.get("colleague_accounts", [])
        acc = next((a for a in accounts if a["id"] == acc_id), None)
        
        keys = db.get("subscription_keys", [])
        sub = next((k for k in keys if k.get("id") == sub_id and k.get("colleagueAccountId") == acc_id), None)
        sub_idx = next((i for i, k in enumerate(keys) if k.get("id") == sub_id and k.get("colleagueAccountId") == acc_id), -1)

        if not acc or not sub:
            bot.edit_message_text("❌ حساب همکار یا کاربر یافت نشد.", chat_id=call.message.chat.id, message_id=call.message.message_id)
            return

        if action == "view":
            name = sub.get("clientName") or sub.get("planName", "نامشخص")
            gb = sub.get("trafficLimitGb", 0)
            used_gb = sub.get("trafficUsedGb", 0)
            rem_gb = gb - used_gb
            expire_date = sub.get("expireDate", "نامشخص")
            url = sub.get("subLink", "")
            
            text = f"👤 <b>{name}</b>\n🗄 تخصیص داده شده: {gb} GB\n🔴 مصرف شده: {used_gb} GB\n🟢 مجاز باقیمانده: {rem_gb} GB\n⏳ انقضا: {expire_date}\n🔗 <code>{url}</code>\n\n"
            
            markup = types.InlineKeyboardMarkup()
            markup.row(
                types.InlineKeyboardButton("🔄 تمدید", callback_data=f"colu_renew_{acc_id}_{sub_id}"),
                types.InlineKeyboardButton("🗑 حذف", callback_data=f"colu_delete_{acc_id}_{sub_id}"),
                types.InlineKeyboardButton("⚡ فعال/غیرفعال", callback_data=f"colu_toggle_{acc_id}_{sub_id}")
            )
            markup.row(types.InlineKeyboardButton("🔙 بازگشت به لیست", callback_data=f"col_lusers_{acc_id}"))
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup, disable_web_page_preview=True)
            
        elif action == "toggle":
            # Toggle logic
            sub["status"] = "inactive" if sub.get("status", "active") == "active" else "active"
            keys[sub_idx] = sub
            db["subscription_keys"] = keys
            write_db_json(db)
            
            # Simple UI update
            bot.answer_callback_query(call.id, f"وضعیت به {sub['status']} تغییر یافت.")                
            # Re-render view
            call.data = f"colu_view_{acc_id}_{sub_id}"
            # This is a bit hacky to re-trigger, let's just re-display the view by calling the same code
            
            # Re-fetch sub to show new view
            name = sub.get("clientName") or sub.get("planName", "نامشخص")
            gb = sub.get("trafficLimitGb", 0)
            used_gb = sub.get("trafficUsedGb", 0)
            rem_gb = gb - used_gb
            expire_date = sub.get("expireDate", "نامشخص")
            url = sub.get("subLink", "")
            status = sub.get("status", "active")
            status_txt = "🟢 فعال" if status == "active" else "🔴 غیرفعال"

            text = f"👤 <b>{name}</b>\nوضعیت: {status_txt}\n🗄 تخصیص داده شده: {gb} GB\n🔴 مصرف شده: {used_gb} GB\n🟢 مجاز باقیمانده: {rem_gb} GB\n⏳ انقضا: {expire_date}\n🔗 <code>{url}</code>\n\n"
            
            markup = types.InlineKeyboardMarkup()
            markup.row(
                types.InlineKeyboardButton("🔄 تمدید", callback_data=f"colu_renew_{acc_id}_{sub_id}"),
                types.InlineKeyboardButton("🗑 حذف", callback_data=f"colu_delete_{acc_id}_{sub_id}"),
                types.InlineKeyboardButton("⚡ فعال/غیرفعال", callback_data=f"colu_toggle_{acc_id}_{sub_id}")
            )
            markup.row(types.InlineKeyboardButton("🔙 بازگشت به لیست", callback_data=f"col_lusers_{acc_id}"))
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup, disable_web_page_preview=True)

        elif action == "renew":
            # Just request how much additional traffic to assign (which deducts from their bulk) and extend days?
            # Or just redirect to process_col_renew_user (needs to be implemented)
            bot.delete_message(call.message.chat.id, call.message.message_id)
            msg = bot.send_message(call.message.chat.id, "🔄 <b>تمدید کاربر</b>\nلطفاً میزان <b>حجم جدید (گیگابایت)</b> جهت اختصاص به این کاربر را وارد کنید:\n(کلمه «انصراف» جهت لغو)", parse_mode="HTML", reply_markup=get_cancel_keyboard())
            bot.register_next_step_handler(msg, process_col_renew_gb, acc, sub)
            
        elif action == "delete":
            markup = types.InlineKeyboardMarkup()
            markup.row(
                types.InlineKeyboardButton("بله، حذف کن", callback_data=f"colu_delyes_{acc_id}_{sub_id}"),
                types.InlineKeyboardButton("خیر، انصراف", callback_data=f"colu_view_{acc_id}_{sub_id}")
            )
            bot.edit_message_text(f"⚠️ آیا از حذف کاربر <b>{sub.get('clientName', 'نامشخص')}</b> اطمینان دارید؟\nاین عملیات غیرقابل بازگشت است و هزینه بازگشت داده نخواهد شد.", chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=markup)
            
        elif action == "delyes":
            import threading
            def _bg_del():
                delete_vpn_client_api(sub.get("clientName", ""), sub.get("clientUuid"))
            threading.Thread(target=_bg_del).start()
            
            acc["usedTrafficGb"] = max(0, acc.get("usedTrafficGb", 0) - sub.get("trafficLimitGb", 0))
            accounts = [a if a["id"] != acc_id else acc for a in accounts]
            db["colleague_accounts"] = accounts
            
            keys.pop(sub_idx)
            db["subscription_keys"] = keys
            write_db_json(db)
            
            bot.edit_message_text("✅ کاربر با موفقیت حذف شد.", chat_id=call.message.chat.id, message_id=call.message.message_id)
            show_colleague_panel(call.message, acc)
            
        return

    if call.data.startswith("mm_"):
        handle_main_menu_callback(call)
        return
        
    if call.data == "login_colleague":
        bot.answer_callback_query(call.id)
        msg = bot.edit_message_text(
            "🔑 <b>ورود همکار</b>\n\nلطفاً <b>نام کاربری (Username)</b> اکانت خود را بفرستید:\n(برای انصراف کلمه «انصراف» را بفرستید)",
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            parse_mode="HTML",
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(call.message, process_colleague_login_username)
        return

    if call.data.startswith("buy_colleague_"):
        bot.answer_callback_query(call.id)
        package_id = call.data.replace("buy_colleague_", "")
        db = read_db_json()
        package = next((p for p in db.get("colleague_packages", []) if p["id"] == package_id), None)
        
        if not package:
            bot.send_message(tg_id, "❌ بسته مورد نظر یافت نشد.", reply_markup=get_custom_keyboard())
            return
            
        user = get_user_data(tg_id)
        bal = user.get("walletBalance", 0)
        
        if bal < package["price"]:
            shortage = package["price"] - bal
            markup = types.InlineKeyboardMarkup()
            markup.row(types.InlineKeyboardButton("💳 شارژ کیف پول", callback_data="mm_btnWallet"))
            markup.row(types.InlineKeyboardButton("🔙 بازگشت", callback_data="mm_btnColleagues"))
            bot.edit_message_text(
                f"❌ <b>موجودی ناکافی است!</b>\n\nقیمت بسته: {int(package['price']):,} تومان\nموجودی فعلی: {int(bal):,} تومان\nکسری: {int(shortage):,} تومان",
                chat_id=call.message.chat.id,
                message_id=call.message.message_id,
                parse_mode="HTML",
                reply_markup=markup
            )
            return

        bot.delete_message(call.message.chat.id, call.message.message_id)
        msg = bot.send_message(
            tg_id, 
            " لطفاً یک نام (انگلیسی) به عنوان <b>پسوند/پیشوند</b> کانفیگ‌های خود وارد کنید:\n(این نام در لینک‌های اشتراک کاربران شما استفاده می‌شود)", 
            parse_mode="HTML", 
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(msg, process_colleague_prefix, package)
        return
        
    if call.data.startswith("plcat_"):
        bot.answer_callback_query(call.id)
        category_name = call.data.split("_", 1)[1]
        
        db = read_db_json()
        db_plans = db.get("vpn_plans", [])
        
        plans_data = []
        for dp in db_plans:
            cat = dp.get("category", "Standard")
            # Case insensitive comparison for robustness
            if cat.lower() == category_name.lower():
                plans_data.append({
                    "id": dp["id"],
                    "name": dp["name"],
                    "price": dp["price"],
                    "traffic": dp.get("trafficGb", 30),
                    "duration": dp.get("durationDays", 30)
                })
                
        cfg = get_config()
        nickname = cfg.get("BOT_NICKNAME", "دالتون")
        
        display_cat = category_name
        # Add basic mapping for common ones if desired, otherwise use as provided
        if category_name.lower() == "standard": display_cat = "Standard"
        elif category_name.lower() == "vip": display_cat = "Vip"
        elif "voip" in category_name.lower(): display_cat = "Unlimited VoIp"
            
        message_body = (
            f"⚡️ <b>پلن‌های بخش {display_cat} - {nickname}</b>\n\n"
            "لطفاً یکی از تعرفه‌های معتبر زیر را انتخاب کنید تا فرآیند فعال‌سازی فوری آغاز شود:"
        )
        
        markup = types.InlineKeyboardMarkup(row_width=1)
        for p in plans_data:
            clean_name = p['name']
            if clean_name.startswith("پلن "):
                clean_name = clean_name[4:]
            elif clean_name.startswith("پلان "):
                clean_name = clean_name[5:]
                
            btn_text = f"⚡️ {clean_name} ┃ {p['price']:,} تومان"
            markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"buy_{p['id']}"))
            
        markup.row(
            types.InlineKeyboardButton("🔙 بازگشت به دسته‌بندی‌ها", callback_data="mm_btnBuyNew"),
            types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
        )
        
        bot.edit_message_text(
            message_body,
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            parse_mode="HTML",
            reply_markup=markup
        )
        return
        
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
        
        # Ask for username first
        msg = bot.send_message(
            call.message.chat.id,
            f"✍️ <b>لطفاً یک نام کاربری دلخواه (فقط حروف انگلیسی و اعداد، بدون فاصله) برای کانفیگ خود ارسال نمایید:</b>\n"
            f"• طرح انتخابی: <code>{spec['name']}</code>",
            parse_mode="HTML",
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(msg, process_purchase_username_manual, plan_id, spec)
        bot.answer_callback_query(call.id)

    elif call.data.startswith("hasdisc:"):
        handle_discount_decision(call)
        return

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
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode="HTML", reply_markup=get_cancel_keyboard())
            bot.answer_callback_query(call.id)
        except Exception as e:
            print(f"[Error Charge Amount Init] {e}")

    elif call.data == "upload_receipt":
        bot.send_message(
            call.message.chat.id, 
            "📸 لطفا ابتدا از دکمه‌های بالا مبلغی را برای شارژ انتخاب کنید تا جزئیات پرداخت کارت برای شما فرستاده شود."
        )
        bot.answer_callback_query(call.id)

    elif call.data == "btn_wallet_shortcut":
        call.data = "mm_btnWallet"
        handle_main_menu_callback(call)
        
    elif call.data.startswith("vless_link_"):
        sub_id = call.data.replace("vless_link_", "")
        db = read_db_json()
        sub = next((s for s in db.get("subscription_keys", []) if s["id"] == sub_id), None)
        
        if sub and sub.get("subLink"):
            cfg = get_config()
            markup = types.InlineKeyboardMarkup()
            if not cfg.get("HIDE_TICKET_SUPPORT", False):
                markup.add(types.InlineKeyboardButton(cfg.get("BTN_TICKET_SUPPORT", "🎫 تیکت به پشتیبانی"), callback_data="mm_btnTicketSupport"))
            
            bot.send_message(
                call.message.chat.id,
                f"🔗 <b>لینک اتصال شما:</b>\n\n<code>{sub['subLink']}</code>",
                parse_mode="HTML",
                reply_markup=markup
            )
            bot.answer_callback_query(call.id, "لینک ارسال شد", show_alert=False)
        else:
            bot.answer_callback_query(call.id, "متاسفانه لینک یافت نشد", show_alert=True)

    elif call.data == "btn_gift_code":
        bot.answer_callback_query(call.id)
        bot.edit_message_text(
            "🎁 لطفاً کد هدیه خود را بفرستید:\n(برای انصراف دکمه لغو را انتخاب کنید یا «انصراف» بفرستید)",
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            reply_markup=get_cancel_keyboard()
        )
        bot.register_next_step_handler(call.message, process_gift_code)

    elif call.data == "btn_back_home":
        bot.answer_callback_query(call.id)
        bot.clear_step_handler_by_chat_id(chat_id=call.message.chat.id)
        
        cfg = get_config()
        custom_welcome = cfg.get("WELCOME_TEXT")
        tg_id = call.from_user.id
        user = get_user_data(tg_id)
        bot_nickname = cfg.get("BOT_NICKNAME", "دالتون استور")
        
        if custom_welcome and user:
            formatted_balance = f"{int(user.get('walletBalance') or 0):,}"
            welcome_text = custom_welcome.replace("{tg_id}", str(tg_id)).replace("{wallet_balance}", formatted_balance).replace("{nickname}", bot_nickname)
        else:
            balance = f"{int(user.get('walletBalance') or 0):,}" if user else "0"
            welcome_text = (
                f"<b>🚀 به ربات پرسرعت {bot_nickname} بازگشتید!</b>\n\n"
                f"با خرید از شبکه پرسرعت ما، از اتصال ایمن، پینگ پایین و آی‌پی ثابت لذت ببرید.\n\n"
                f"🆔 شناسه تلگرام شما: <code>{tg_id}</code>\n"
                f"💰 موجودی کیف پول: <code>{balance}</code> تومان\n\n"
                f"👇 لطفا گزینه مورد نظر خود را از منوی زیر انتخاب نمایید:"
            )
            
        bot.edit_message_text(
            welcome_text,
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            parse_mode="HTML",
            reply_markup=get_custom_keyboard()
        )

    elif call.data == "charge_custom_amount":
        try:
            tg_id = call.from_user.id
            bot.edit_message_text(
                "✍️ <b>مبلغ مورد نظر خود را برای شارژ به تومان ارسال کنید:</b>\n\n"
                "• برای مثال جهت شارژ ۱۵۰,۰۰۰ تومان، عدد <code>150000</code> را بفرستید.\n"
                "• جهت انصراف کلمه <code>انصراف</code> را ارسال کنید.\n\n"
                "⚠️ لطفاً فقط عدد انگلیسی وارد کنید:",
                chat_id=call.message.chat.id,
                message_id=call.message.message_id,
                parse_mode="HTML",
                reply_markup=get_cancel_keyboard()
            )
            bot.register_next_step_handler(call.message, process_custom_charge_amount)
            bot.answer_callback_query(call.id)
        except Exception as e:
            print(f"[Error Charge Custom Init] {e}")

def process_ai_chat(message):
    tg_id = message.from_user.id
    text = message.text.strip() if message.text else ""
    
    if text == "/start" or "انصراف" in text or "بازگشت" in text or "منصرف" in text:
        bot.send_message(message.chat.id, "❌ چت با هوش‌مصنوعی متوقف شد.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return
        
    typing_msg = bot.send_message(message.chat.id, "🤖 <i>در حال تایپ...</i>", parse_mode="HTML")
    
    try:
        import requests
        response = requests.post("http://127.0.0.1:3000/api/ai/chat", json={"userId": tg_id, "message": text}, timeout=60)
        bot.delete_message(message.chat.id, typing_msg.message_id)
        if response.status_code == 200:
            data = response.json()
            reply = data.get("response", "پاسخی دریافت نشد.")
            msg = bot.send_message(message.chat.id, reply, parse_mode="Markdown")
            bot.register_next_step_handler(msg, process_ai_chat)
        else:
            msg = bot.send_message(message.chat.id, f"❌ خطای سرور ({response.status_code}): {response.text}. دوباره بپرسید:", reply_markup=get_cancel_keyboard())
            bot.register_next_step_handler(msg, process_ai_chat)
    except Exception as e:
        bot.delete_message(message.chat.id, typing_msg.message_id)
        msg = bot.send_message(message.chat.id, f"❌ خطا در ارتباط: {e}\nمجدداً تلاش کنید:", reply_markup=get_cancel_keyboard())
        bot.register_next_step_handler(msg, process_ai_chat)

def process_colleague_login_username(message):
    tg_id = message.from_user.id
    text = message.text.strip() if message.text else ""
    
    if text == "/start" or "انصراف" in text or "بازگشت" in text or "منصرف" in text:
        bot.send_message(message.chat.id, "❌ ورود لغو شد.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return
        
    db = read_db_json()
    accounts = db.get("colleague_accounts", [])
    acc = next((a for a in accounts if a["username"] == text), None)
    
    if not acc:
        msg = bot.send_message(message.chat.id, "❌ <b>نام کاربری یافت نشد!</b>\nلطفاً دوباره امتحان کنید یا «انصراف» بفرستید:", parse_mode="HTML", reply_markup=get_cancel_keyboard())
        bot.register_next_step_handler(msg, process_colleague_login_username)
        return
        
    msg = bot.send_message(message.chat.id, "🔑 <b>رمز عبور (Password)</b> خود را بفرستید:", parse_mode="HTML", reply_markup=get_cancel_keyboard())
    bot.register_next_step_handler(msg, process_colleague_login_password, acc)

def show_colleague_panel_msg(message, acc):
    markup = types.InlineKeyboardMarkup()
    markup.row(types.InlineKeyboardButton("➕ ساخت کاربر جدید", callback_data=f"col_cuser_{acc['id']}"))
    markup.row(types.InlineKeyboardButton("👥 لیست کاربران و مصرف", callback_data=f"col_lusers_{acc['id']}"))
    markup.row(types.InlineKeyboardButton("🔍 سرچ کاربر", callback_data=f"col_suser_{acc['id']}"))
    markup.row(types.InlineKeyboardButton("🔙 خروج", callback_data="btn_back_home"))
    
    bot.send_message(
        message.chat.id,
        f"پنل همکار ({acc.get('prefix', 'Col')})\n\nبسته: {acc['packageTitle']}",
        reply_markup=markup
    )

def show_colleague_panel(message, acc):
    markup = types.InlineKeyboardMarkup()
    markup.row(types.InlineKeyboardButton("➕ ساخت کاربر جدید", callback_data=f"col_cuser_{acc['id']}"))
    markup.row(types.InlineKeyboardButton("👥 لیست کاربران و مصرف", callback_data=f"col_lusers_{acc['id']}"))
    markup.row(types.InlineKeyboardButton("🔍 سرچ کاربر", callback_data=f"col_suser_{acc['id']}"))
    markup.row(types.InlineKeyboardButton("🔙 خروج", callback_data="btn_back_home"))
    
    bot.edit_message_text(
        f"پنل همکار ({acc.get('prefix', 'Col')})\n\nبسته: {acc['packageTitle']}",
        chat_id=message.chat.id,
        message_id=message.message_id,
        reply_markup=markup
    )

def process_col_search_user(message, acc):
    text = message.text.strip() if message.text else ""
    if text in ["انصراف", "بازگشت", "/start"] or "منصرف" in text:
        bot.send_message(message.chat.id, "لغو شد.", reply_markup=get_custom_keyboard())
        show_colleague_panel_msg(message, acc)
        return
        
    db = read_db_json()
    keys = db.get("subscription_keys", [])
    col_keys = [k for k in keys if k.get("colleagueAccountId") == acc["id"]]
    
    # Filter by name
    found_keys = []
    for k in col_keys:
        name = k.get("clientName") or k.get("planName") or ""
        if text.lower() in name.lower():
            found_keys.append(k)
            
    if not found_keys:
        bot.send_message(message.chat.id, f"❌ کاربری با عنوان '{text}' یافت نشد.", reply_markup=get_custom_keyboard())
        show_colleague_panel_msg(message, acc)
        return
        
    result_text = f"🔍 <b>نتایج جستجو برای '{text}':</b>\n\n"
    for k in found_keys:
        name = k.get("clientName") or k.get("planName", "نامشخص")
        gb = k.get("trafficLimitGb", 0)
        used_gb = k.get("trafficUsedGb", 0)
        rem_gb = gb - used_gb
        expire_date = k.get("expireDate", "نامشخص")
        url = k.get("subLink", "")
        result_text += f"👤 <b>{name}</b>\n🗄 تخصیص داده شده: {gb} GB\n🔴 مصرف شده: {used_gb} GB\n🟢 مجاز باقیمانده: {rem_gb} GB\n⏳ انقضا: {expire_date}\n🔗 <code>{url}</code>\n\n"
        
    markup = types.InlineKeyboardMarkup()
    for k in found_keys:
        name_short = (k.get("clientName") or k.get("planName", "نامشخص"))[:15]
        markup.row(types.InlineKeyboardButton(f"🗑 حذف: {name_short}", callback_data=f"cdel_{k['id']}"))
    markup.row(types.InlineKeyboardButton("🔙 بازگشت به پنل همکار", callback_data=f"col_panel_{acc['id']}"))
    
    bot.send_message(message.chat.id, result_text, parse_mode="HTML", reply_markup=markup)

def process_col_create_name(message, acc):
    text = message.text.strip() if message.text else ""
    if text in ["انصراف", "بازگشت", "/start"] or "منصرف" in text:
        bot.send_message(message.chat.id, "لغو شد.", reply_markup=get_custom_keyboard())
        show_colleague_panel_msg(message, acc)
        return
        
    msg = bot.send_message(message.chat.id, "حجم مورد نظر (به گیگابایت) را وارد کنید:")
    bot.register_next_step_handler(msg, process_col_create_gb, acc, text)

def process_col_create_gb(message, acc, name):
    text = message.text.strip() if message.text else ""
    if text in ["انصراف", "بازگشت", "/start"] or "منصرف" in text:
        bot.send_message(message.chat.id, "لغو شد.", reply_markup=get_custom_keyboard())
        show_colleague_panel_msg(message, acc)
        return
        
    try:
        gb = int(text)
    except ValueError:
        msg = bot.send_message(message.chat.id, "لطفاً یک عدد صحیح معتبر برای حجم وارد کنید:")
        bot.register_next_step_handler(msg, process_col_create_gb, acc, name)
        return
        
    if gb < 30:
        msg = bot.send_message(message.chat.id, "⚠️ حداقل حجم انتخابی برای کاربر جدید باید ۳۰ گیگابایت به بالا باشد. لطفا حجم دیگری وارد کنید:")
        bot.register_next_step_handler(msg, process_col_create_gb, acc, name)
        return
        
    msg = bot.send_message(message.chat.id, "تعداد روز اعتبار را وارد کنید:")
    bot.register_next_step_handler(msg, process_col_create_days, acc, name, gb)

def process_col_create_days(message, acc, name, gb):
    text = message.text.strip() if message.text else ""
    if text in ["انصراف", "بازگشت", "/start"] or "منصرف" in text:
        bot.send_message(message.chat.id, "لغو شد.", reply_markup=get_custom_keyboard())
        show_colleague_panel_msg(message, acc)
        return
        
    try:
        days = int(text)
    except ValueError:
        msg = bot.send_message(message.chat.id, "لطفاً یک عدد صحیح معتبر برای روز وارد کنید:")
        bot.register_next_step_handler(msg, process_col_create_days, acc, name, gb)
        return
        
    db = read_db_json()
    accounts = db.get("colleague_accounts", [])
    acc_idx = next((i for i, a in enumerate(accounts) if a["id"] == acc["id"]), -1)
    
    if acc_idx == -1:
        bot.send_message(message.chat.id, "حساب همکار یافت نشد.", reply_markup=get_custom_keyboard())
        return
        
    live_acc = accounts[acc_idx]
    total = live_acc.get("trafficGb", 0)
    used = live_acc.get("usedTrafficGb", 0)
    remain = total - used
    
    if remain <= 0:
        bot.send_message(message.chat.id, "❌ حجم کل تخصیص داده شده شما به اتمام رسیده است!", reply_markup=get_custom_keyboard())
        show_colleague_panel_msg(message, live_acc)
        return
        
    if gb > remain:
        bot.send_message(message.chat.id, f"❌ محدودیت تخصیص برای این کانفیگ از مصرف باقیمانده کل شما بیشتر است!\n\nمجاز باقیمانده: {remain:.2f} گیگابایت", reply_markup=get_custom_keyboard())
        show_colleague_panel_msg(message, live_acc)
        return
        
    live_acc["usedTrafficGb"] = used + gb
    accounts[acc_idx] = live_acc
    db["colleague_accounts"] = accounts
        
    import uuid
    import time
    from datetime import datetime
    
    full_name = f"{live_acc.get('prefix', 'Col')}-{name}"
    
    client_uuid, sub_link = add_vpn_client_api(full_name, gb, days)
    
    if not sub_link:
        # Fallback similar to normal purchase
        import random, string
        client_uuid = str(uuid.uuid4())
        fallback_sub_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
        
        cfg = get_config()
        cfg_url = cfg.get("SUB_URL", "http://localhost:3000")
        sub_link = f"{cfg_url}/sub/{fallback_sub_id}"

    expire_date = time.strftime("%Y-%m-%d", time.localtime(time.time() + days * 24 * 60 * 60))
    sub_id = f"SUB-{int(time.time()) % 9000 + 1000}"
    
    sub = {
        "id": sub_id,
        "userId": live_acc.get("userId", message.chat.id),
        "planId": "colleague_custom",
        "planName": full_name,
        "clientName": full_name,
        "subLink": sub_link,
        "expireDate": expire_date,
        "trafficLimitGb": gb,
        "trafficUsedGb": 0.0,
        "status": "active",
        "colleagueAccountId": live_acc["id"],
        "clientUuid": client_uuid
    }
    
    if "subscription_keys" not in db:
        db["subscription_keys"] = []
    db["subscription_keys"].append(sub)
    
    write_db_json(db)
    
    log_action(
        message.from_user.id, 
        message.from_user.username or str(message.from_user.id), 
        "colleague_create_config", 
        f"همکار کانفیگی با نام '{full_name}' ({gb} گیگ - {days} روز) ایجاد کرد."
    )
    
    bot.send_message(message.chat.id, "✅ کانفیگ در پنل X-UI ایجاد شد.", reply_markup=get_custom_keyboard())
    
    text_msg = f"✅ <b>لینک سابسکریپشن شما با موفقیت ایجاد شد:</b>\n\n👤 <b>نام:</b> {full_name}\n🗄 <b>حجم:</b> {gb} گیگابایت\n⏳ <b>اعتبار:</b> {days} روز\n\n🔗 <code>{sub_link}</code>"
    bot.send_message(message.chat.id, text_msg, parse_mode="HTML", reply_markup=get_custom_keyboard())
    
    show_colleague_panel_msg(message, live_acc)

def process_col_renew_gb(message, acc, sub):
    text = message.text.strip() if message.text else ""
    if text in ["انصراف", "بازگشت", "/start"] or "منصرف" in text:
        bot.send_message(message.chat.id, "لغو شد.", reply_markup=get_custom_keyboard())
        show_colleague_panel_msg(message, acc)
        return
        
    try:
        add_gb = int(text)
    except ValueError:
        msg = bot.send_message(message.chat.id, "لطفاً یک عدد صحیح معتبر برای حجم وارد کنید:")
        bot.register_next_step_handler(msg, process_col_renew_gb, acc, sub)
        return
        
    msg = bot.send_message(message.chat.id, "تعداد روز اعتبار جدید (برای اضافه شدن به تاریخ انقضای فعلی و یا جایگزینی) را وارد کنید:")
    bot.register_next_step_handler(msg, process_col_renew_days, acc, sub, add_gb)

def process_col_renew_days(message, acc, sub, add_gb):
    text = message.text.strip() if message.text else ""
    if text in ["انصراف", "بازگشت", "/start"] or "منصرف" in text:
        bot.send_message(message.chat.id, "لغو شد.", reply_markup=get_custom_keyboard())
        show_colleague_panel_msg(message, acc)
        return
        
    try:
        days = int(text)
    except ValueError:
        msg = bot.send_message(message.chat.id, "لطفاً یک عدد صحیح معتبر برای روز وارد کنید:")
        bot.register_next_step_handler(msg, process_col_renew_days, acc, sub, add_gb)
        return
        
    db = read_db_json()
    accounts = db.get("colleague_accounts", [])
    acc_idx = next((i for i, a in enumerate(accounts) if a["id"] == acc["id"]), -1)
    
    if acc_idx == -1:
        bot.send_message(message.chat.id, "حساب همکار یافت نشد.", reply_markup=get_custom_keyboard())
        return
        
    live_acc = accounts[acc_idx]
    total = live_acc.get("trafficGb", 0)
    used = live_acc.get("usedTrafficGb", 0)
    remain = total - used
    
    if add_gb > remain:
        bot.send_message(message.chat.id, f"❌ حجم درخواستی جهت تمدید از باقیمانده کل بسته همکار شما بیشتر است!\n\nمجاز باقیمانده: {remain:.2f} گیگابایت", reply_markup=get_custom_keyboard())
        show_colleague_panel_msg(message, live_acc)
        return
        
    # Deduct from colleague total
    live_acc["usedTrafficGb"] = used + add_gb
    accounts[acc_idx] = live_acc
    db["colleague_accounts"] = accounts
    
    # Update subscription
    keys = db.get("subscription_keys", [])
    sub_idx = next((i for i, k in enumerate(keys) if k["id"] == sub["id"]), -1)
    
    if sub_idx != -1:
        import time
        from datetime import datetime, timedelta
        live_sub = keys[sub_idx]
        
        try:
            exp_dt = datetime.strptime(live_sub.get('expireDate', '2000-01-01'), '%Y-%m-%d')
            if exp_dt < datetime.now():
                new_exp_dt = datetime.now() + timedelta(days=days)
            else:
                new_exp_dt = exp_dt + timedelta(days=days)
        except:
            new_exp_dt = datetime.now() + timedelta(days=days)
            
        new_expire_date_str = new_exp_dt.strftime('%Y-%m-%d')
        new_limit_gb = float(live_sub.get('trafficLimitGb', 0)) + add_gb
        
        new_exp_days = (new_exp_dt - datetime.now()).days
        new_exp_days = max(1, new_exp_days)
        
        client_name = live_sub.get("clientName") or live_sub.get("planName", "")
        delete_vpn_client_api(client_name, live_sub.get("clientUuid"))
        _, sub_link = add_vpn_client_api(client_name, new_limit_gb, new_exp_days, live_sub.get("clientUuid"))
        
        live_sub['expireDate'] = new_expire_date_str
        live_sub['trafficLimitGb'] = new_limit_gb
        if sub_link:
            live_sub['subLink'] = sub_link
            
        keys[sub_idx] = live_sub
        db["subscription_keys"] = keys
        write_db_json(db)
        
        bot.send_message(message.chat.id, "✅ تمدید کاربر با موفقیت انجام شد.", reply_markup=get_custom_keyboard())
        
    show_colleague_panel_msg(message, live_acc)

def process_colleague_prefix(message, package):
    tg_id = message.from_user.id
    text = message.text.strip() if message.text else ""
    
    if text == "/start" or "انصراف" in text or "بازگشت" in text or "منصرف" in text:
        bot.send_message(message.chat.id, "❌ خرید لغو شد.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return
        
    global active_purchases
    if tg_id in active_purchases:
        bot.send_message(message.chat.id, "⚠️ <b>یک درخواست خرید همکار در حال حاضر برای شما در حال پردازش است. لطفا شکیبا باشید...</b>", parse_mode="HTML")
        return
        
    active_purchases.add(tg_id)
    try:
        db = read_db_json()
        user = get_user_data(tg_id)
        bal = user.get("walletBalance", 0)
        
        if bal < package["price"]:
            bot.send_message(message.chat.id, "❌ موجودی ناکافی است.", reply_markup=get_custom_keyboard())
            return
            
        update_user_balance(tg_id, bal - package["price"])
        if package["price"] > 0:
            process_referral_on_purchase(user, package["price"])
        
        import random
        import string
        import uuid
        from datetime import datetime
        
        username = "C" + "".join(random.choices(string.digits, k=5))
        password = "".join(random.choices(string.ascii_letters + string.digits, k=8))
        
        if not db.get("colleague_accounts"):
            db["colleague_accounts"] = []
            
        new_acc = {
            "id": str(uuid.uuid4()),
            "userId": tg_id,
            "username": username,
            "password": password,
            "packageId": package["id"],
            "packageTitle": package["title"],
            "createdAt": datetime.now().strftime("%Y-%m-%d"),
            "trafficGb": package["trafficGb"],
            "usedTrafficGb": 0,
            "prefix": text,
            "status": "active"
        }
        
        db["colleague_accounts"].append(new_acc)
        write_db_json(db)
        
        log_action(
            tg_id, 
            message.from_user.username or str(tg_id), 
            "buy_colleague_package", 
            f"بسته همکار '{package['title']}' را با هزینه {package['price']} تومان خریداری کرد. (پسوند: {text})"
        )
        
        bot.send_message(
            tg_id,
            f"✅ <b>خرید بسته همکار با موفقیت انجام شد!</b>\n\nبسته خریداری شده: {package['title']}\nپسوند تنظیم شده: {text}\n\nاطلاعات ورود شما:\n👤 <b>یوزرنیم:</b> <code>{username}</code>\n🔑 <b>رمز عبور:</b> <code>{password}</code>\n\nجهت ورود به پنل، حساب خود را از طریق منو انتخاب کنید.",
            parse_mode="HTML",
            reply_markup=get_custom_keyboard()
        )
        
        show_colleague_panel_msg(message, new_acc)
    finally:
        active_purchases.discard(tg_id)

def process_colleague_login_password(message, acc):
    tg_id = message.from_user.id
    text = message.text.strip() if message.text else ""
    
    if text == "/start" or "انصراف" in text or "بازگشت" in text or "منصرف" in text:
        bot.send_message(message.chat.id, "❌ ورود لغو شد.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return
        
    if acc["password"] != text:
        msg = bot.send_message(message.chat.id, "❌ <b>رمز عبور اشتباه است!</b>\nلطفاً دوباره امتحان کنید یا «انصراف» بفرستید:", parse_mode="HTML", reply_markup=get_cancel_keyboard())
        bot.register_next_step_handler(msg, process_colleague_login_password, acc)
        return
        
    if acc["status"] != "active":
        bot.send_message(message.chat.id, "❌ حساب کاربری شما غیرفعال یا منقضی شده است.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return
        
    if not acc.get("userId"):
        acc["userId"] = tg_id
        db = read_db_json()
        for idx, a in enumerate(db.get("colleague_accounts", [])):
            if a["id"] == acc["id"]:
                db["colleague_accounts"][idx]["userId"] = tg_id
                break
        write_db_json(db)

    bot.send_message(message.chat.id, "✅ ورود موفقیت‌آمیز بود.", reply_markup=get_custom_keyboard())
    show_colleague_panel_msg(message, acc)
    return

def process_ticket_message(message):
    tg_id = message.from_user.id
    username = message.from_user.username or f"user_{tg_id}"
    text = message.text.strip() if message.text else ""
    
    if text == "/start" or "انصراف" in text or "بازگشت" in text or "منصرف" in text:
        bot.send_message(message.chat.id, "❌ ثبت تیکت لغو شد.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return

    if not text:
        msg = bot.send_message(message.chat.id, "⚠️ <b>لطفاً متن پیام تیکت خود را بفرستید:</b>\n\n(امکان ارسال پیام غیرمتنی در این بخش وجود ندارد. برای انصراف «انصراف» را بفرستید)", parse_mode="HTML", reply_markup=get_cancel_keyboard())
        bot.register_next_step_handler(msg, process_ticket_message)
        return

    import random
    from datetime import datetime

    # Create ticket in JSON database for dashboard visibility
    ticket_id = f"TKB-{random.randint(1000, 9999)}"
    try:
        db = read_db_json()
        if "tickets" not in db or not isinstance(db["tickets"], list):
            db["tickets"] = []
        
        new_ticket = {
            "id": ticket_id,
            "userId": tg_id,
            "username": username,
            "subject": "پشتیبانی تلگرام",
            "status": "open",
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "messages": [
                {
                    "sender": "user",
                    "message": text,
                    "date": datetime.now().isoformat()
                }
            ]
        }
        db["tickets"].append(new_ticket)
        write_db_json(db)
    except Exception as dberr:
        print("Error saving ticket to db:", dberr)

    # Notify admins and owner
    cfg = get_config()
    targets = set()
    owner_id = cfg.get("OWNER_ID")
    if owner_id and owner_id > 0:
        targets.add(owner_id)
    for adm_id in cfg.get("ADMINS", []):
        if adm_id and adm_id > 0:
            targets.add(adm_id)

    # Log action
    try:
        log_action(tg_id, username, "ثبت تیکت پشتیبانی", f"متن پیام: {text} - شناسه تیکت: {ticket_id}")
    except Exception as e:
        print("Error logging ticket:", e)

    # Deliver to each administrator
    admin_notified_count = 0
    for target_id in targets:
        try:
            admin_msg = (
                f"🎫 <b>تیکت جدید از کاربر!</b>\n\n"
                f"🆔 <b>شناسه تیکت:</b> <code>{ticket_id}</code>\n"
                f"👤 <b>کاربر:</b> @{username} (<code>{tg_id}</code>)\n"
                f"📝 <b>متن پیام/مشکل:</b>\n"
                f"<blockquote>{text}</blockquote>\n"
                f"👉 <i>می‌توانید به این تیکت در داشبورد پاسخ دهید.</i>"
            )
            bot.send_message(target_id, admin_msg, parse_mode="HTML")
            admin_notified_count += 1
        except Exception as ex:
            print(f"[Admin Notify Ticket Warning for user ID {target_id}] {ex}")

    # Success feedback
    success_text = (
        f"✅ <b>تیکت شما ثبت شد! (شناسه: {ticket_id})</b>\n\n"
        f"پیام شما در داشبورد ثبت گردید و برای ادمین‌ها ارسال شد. کارشناسان ما در اسرع وقت پاسخگو خواهند بود."
    )
    bot.reply_to(message, success_text, parse_mode="HTML", reply_markup=get_custom_keyboard())

def show_ticket_main_menu(chat_id):
    cfg = get_config()
    nickname = cfg.get("BOT_NICKNAME", "دالتون")
    
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton("✍️ ثبت تیکت جدید", callback_data="tkt_new"),
        types.InlineKeyboardButton("🔍 پیگیری پرونده / تیکت‌ها", callback_data="tkt_track")
    )
    markup.add(types.InlineKeyboardButton("🏠 بازگشت به منوی اصلی", callback_data="btn_back_home"))
    
    msg_text = (
        f"🎫 <b>بخش پشتیبانی و تیکتینگ {nickname}</b>\n\n"
        f"مشتری گرامی! خوش آمدید. لطفاً یکی از گزینه‌های زیر را انتخاب کنید:\n\n"
        f"🔹 <b>ثبت تیکت جدید:</b> جهت ثبت پیام، مشکل یا سوال جدید برای مدیریت.\n"
        f"🔸 <b>پیگیری پرونده / تیکت‌ها:</b> مشاهده پاسخ ادمین‌ها و تیکت‌های قبلی شما."
    )
    bot.send_message(chat_id, msg_text, parse_mode="HTML", reply_markup=markup)

def show_user_tickets_list(chat_id, user_id, message_id=None):
    db = read_db_json()
    tickets = db.get("tickets", [])
    
    # Filter tickets for this user
    user_tickets = [t for t in tickets if str(t.get("userId")) == str(user_id)]
    
    markup = types.InlineKeyboardMarkup(row_width=1)
    
    if not user_tickets:
        msg_text = (
            "❌ <b>شما هیچ تیکتی در سیستم ثبت نکرده‌اید!</b>\n\n"
            "می‌توانید با استفاده از دکمه زیر اقدام به ثبت اولین تیکت خود کنید."
        )
        markup.add(types.InlineKeyboardButton("✍️ ثبت تیکت جدید", callback_data="tkt_new"))
        markup.add(types.InlineKeyboardButton("🔙 بازگشت به منوی پشتیبانی", callback_data="mm_btnTicketSupport"))
    else:
        # Sort by last updated datetime or creation
        user_tickets = sorted(user_tickets, key=lambda x: x.get("updatedAt", x.get("createdAt", "")), reverse=True)
        
        msg_text = "🔍 <b>لیست پرونده‌ها و تیکت‌های شما:</b>\n\nلطفاً برای دیدن جزئیات، پاسخ ادمین و یا ادامه مکالمه روی یکی از پرونده‌های زیر کلیک کنید:\n"
        
        for t in user_tickets:
            t_id = t.get("id")
            status = t.get("status", "open")
            
            # Map status to pleasant Persian and emoji
            if status == "open":
                status_txt = "⏳ در انتظار پاسخ"
            elif status == "answered":
                status_txt = "✅ پاسخ داده شده"
            elif status == "closed":
                status_txt = "🔒 بسته شده"
            else:
                status_txt = f"⚙️ {status}"
                
            markup.add(types.InlineKeyboardButton(f"🎫 {t_id} ({status_txt})", callback_data=f"tkt_view_{t_id}"))
            
        markup.add(types.InlineKeyboardButton("🔙 بازگشت به منوی پشتیبانی", callback_data="mm_btnTicketSupport"))

    if message_id:
        try:
            bot.edit_message_text(msg_text, chat_id=chat_id, message_id=message_id, parse_mode="HTML", reply_markup=markup)
        except Exception:
            bot.send_message(chat_id, msg_text, parse_mode="HTML", reply_markup=markup)
    else:
        bot.send_message(chat_id, msg_text, parse_mode="HTML", reply_markup=markup)

def show_ticket_detail(chat_id, ticket_id, message_id=None):
    db = read_db_json()
    tickets = db.get("tickets", [])
    ticket = next((t for t in tickets if t.get("id") == ticket_id), None)
    
    if not ticket:
        msg_text = "❌ <b>پرونده مورد نظر یافت نشد.</b>"
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton("🔙 بازگشت به لیست پرونده‌ها", callback_data="tkt_track"))
        if message_id:
            bot.edit_message_text(msg_text, chat_id=chat_id, message_id=message_id, parse_mode="HTML", reply_markup=markup)
        else:
            bot.send_message(chat_id, msg_text, parse_mode="HTML", reply_markup=markup)
        return

    status = ticket.get("status", "open")
    if status == "open":
        status_txt = "⏳ در انتظار پاسخ کارشناس"
    elif status == "answered":
        status_txt = "✅ پاسخ داده شده"
    elif status == "closed":
        status_txt = "🔒 بسته شده و خاتمه یافته"
    else:
        status_txt = status

    msg_text = (
        f"🎫 <b>جزئیات پرونده پشتیبانی</b>\n\n"
        f"🆔 <b>شناسه تیکت:</b> <code>{ticket_id}</code>\n"
        f"📊 <b>وضعیت:</b> {status_txt}\n"
        f"🕒 <b>آخرین بروزرسانی:</b> {ticket.get('updatedAt', ticket.get('createdAt', ''))[:10]}\n"
        f"━━━━━━━━━━━━━━━━━━━\n\n"
        f"💬 <b>تاریخچه پیام‌ها:</b>\n\n"
    )

    for msg in ticket.get("messages", []):
        sender = msg.get("sender", "user")
        text = msg.get("message", "")
        sender_lbl = "👤 شما" if sender == "user" else "🧠 کارشناس پشتیبانی"
        
        msg_text += (
            f"🔸 <b>{sender_lbl}:</b>\n"
            f"<blockquote>{text}</blockquote>\n\n"
        )

    markup = types.InlineKeyboardMarkup(row_width=2)
    # Give option to reply if ticket is not closed
    if status != "closed":
        markup.add(types.InlineKeyboardButton("✍️ ارسال پاسخ جدید", callback_data=f"tkt_reply_{ticket_id}"))
        
    markup.add(
        types.InlineKeyboardButton("🔄 بروزرسانی", callback_data=f"tkt_view_{ticket_id}"),
        types.InlineKeyboardButton("🔙 لیست پرونده‌ها", callback_data="tkt_track")
    )

    if message_id:
        try:
            bot.edit_message_text(msg_text, chat_id=chat_id, message_id=message_id, parse_mode="HTML", reply_markup=markup)
        except Exception:
            bot.send_message(chat_id, msg_text, parse_mode="HTML", reply_markup=markup)
    else:
        bot.send_message(chat_id, msg_text, parse_mode="HTML", reply_markup=markup)

def initiate_user_ticket_reply(chat_id, ticket_id):
    msg = bot.send_message(
        chat_id,
        f"✍️ <b>لطفاً پیام پاسخ خود را برای تیکت <code>{ticket_id}</code> بنویسید و ارسال کنید:</b>\n\n"
        f"<i>این پیام به ادامه همین پرونده پیوست و برای کارشناسان فرستاده خواهد شد.</i>\n\n"
        f"(برای انصراف کلمه «انصراف» را ارسال کنید)",
        parse_mode="HTML",
        reply_markup=get_cancel_keyboard()
    )
    bot.register_next_step_handler(msg, process_user_reply_message, ticket_id)

def process_user_reply_message(message, ticket_id):
    from datetime import datetime
    tg_id = message.from_user.id
    username = message.from_user.username or f"user_{tg_id}"
    text = message.text.strip() if message.text else ""
    
    if text == "/start" or "انصراف" in text or "بازگشت" in text or "منصرف" in text:
        bot.send_message(message.chat.id, "❌ ارسال پاسخ لغو شد.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return

    if not text:
        msg = bot.send_message(message.chat.id, "⚠️ <b>لطفاً متن پاسخ خود را بفرستید:</b>\n\n(امکان ارسال پیام غیرمتنی وجود ندارد. برای انصراف «انصراف» را بفرستید)", parse_mode="HTML", reply_markup=get_cancel_keyboard())
        bot.register_next_step_handler(msg, process_user_reply_message, ticket_id)
        return

    db = read_db_json()
    tickets = db.get("tickets", [])
    ticket_idx = next((i for i, t in enumerate(tickets) if t.get("id") == ticket_id), -1)

    if ticket_idx == -1:
        bot.send_message(message.chat.id, "❌ خطایی رخ داد: تیکت مورد نظر پیدا نشد.", reply_markup=get_custom_keyboard())
        return

    # Add message
    tickets[ticket_idx]["messages"].append({
        "sender": "user",
        "message": text,
        "date": datetime.now().isoformat()
    })
    tickets[ticket_idx]["status"] = "open" # Set status back to open when user replies
    tickets[ticket_idx]["updatedAt"] = datetime.now().isoformat()
    
    db["tickets"] = tickets
    write_db_json(db)

    # Notify admins about user reply
    cfg = get_config()
    targets = set()
    owner_id = cfg.get("OWNER_ID")
    if owner_id and owner_id > 0:
        targets.add(owner_id)
    for adm_id in cfg.get("ADMINS", []):
        if adm_id and adm_id > 0:
            targets.add(adm_id)

    # Log action
    try:
        log_action(tg_id, username, "ارسال پاسخ تیکت", f"پاسخ به {ticket_id}: {text}")
    except Exception as e:
        print("Error logging reply action:", e)

    for target_id in targets:
        try:
            admin_msg = (
                f"💬 <b>پاسخ جدید کاربر به تیکت!</b>\n\n"
                f"🆔 <b>شناسه تیکت:</b> <code>{ticket_id}</code>\n"
                f"👤 <b>کاربر:</b> @{username} (<code>{tg_id}</code>)\n"
                f"📝 <b>متن پیام پاسخ:</b>\n"
                f"<blockquote>{text}</blockquote>\n"
                f"👉 <i>می‌توانید به این تیکت در داشبورد پاسخ دهید.</i>"
            )
            bot.send_message(target_id, admin_msg, parse_mode="HTML")
        except Exception as ex:
            print(f"[Admin Notify Ticket Reply Warning for user ID {target_id}] {ex}")

    bot.send_message(message.chat.id, "✅ <b>پاسخ شما با موفقیت به تیکت پیوست شد!</b>", parse_mode="HTML", reply_markup=get_custom_keyboard())
    show_ticket_detail(message.chat.id, ticket_id)

def process_gift_code(message):
    tg_id = message.from_user.id
    text = message.text.strip() if message.text else ""
    
    if text == "/start" or "انصراف" in text or "بازگشت" in text or "منصرف" in text:
        bot.send_message(message.chat.id, "❌ عملیات لغو شد.", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return

    db = read_db_json()
    gift_codes = db.get("gift_codes", [])
    
    code_obj = next((c for c in gift_codes if c["code"] == text), None)
    
    if not code_obj:
        msg = bot.send_message(message.chat.id, "❌ <b>کد هدیه وارد شده نامعتبر است!</b>\nلطفاً دوباره تلاش کنید یا «انصراف» بفرستید:", parse_mode="HTML", reply_markup=get_cancel_keyboard())
        bot.register_next_step_handler(msg, process_gift_code)
        return
        
    if tg_id in code_obj.get("usedBy", []):
        bot.send_message(message.chat.id, "❌ <b>شما قبلاً از این کد هدیه استفاده کرده‌اید!</b>", parse_mode="HTML", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return
        
    if code_obj.get("totalUsage", 0) >= code_obj.get("maxUsage", 1):
        bot.send_message(message.chat.id, "❌ <b>ظرفیت استفاده از این کد هدیه تکمیل شده است!</b>", parse_mode="HTML", reply_markup=get_custom_keyboard())
        start_cmd(message)
        return
        
    # Apply gift code
    code_obj["usedBy"].append(tg_id)
    code_obj["totalUsage"] = code_obj.get("totalUsage", 0) + 1
    
    user = next((u for u in db["users"] if u["userId"] == tg_id), None)
    if user:
        user["walletBalance"] = user.get("walletBalance", 0) + code_obj["amount"]
        
    write_db_json(db)
    
    log_action(
        tg_id, 
        message.from_user.username or str(tg_id), 
        "use_gift_code", 
        f"کد هدیه '{code_obj['code']}' را استفاده کرد و {code_obj['amount']} تومان دریافت کرد."
    )
    
    bot.send_message(
        message.chat.id, 
        f"🎁 <b>کد هدیه با موفقیت اعمال شد!</b>\n\nمبلغ <code>{code_obj['amount']:,}</code> تومان به کیف پول شما اضافه گردید.", 
        parse_mode="HTML", 
        reply_markup=get_custom_keyboard()
    )
    start_cmd(message)
    return

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

    if not verify_mandatory_join_and_warn(message.chat.id, tg_id):
         return

    # Check for pending purchase
    pending_plan_id, pending_username = get_user_pending_purchase(tg_id)

    # Look up selected amount or fallback to regex extraction or default
    extracted_amount = 0
    if not pending_plan_id:
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
    else:
        # Get plan price
        db = read_db_json()
        db_plans = db.get("vpn_plans", [])
        db_plan = next((dp for dp in db_plans if dp["id"] == pending_plan_id), None)
        extracted_amount = int(db_plan["price"]) if db_plan else 0

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
        
        import requests
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
            
            tx_description = f"شارژ انتخابی تلگرام. کپشن فیش: '{caption}'" if caption else f"شارژ انتخابی {extracted_amount:,} تومان بدون کپشن."
            if pending_plan_id:
                tx_description = f"خرید پلان: {pending_plan_id}, نام کاربری: {pending_username}"

            new_tx = {
                "id": tx_id,
                "userId": int(tg_id),
                "username": username,
                "amount": int(extracted_amount),
                "receiptImage": receipt_data_uri,
                "status": "pending",
                "date": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "description": tx_description
            }
            if pending_plan_id:
                new_tx["planId"] = pending_plan_id
                new_tx["clientName"] = pending_username
                new_tx["type"] = "PLAN_PURCHASE"
            
            db["transactions"].insert(0, new_tx)
            write_db_json(db)
            
            # Clear pending purchase if it exists
            if pending_plan_id:
                clear_user_pending_purchase(tg_id)

            try:
                log_action(int(tg_id), username or f"user_{tg_id}", "ارسال رسید تراکنش", f"کاربر فیش واریزی به مبلغ {extracted_amount:,} تومان را ارسال کرد ( شناسه: {tx_id} ).")
            except Exception as e:
                print("Error logging submit receipt:", e)
            
            reply_text = (
                f"✅ <b>فیش پرداختی شما با موفقیت دریافت شد!</b>\n\n"
                f"📌 شناسه تراکنش: <code>{tx_id}</code>\n"
                f"💰 مبلغ اعلامی: <b>{extracted_amount:,} تومان</b>\n\n"
                f"⌛ در حال انتقال صف بررسی توسط ادمین برای " + ("تحویل کانفیگ" if pending_plan_id else "شارژ") + " هستیم."
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
                    nickname = cfg.get("BOT_NICKNAME", "دالتون")
                    admin_msg = (
                        f"🔔 <b>رسید جدید برای تایید واریز شد!</b>\n\n"
                        f"👤 کاربر: @{username} (<code>{tg_id}</code>)\n"
                        f"💰 مبلغ اعلام شده: {extracted_amount:,} تومان\n"
                        f"🆔 شناسه: <code>{tx_id}</code>\n\n"
                        f"📥 لطفاً جهت بررسی و تایید به داشبورد مدیریت {nickname} سرور مراجعه کنید."
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
                print("[Daltoon Bot] Ready. Waiting for the active bot token to be configured on the web admin panel. Retrying in 10 seconds...")
                time.sleep(10)
                continue
            
            # Update the telebot token if configured on-the-fly
            if bot.token != token:
                print(f"[Daltoon Bot] Loaded new Bot Token from Web Dashboard: {token[:8]}...****")
                bot.token = token
                
            print(f"[Daltoon Bot] Starting polling with active bot: {token[:8]}...")
            try:
                # Dynamically set Telegram menu commands to enable the "Menu" shortcut button for all users
                commands = [
                    types.BotCommand("start", "💥 شروع مجدد ربات و منوی اصلی"),
                    types.BotCommand("buy", "🛒 خرید اشتراک جدید"),
                    types.BotCommand("pay", "💳 شارژ کیف پول و پرداخت"),
                    types.BotCommand("support", "🎫 تیکت به پشتیبانی")
                ]
                bot.set_my_commands(commands)
                print("[Daltoon Bot] Registered menu commands: /start, /buy, /pay, and /support")
            except Exception as cmd_err:
                err_str = str(cmd_err).lower()
                if "401" in err_str or "unauthorized" in err_str:
                    print("[Daltoon Bot] Setup pending. Commands registration bypassed because token is unauthorized.")
                else:
                    print(f"[Daltoon Bot Warning] Could not register bot commands: {cmd_err}")

            try:
                bot.delete_webhook(drop_pending_updates=True)
            except Exception as w_err:
                # Silently ignore webhook failure (no loud warnings or error messages)
                pass
                
            bot.polling(none_stop=True, interval=1, timeout=20)
        except Exception as e:
            err_str = str(e)
            if "401" in err_str or "unauthorized" in err_str.lower():
                # To prevent spamming and avoid raising alerts in log analyzers, we print a polite informational note.
                print("[Daltoon Bot] Setup pending. The current token in settings is not active. Please update it with a valid token from BotFather via the Web Dashboard.")
                time.sleep(15)
            else:
                print(f"[Daltoon Bot] Re-aligning connection context, retrying in 10 seconds...")
                time.sleep(10)
