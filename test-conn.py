import json
import os
import sys

# load bot.py logic
sys.path.append(os.getcwd())
import bot

cfg = bot.get_config()
print("URL:", cfg['XUI_URL'])
print("USER:", cfg['XUI_USER'])
print("SUB_URL:", cfg['SUB_URL'])

res = bot.login_xui()
print("Login result:", res)

db = bot.read_db_json()
settings_str = db.get("settings", {}).get("panel_config")
if settings_str:
    panel_cfg = json.loads(settings_str)
    print("Active inbounds:", panel_cfg.get("activeInboundIds", []))
