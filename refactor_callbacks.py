import re

with open("bot.py", "r", encoding="utf-8") as f:
    code = f.read()

# First replace text_messages_handler
start_idx = code.find("def text_messages_handler(message):")
end_idx = code.find("# --- Callback Queries ---")

new_text_handler = """def text_messages_handler(message):
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

    bot.send_message(message.chat.id, "لطفا از دکمه‌های شیشه‌ای منو استفاده کنید. 👇", reply_markup=get_custom_keyboard())

"""

# Now we need to insert the mm_ handler inside callback_handler.
# Let's insert it before `if call.data.startswith("buy_"):`
cb_handler_start = code.find("def callback_handler(call):")
insert_pos = code.find("if call.data.startswith(\"buy_\"):", cb_handler_start)

mm_handler_code = """
    if call.data.startswith("mm_"):
        handle_main_menu_callback(call)
        return

"""

# Let's define handle_main_menu_callback
mm_helper = """
def handle_main_menu_callback(call):
    tg_id = call.from_user.id
    action = call.data
    message = call.message
    bot.answer_callback_query(call.id)
    
    cfg = get_config()
    db = read_db_json()
    user = get_user_data(tg_id)
    
    if action == "mm_btnBuyNew":
        db_plans = db.get("vpn_plans", [])
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
            plans_data = [
                {"id": "std_30g", "name": "Standard 30GB - ۳۰ روزه", "price": 45000, "traffic": 30, "duration": 30},
                {"id": "vip_70g", "name": "VIP Premium 70GB - ۶۰ روزه", "price": 95000, "traffic": 70, "duration": 60},
                {"id": "ult_150g", "name": "Unlimited VoIP 150GB - ۹۰ روزه", "price": 185000, "traffic": 150, "duration": 90}
            ]
        
        markup = types.InlineKeyboardMarkup(row_width=1)
        for p in plans_data:
            btn_text = f"⚡ {p['name']} | {p['price']:,} تومان"
            markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"buy_{p['id']}"))
        
        markup.row(
            types.InlineKeyboardButton("🔙 بازگشت", callback_data="btn_back_home"),
            types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
        )
            
        bot.edit_message_text(
            "🛍️ <b>پلان‌های فعال سرعت اختصاصی دالتون:</b>\\n\\nلطفا یکی از کانفیگ‌های زیر را برای خرید مستقیم انتخاب کنید. مبلغ به صورت خودکار از کیف پول تلگرام کسر می‌شود:",
            chat_id=message.chat.id,
            message_id=message.message_id,
            parse_mode="HTML",
            reply_markup=markup
        )

    elif action == "mm_btnProfile":
        active_keys = [k for k in db.get("subscription_keys", []) if k["userId"] == tg_id and k["status"] != "expired"]
        bal = user.get("walletBalance", 0)
        formatted_bal = f"{int(bal):,}" if bal is not None else "0"

        profile_text = (
            f"📄 <b>اطلاعات حساب کاربری شما:</b>\\n\\n"
            f"💰 موجودی: {formatted_bal} تومان\\n"
            f"👤 آیدی عددی: <code>{tg_id}</code>\\n"
            f"📦 تعداد سرویس ها: {len(active_keys)}\\n"
            f"🗓 تاریخ ورود به بات: به زودی\\n\\n"
            f"🔹 جهت شارژ کیف پول خود، می‌توانید به بخش مربوطه در منوی اصلی ربات مراجعه فرمایید."
        )
        
        markup = types.InlineKeyboardMarkup(row_width=1)
        markup.add(types.InlineKeyboardButton("🎁 اعمال کد هدیه", callback_data="btn_gift_code"))
        markup.row(
            types.InlineKeyboardButton("🔙 بازگشت", callback_data="btn_back_home"),
            types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
        )
        bot.edit_message_text(profile_text, chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML", reply_markup=markup)

    elif action == "mm_btnMySubs":
        active_keys = [k for k in db.get("subscription_keys", []) if k["userId"] == tg_id]
        if active_keys:
            from datetime import datetime
            msg_text = "🔑 <b>سرویس‌های فعال شما:</b>\\n\\n"
            for idx, k in enumerate(active_keys):
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

                msg_text += f"🔹 <b>سرویس {idx + 1}: {k.get('planName', 'نامشخص')}</b>\\n"
                msg_text += f"━━━━━━━━━━━━━━━━━━\\n"
                msg_text += f"⏳ <b>اعتبار:</b> {k['expireDate']}\\n"
                msg_text += f"📅 <b>روز باقی مانده:</b> {remaining_days} روز\\n\\n"
                msg_text += f"🌐 <b>حجم کل:</b> {limit_gb} گیگابایت\\n"
                msg_text += f"📉 <b>حجم مصرفی:</b> {used_gb} گیگابایت\\n"
                msg_text += f"🪫 <b>حجم باقی‌مانده:</b> {rem_gb:.2f} گیگابایت\\n\\n"
                msg_text += f"🔗 <b>لینک اتصال (اشتراک):</b>\\n"
                msg_text += f"<code>{k.get('subLink', '')}</code>\\n"
                msg_text += f"━━━━━━━━━━━━━━━━━━\\n\\n"
                
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.row(
                types.InlineKeyboardButton("🔙 بازگشت", callback_data="btn_back_home"),
                types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
            )
            bot.edit_message_text(msg_text, chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML", reply_markup=markup)
        else:
            bot.edit_message_text("❌ شما تا کنون هیچ سرویس اشتراکی دریافت نکرده‌اید.", chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML")

    elif action == "mm_btnWallet":
        instructions = (
            f"💳 <b>بخش شارژ و افزایش موجودی کیف پول دالتون:</b>\\n\\n"
            f"لطفاً مبلغی که مایل هستید جهت شارژ واریز کنید را از دکمه‌های زیر انتخاب نمایید:\\n"
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
        markup.row(
            types.InlineKeyboardButton("🔙 بازگشت", callback_data="btn_back_home"),
            types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
        )
        bot.edit_message_text(instructions, chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML", reply_markup=markup)

    elif action == "mm_btnSupport":
        custom_support = cfg.get("SUPPORT_TEXT")
        if custom_support:
            support_txt = custom_support
        else:
            support_handle = cfg.get("SUPPORT_HANDLE", "@daltoon_owner")
            tg_channel = cfg.get("TG_CHANNEL", "@daltoon_channel")
            support_txt = (
                "📞 <b>پشتیبانی فنی دالتون سرور:</b>\\n\\n"
                "مشتری گرامی! در صورت بروز هرگونه قطعی، کندی سرعت، ارورهای اتصال یا سوالات قبل از خرید با ما تماس بگیرید.\\n\\n"
                f"👤 اکانت ناظر فنی: {support_handle}\\n"
                f"📢 کانال اطلاع‌رسانی پایداری شبکه: {tg_channel}\\n\\n"
                "پاسخگویی سریع فعال است: ۱۰ صبح الی ۳ شب"
            )
        bot.edit_message_text(support_txt, chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML")

    elif action == "mm_btnFreeTest":
        users = db.get("users", [])
        user_idx = next((i for i, u in enumerate(users) if u.get("userId") == tg_id), -1)
        if user_idx >= 0 and users[user_idx].get("hasReceivedFreeTest"):
            bot.edit_message_text("❌ <b>شما قبلاً اکانت تست رایگان خود را دریافت کرده‌اید!</b>\\nهر کاربر تنها یکبار مجاز به دریافت تست رایگان می‌باشد.", chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML")
            return
            
        bot.send_message(message.chat.id, "⏳ در حال ساخت اکانت تست رایگان (۱ روزه - ۱۰۰ مگابایت) از پنل سرور دالتون... لطفاً چند لحظه صبر کنید.")
        import string
        import random
        from backend.api import check_client_exists, add_vpn_client_api
        import uuid
        import time
        from backend.db_operations import create_sub_key
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        free_username = f"test_{random_suffix}"
        while check_client_exists(free_username):
            random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
            free_username = f"test_{random_suffix}"
            
        client_uuid, sub_link = add_vpn_client_api(free_username, 0.1, 1)
        if not sub_link:
            client_uuid = str(uuid.uuid4())
            fallback_sub_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
            sub_link = f"{cfg.get('SUB_URL', 'https://m.daltoon-server.ir:8443')}/sub/{fallback_sub_id}"
            
        if user_idx >= 0:
            users[user_idx]["hasReceivedFreeTest"] = True
            db["users"] = users
            import json
            with open("Daltoon_Bot.json", "w", encoding="utf-8") as f:
                json.dump(db, f, ensure_ascii=False, indent=2)
                
        expire_date = time.strftime("%Y-%m-%d", time.localtime(time.time() + 1 * 24 * 60 * 60))
        sub_id = f"SUB-{int(time.time()) % 9000 + 1000}"

        create_sub_key(sub_id, tg_id, "free_test", "تست رایگان ۱ روزه", sub_link, expire_date, 0.1, free_username)
        
        success_text = (
            f"🎁 <b>اکانت تست رایگان شما با موفقیت ساخته شد!</b>\\n\\n"
            f"👤 نام کاربری تست: <code>{free_username}</code>\\n"
            f"⏳ اعتبار: ۱ روز\\n"
            f"📊 حجم: ۱۰۰ مگابایت\\n\\n"
            f"🔑 <b>مسیر اشتراک (در V2rayNG، V2box، Happ و... وارد کنید):</b>\\n\\n"
            f"<code>{sub_link}</code>\\n"
        )
        try:
            import urllib.parse
            qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={urllib.parse.quote(sub_link)}"
            bot.send_photo(message.chat.id, qr_url, caption=success_text, parse_mode="HTML")
        except:
            bot.send_message(message.chat.id, success_text, parse_mode="HTML")

    elif action == "mm_btnReferral":
        settings = db.get("settings", {})
        bot_username = settings.get("botTelegramHandle", "your_bot_id")
        percent = settings.get("referralRewardPercent", 5)
        amount = settings.get("referralBaseAmount", 100000)
        calculated_reward = max(0, round((amount * percent) / 100))
        uid = str(tg_id)
        link = f"https://t.me/{bot_username}?start={uid}"
        
        default_msg = (
            "برای کسب موجودی هدیه، دوستان و آشنایان خودتون رو با لینک پایین به ربات دعوت کنید 👥\\n\\n"
            "در ضمن کد معرف اختصاصی شما {uid} می باشد.\\n\\n"
            "{link}\\n\\n"
            "🎁 با دعوت از هر دوست، {reward} تومان (معادل {percent}% مبلغ پایه) پاداش دریافت می‌کنید.\\n\\n"
            "📊 آمار دعوت شما\\n"
            "• افراد وارد شده با لینک: 0\\n"
            "• پاداش دریافت شده: 0 تومان"
        )
        raw_template = settings.get("referralMessage", default_msg)
        reply_text = raw_template.replace("{uid}", uid).replace("{link}", link).replace("{percent}", str(percent)).replace("{amount}", f"{amount:,}").replace("{reward}", f"{calculated_reward:,}")
        bot.edit_message_text(reply_text, chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML")

    elif action.startswith("mm_custom_"):
        idx = int(action.split("_")[-1])
        cb = db.get("custom_buttons", [])
        if idx < len(cb):
            bot.edit_message_text(cb[idx]["replyText"], chat_id=message.chat.id, message_id=message.message_id, parse_mode="HTML")

"""

new_code = code[:start_idx] + new_text_handler + "\n" + mm_helper + "\n" + code[end_idx:cb_handler_start] + "def callback_handler(call):\n" + mm_handler_code + code[insert_pos:]

with open("bot.py", "w", encoding="utf-8") as f:
    f.write(new_code)
