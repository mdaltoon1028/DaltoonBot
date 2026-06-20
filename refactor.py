import re

with open("bot.py", "r", encoding="utf-8") as f:
    code = f.read()

# Let's find the start and end of text_messages_handler
start_idx = code.find("def text_messages_handler(message):")
end_idx = code.find("# --- Callback Queries ---")

handler_body = code[start_idx:end_idx]

# We want to change bot.send_message(message.chat.id, ...) to send_or_edit(message, ...)
# And encapsulate it into a function `def handle_menu_action(action, message, user, tg_id):`

def send_or_edit_code():
    return """
def send_or_edit(message, text, reply_markup=None, parse_mode="HTML"):
    try:
        if getattr(message, "from_callback", False):
            return bot.edit_message_text(text, chat_id=message.chat.id, message_id=message.message_id, reply_markup=reply_markup, parse_mode=parse_mode)
        else:
            return bot.send_message(message.chat.id, text, reply_markup=reply_markup, parse_mode=parse_mode)
    except Exception as e:
        print("[Bot update error]", e)
        # Fallback to sending new
        return bot.send_message(message.chat.id, text, reply_markup=reply_markup, parse_mode=parse_mode)

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

    db = read_db_json()
    cfg = get_config()
    custom_btn = next((b for b in db.get("custom_buttons", []) if b["text"] == text or text in b["text"]), None)
    
    if custom_btn:
        send_or_edit(message, custom_btn["replyText"])
    else:
        bot.reply_to(message, "لطفا از دکمه‌های شیشه‌ای منو استفاده کنید. 👇", reply_markup=get_custom_keyboard())

def process_menu_action(action, message, user, tg_id):
    cfg = get_config()
    db = read_db_json()

    if action == "mm_btnBuyNew":
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
        
        markup.row(
            types.InlineKeyboardButton("🔙 بازگشت", callback_data="btn_back_home"),
            types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
        )
            
        send_or_edit(
            message, 
            "🛍️ <b>پلان‌های فعال سرعت اختصاصی دالتون:</b>\n\nلطفا یکی از کانفیگ‌های زیر را برای خرید مستقیم انتخاب کنید. مبلغ به صورت خودکار از کیف پول تلگرام کسر می‌شود:",
            reply_markup=markup
        )

    # 2. Account Profile Details
    elif action == "mm_btnProfile":
        active_keys = [k for k in db.get("subscription_keys", []) if k["userId"] == tg_id and k["status"] != "expired"]
        
        bal = user.get("walletBalance", 0)
        formatted_bal = f"{int(bal):,}" if bal is not None else "0"

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

        send_or_edit(message, profile_text, reply_markup=markup)

    # 2.5 My Subs
    elif action == "mm_btnMySubs":
        active_keys = [k for k in db.get("subscription_keys", []) if k["userId"] == tg_id]
        
        if active_keys:
            from datetime import datetime
            
            msg_text = "🔑 <b>سرویس‌های فعال شما:</b>\n\n"
            for idx, k in enumerate(active_keys):
                
                # Check Dates
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

                msg_text += f"🔹 <b>سرویس {idx + 1}: {k.get('planName', 'نامشخص')}</b>\n"
                msg_text += f"━━━━━━━━━━━━━━━━━━\n"
                msg_text += f"⏳ <b>اعتبار:</b> {k['expireDate']}\n"
                msg_text += f"📅 <b>روز باقی مانده:</b> {remaining_days} روز\n\n"
                msg_text += f"🌐 <b>حجم کل:</b> {limit_gb} گیگابایت\n"
                msg_text += f"📉 <b>حجم مصرفی:</b> {used_gb} گیگابایت\n"
                msg_text += f"🪫 <b>حجم باقی‌مانده:</b> {rem_gb:.2f} گیگابایت\n\n"
                msg_text += f"🔗 <b>لینک اتصال (اشتراک):</b>\n"
                msg_text += f"<code>{k.get('subLink', '')}</code>\n"
                msg_text += f"━━━━━━━━━━━━━━━━━━\n\n"
            
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.row(
                types.InlineKeyboardButton("🔙 بازگشت", callback_data="btn_back_home"),
                types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
            )
            send_or_edit(message, msg_text, reply_markup=markup)
        else:
            msg_text = "❌ شما تا کنون هیچ سرویس اشتراکی دریافت نکرده‌اید."
            send_or_edit(message, msg_text)
            
    # 3. Charger Wallet instructions
    elif action == "mm_btnWallet":
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
        markup.row(
            types.InlineKeyboardButton("🔙 بازگشت", callback_data="btn_back_home"),
            types.InlineKeyboardButton("🏠 منوی اصلی", callback_data="btn_back_home")
        )
        send_or_edit(message, instructions, reply_markup=markup)

    # 4. Support chat
    elif action == "mm_btnSupport":
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
        send_or_edit(message, support_txt)
        
    # 5. Free Test
    elif action == "mm_btnFreeTest":
        db = read_db_json()
        users = db.get("users", [])
        user_idx = next((i for i, u in enumerate(users) if u.get("userId") == tg_id), -1)
        if user_idx >= 0 and users[user_idx].get("hasReceivedFreeTest"):
            send_or_edit(message, "❌ <b>شما قبلاً اکانت تست رایگان خود را دریافت کرده‌اید!</b>\nهر کاربر تنها یکبار مجاز به دریافت تست رایگان می‌باشد.")
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
            with open("Daltoon_Bot.json", "w", encoding="utf-8") as f:
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

    # 6. Referral
    elif action == "mm_btnReferral":
        settings = db.get("settings", {})
        bot_username = settings.get("botTelegramHandle", "your_bot_id")
        percent = settings.get("referralRewardPercent", 5)
        amount = settings.get("referralBaseAmount", 100000)
        calculated_reward = max(0, round((amount * percent) / 100))
        uid = str(tg_id)
        link = f"https://t.me/{bot_username}?start={uid}"
        
        default_msg = (
            "برای کسب موجودی هدیه، دوستان و آشنایان خودتون رو با لینک پایین به ربات دعوت کنید 👥\n\n"
            "در ضمن کد معرف اختصاصی شما {uid} می باشد.\n\n"
            "{link}\n\n"
            "🎁 با دعوت از هر دوست، {reward} تومان (معادل {percent}% مبلغ پایه) پاداش دریافت می‌کنید.\n\n"
            "📊 آمار دعوت شما\n"
            "• افراد وارد شده با لینک: 0\n"
            "• پاداش دریافت شده: 0 تومان"
        )
        
        raw_template = settings.get("referralMessage", default_msg)
        
        reply_text = raw_template.replace("{uid}", uid)\
            .replace("{link}", link)\
            .replace("{percent}", str(percent))\
            .replace("{amount}", f"{amount:,}")\
            .replace("{reward}", f"{calculated_reward:,}")
            
        send_or_edit(message, reply_text)

    elif action.startswith("mm_custom_"):
        idx = int(action.split("_")[-1])
        cb = db.get("custom_buttons", [])
        if idx < len(cb):
            send_or_edit(message, cb[idx]["replyText"])
"""

new_code = code[:start_idx] + send_or_edit_code() + code[end_idx:]
with open("bot.py", "w", encoding="utf-8") as f:
    f.write(new_code)
