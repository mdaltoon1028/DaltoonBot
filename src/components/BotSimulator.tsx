import React, { useState, useEffect, useRef } from "react";
import { User, VpnPlan, Transaction, SubscriptionKey, CustomButton, PanelSettings } from "../types";
import { Language, translations } from "../locales";
import { copyTextToClipboard } from "../utils/clipboard";
import { 
  Send, 
  Smartphone, 
  UserCheck, 
  Wallet, 
  ShieldCheck, 
  ShoppingBag, 
  LifeBuoy, 
  RefreshCw, 
  FileCheck, 
  Camera 
} from "lucide-react";

interface BotSimulatorProps {
  users: User[];
  plans: VpnPlan[];
  setVpnPlans: React.Dispatch<React.SetStateAction<VpnPlan[]>>;
  transactions: Transaction[];
  keys: SubscriptionKey[];
  setKeys: React.Dispatch<React.SetStateAction<SubscriptionKey[]>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  activeUserId: number;
  setActiveUserId: (id: number) => void;
  updateUserBalance: (userId: number, newBalance: number) => void;
  addNewTransaction: (tx: Transaction) => void;
  addNewSubscriptionKey: (key: SubscriptionKey) => void;
  lang: Language;
  customButtons: CustomButton[];
  settings?: PanelSettings;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  keyboard?: string[][]; // Custom Telegram reply keyboard
  inlineButtons?: { text: string; action: string }[]; // Custom Telegram inline markup
  imageUrl?: string; // Optional dynamic QR Code image
}

export default function BotSimulator({
  users,
  plans,
  setVpnPlans,
  transactions,
  keys,
  setKeys,
  setUsers,
  activeUserId,
  setActiveUserId,
  updateUserBalance,
  addNewTransaction,
  addNewSubscriptionKey,
  lang,
  customButtons,
  settings
}: BotSimulatorProps) {
  const t = translations[lang];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState<VpnPlan | null>(null);
  const [purchaseStep, setPurchaseStep] = useState<"idle" | "confirm_plan" | "ask_client_name" | "sending">("idle");
  const [showInvoiceUpload, setShowInvoiceUpload] = useState(false);
  
  // Invoice form fields
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDesc, setInvoiceDesc] = useState("");

  useEffect(() => {
    setInvoiceDesc(lang === "fa" ? "واریز کارت به کارت" : "Card-to-Card Transfer");
  }, [lang]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentUser = users.find(u => u.userId === activeUserId) || users[0];

  useEffect(() => {
    // Scroll to bottom
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Construct reply keyboard dynamically with custom menu buttons
  const getKeyboard = () => {
    const baseKeyboard = [
      [t.btnBuyPlan, t.btnMyAccount],
      [t.btnTopUp, t.btnSupport]
    ];
    
    // Convert custom menu buttons to rows of 2
    const customLabels = customButtons.map(cb => cb.text);
    const customRows: string[][] = [];
    for (let i = 0; i < customLabels.length; i += 2) {
      customRows.push(customLabels.slice(i, i + 2));
    }
    
    return [...baseKeyboard, ...customRows];
  };

  useEffect(() => {
    // Set initial welcome message when user or custom buttons change
    setMessages([
      {
        id: "init",
        sender: "bot",
        text: `${t.welcomeBotMsg}\n\nUser ID: ${currentUser.userId}\nusername: @${currentUser.username}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        keyboard: getKeyboard()
      }
    ]);
    setSelectedPlanToBuy(null);
    setShowInvoiceUpload(false);
  }, [activeUserId, lang, customButtons]);

  const addBotReply = (text: string, delayMs = 600, keyboard?: string[][], inlineButtons?: { text: string; action: string }[]) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "bot",
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          keyboard: keyboard || getKeyboard(),
          inlineButtons
        }
      ]);
    }, delayMs);
  };


  const handleUserAction = (text: string) => {
    // 1. Add user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages(prev => [...prev, userMsg]);

    // Check plan cancellation
    if (selectedPlanToBuy && (text.includes("انصراف") || text.includes("Cancel") || text.includes("cancel") || text.includes("برگشت") || text.includes("انصراف و برگشت"))) {
      setSelectedPlanToBuy(null);
      setPurchaseStep("idle");
      addBotReply(t.buyCancelConfirmation, 500, [
        [t.btnBuyPlan, t.btnMyAccount],
        [t.btnTopUp, t.btnSupport]
      ]);
      return;
    }

    if (selectedPlanToBuy && purchaseStep === "ask_client_name") {
      const clientNameInput = text.trim();
      const safeNameRegex = /^[a-zA-Z0-9_-]{3,15}$/;
      if (!safeNameRegex.test(clientNameInput)) {
        addBotReply(
          lang === "fa"
            ? "⚠️ <b>نام وارد شده نامعتبر است!</b>\n\nنام کاربری باید فقط شامل حروف انگلیسی، اعداد، خط تیره و بین ۳ تا ۱۵ کاراکتر باشد (بدون فاصله یا حروف فارسی).\n\nلطفاً یک نام انگلیسی معتبر بنویسید:"
            : "⚠️ <b>Invalid Username!</b>\n\nUsername must contain English letters, numbers, hyphens, and be between 3 and 15 characters long (no spaces/Persian).\n\nPlease write a valid English name:",
          500,
          [[lang === "fa" ? "❌ انصراف و برگشت" : "Cancel and Back"]]
        );
        return;
      }

      setPurchaseStep("sending");
      addBotReply(
        lang === "fa"
          ? "⏳ در حال ساخت کانفیگ اختصاصی شما روی پروتکل‌های فعال چندگانه در هسته ۳x-ui و ثبت سابسکریپشن..."
          : "⏳ Generating your dedicated configurations on multiple active inbounds in the 3x-ui core...",
        500,
        []
      );

      fetch("/api/vpn-plans/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanToBuy.id,
          userId: currentUser.userId,
          clientName: clientNameInput
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.vpnPlans) setVpnPlans(data.vpnPlans);
          if (data.subscriptionKeys) setKeys(data.subscriptionKeys);
          if (data.users) setUsers(data.users);
          
          const newBal = data.userWalletBalance;
          const mockSub = data.subKey;
          
          setSelectedPlanToBuy(null);
          setPurchaseStep("idle");

          const deliveryNote = settings?.purchaseSuccessNote ? `\n\n${settings.purchaseSuccessNote}` : "";
          const isUserAdminOrOwner = currentUser.userId === 6536288293 || currentUser.username === "daltoon_owner";
          const confirmMsg = lang === "fa"
            ? `🎉 خرید شما با موفقیت انجام شد!\n\n` +
              `👤 نام کاربری سرویس شما: <code>${clientNameInput}</code>\n` +
              `💳 هزینه کسر شده: ${isUserAdminOrOwner ? "۰ تومان (ویژه ادمین 👑)" : selectedPlanToBuy.price.toLocaleString() + " تومان"}\n` +
              `💰 موجودی جدید باقیمانده کیف پول: ${newBal.toLocaleString()} تومان\n\n` +
              `🔑 <b>سابسکریپشن اختصاصی شما با موفقیت فعال شد:</b>\n` +
              `<code>${mockSub.subLink}</code>\n\n` +
              `این نام کاربری به صورت همزمان بر روی تمامی اینباندهای فعال (سرعت فوق‌العاده) تنظیم گردید. جهت استفاده، آدرس بالا را کپی کرده و در کلاینت خود ایمپورت کنید یا کارت QR زیر را اسکن فرمایید.${deliveryNote}`
            : `🎉 VPN subscription purchased successfully!\n\n` +
              `👤 Username: <code>${clientNameInput}</code>\n` +
              `💳 Price Deducted: ${isUserAdminOrOwner ? "0 (Admin Free 👑)" : selectedPlanToBuy.price.toLocaleString() + " Toman"}\n` +
              `💰 New Balance: ${newBal.toLocaleString()} Toman\n\n` +
              `🔑 <b>Your dedicated subscription link has been generated:</b>\n` +
              `<code>${mockSub.subLink}</code>\n\n` +
              `This client was added to all active panel inbounds. Import the link above or scan the QR code below.${deliveryNote}`;

          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(mockSub.subLink)}`;

          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [
              ...prev,
              {
                id: Math.random().toString(),
                sender: "bot",
                text: confirmMsg,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                keyboard: getKeyboard(),
                imageUrl: qrUrl
              }
            ]);
          }, 1000);
        } else {
          setSelectedPlanToBuy(null);
          setPurchaseStep("idle");
          const errMsg = lang === "fa" ? "پرداخت ناموفق بود: " + data.error : "Checkout failed: " + data.error;
          addBotReply(errMsg, 500, getKeyboard());
        }
      })
      .catch(err => {
        setSelectedPlanToBuy(null);
        setPurchaseStep("idle");
        addBotReply(
          lang === "fa" ? "خطایی در برقراری ارتباط با سرور رخ داد." : "Database connection lost during payment.",
          500,
          getKeyboard()
        );
      });
      return;
    }

    // Process Bot Response Logic
    const matchedCustom = customButtons.find(cb => cb.text === text || text.includes(cb.text));
    if (matchedCustom) {
      addBotReply(matchedCustom.replyText, 600);
      return;
    }

    if (text.includes("🛍️") || text.includes("خرید") || text.includes("Buy") || text.includes("Plan")) {
      const inlinePlans = plans.map(p => ({
        text: `⚡ ${p.name} - ${p.price.toLocaleString()} ${lang === "fa" ? "تومان" : "Toman"}`,
        action: `buy_${p.id}`
      }));
      addBotReply(
        lang === "fa" 
          ? "لطفا یکی از پلان‌های زیر را برای خرید انتخاب کنید:\n\n⚠️ هزینه از کیف پول شما کسر خواهد شد." 
          : "Please select one of our premium configs to purchase:\n\n⚠️ The total amount will be deducted from your Toman wallet balance.",
        800,
        undefined,
        inlinePlans
      );
    } 
    else if (text.includes("👤") || text.includes("حساب") || text.includes("Account") || text.includes("My")) {
      const activeUserKeys = keys.filter(k => k.userId === currentUser.userId);
      let subDetails = "";
      if (lang === "fa") {
        if (activeUserKeys.length > 0) {
          subDetails = "\n\n🔑 کانفیگ‌های فعال شما:\n" + activeUserKeys.map((k, i) => `${i+1}. ${k.planName}\n⏳ انقضا: ${k.expireDate}\n⚙️ ${k.status.toUpperCase()}`).join("\n\n");
        } else {
          subDetails = "\n\n❌ شما تا کنون اشتراک فعالی از این ربات خریداری نکرده‌اید.";
        }
        addBotReply(
          `👤 اطلاعات حساب Daltoon شما:\n\n🆔 شناسه کاربری: ${currentUser.userId}\n🏷️ نام کاربری: @${currentUser.username}\n💰 موجودی کیف پول: ${currentUser.walletBalance.toLocaleString()} تومان${subDetails}`,
          600
        );
      } else {
        if (activeUserKeys.length > 0) {
          subDetails = "\n\n🔑 Your Active Subscriptions:\n" + activeUserKeys.map((k, i) => `${i+1}. ${k.planName}\n⏳ Expired: ${k.expireDate}\n⚙️ Status: ${k.status.toUpperCase()}`).join("\n\n");
        } else {
          subDetails = "\n\n❌ You have no active VPN subscription keys on this bot.";
        }
        addBotReply(
          `👤 My Account Details:\n\n🆔 User ID: ${currentUser.userId}\n🏷️ Handle: @${currentUser.username}\n💰 Wallet Balance: ${currentUser.walletBalance.toLocaleString()} Toman${subDetails}`,
          600
        );
      }
    } 
    else if (text.includes("💳") || text.includes("شارژ") || text.includes("Top-up") || text.includes("top") || text.includes("Wallet")) {
      if (lang === "fa") {
        addBotReply(
          `💳 آموزش شارژ کیف پول:\n\nلطفا مبلغ مورد نظر خود را به شماره کارت زیر واریز نمایید:\n\n📥 شماره کارت:\n<code>6037-9918-2831-8848</code>\n🏦 بانک ملی ایران\n👤 به نام: دالتون استور\n\nپس از واریز، روی دکمه زیر کلیک کرده و مبلغ پرداختی به همراه تصویر فیش بانکی را برای ما ارسال کنید تا بررسی و تأیید شود. 👇`,
          800,
          undefined,
          [{ text: "📸 ارسال فیش واریزی (Upload Slip)", action: "upload_receipt" }]
        );
      } else {
        addBotReply(
          `💳 Deposit Wallet Guides:\n\nPlease transfer your desired amount to our bank card details below:\n\n📥 Card Number:\n<code>6037-9918-2831-8848</code>\n🏦 Bank Melli Iran\n👤 Holder: Daltoon Store\n\nAfter transferring, tap the button below to upload your digital payment receipt so admins can credit your balance. 👇`,
          800,
          undefined,
          [{ text: "📸 Upload Slip Receipt", action: "upload_receipt" }]
        );
      }
    } 
    else if (text.includes("📞") || text.includes("پشتیبانی") || text.includes("Support") || text.includes("support")) {
      addBotReply(
        lang === "fa" 
          ? "📞 بخش پشتیبانی دالتون استور:\n\nپاسخگویی سریع ۲۴ ساعته هم‌اکنون فعال است.\n\nبا آیدی تلگرام @daltoon_support در ارتباط باشید."
          : "📞 Customer Service Support:\n\nOur service is live 24/7. Feel free to contact @daltoon_support on Telegram directly for answers.",
        500
      );
    } 
    else {
      // General fallbacks
      addBotReply(
        lang === "fa"
          ? "دستور ارسال شده متوجه نشدم. لطفا از دکمه‌های منوی زیر استفاده کنید. 👇"
          : "Command not recognized. Please use one of the action buttons on the visual keyboard panel below. 👇",
        500,
        [
          [t.btnBuyPlan, t.btnMyAccount],
          [t.btnTopUp, t.btnSupport]
        ]
      );
    }
  };

  const handleInlineClick = (action: string) => {
    // Mimic clicking standard inline telegram button
    if (action === "upload_receipt") {
      setShowInvoiceUpload(true);
      return;
    }

    if (action.startsWith("buy_")) {
      const planId = action.substring(4);
      const matchedPlan = plans.find(p => p.id === planId);
      if (matchedPlan) {
        setSelectedPlanToBuy(matchedPlan);
        setPurchaseStep("confirm_plan");
        const isUserAdminOrOwner = currentUser.userId === 6536288293 || currentUser.username === "daltoon_owner";
        const hasEnough = isUserAdminOrOwner || (currentUser.walletBalance >= matchedPlan.price);
        
        if (hasEnough) {
          addBotReply(
            lang === "fa"
              ? isUserAdminOrOwner
                ? `🛒 تأیید نهایی سفارش (دسترسی ویژه ادمین - رایگان):\n\nکانفیگ انتخابی: ${matchedPlan.name}\nقیمت: رایگان برای مدیریت 👑\n\nشما به عنوان ادمین دسترسی نامحدود دارید و نیازی به کسر موجودی کیف پول نیست.\nآیا مایلید این بسته را فعال بسازید؟`
                : `🛒 تأیید نهایی سفارش:\n\nکانفیگ انتخابی: ${matchedPlan.name}\nقیمت: ${matchedPlan.price.toLocaleString()} تومان\n\nکیف پول شما موجودی کافی دارد (${currentUser.walletBalance.toLocaleString()} تومان).\nآیا مایلید از کیف پول پرداخت کنید؟`
              : isUserAdminOrOwner
                ? `🛒 Confirm Purchase Order (Admin Special Access - Free):\n\nSelected Config: ${matchedPlan.name}\nPrice: FREE FOR ADMIN 👑\n\nAs an administrator, your orders are processed for free without wallet deduction.\nProceed to activate this package?`
                : `🛒 Confirm Purchase Order:\n\nSelected Config: ${matchedPlan.name}\nPrice: ${matchedPlan.price.toLocaleString()} Toman\n\nYour wallet balance is sufficient (${currentUser.walletBalance.toLocaleString()} Toman).\nProceed to checkout using your balance?`,
            600,
            [
              [lang === "fa" ? "✅ بله، خرید نهایی شود" : "Yes, complete buy", lang === "fa" ? "❌ انصراف و برگشت به منو" : "Cancel and back"]
            ]
          );
        } else {
          addBotReply(
            lang === "fa"
              ? `❌ عدم موجودی کافی!\n\nکانفیگ انتخابی: ${matchedPlan.name}\nقیمت: ${matchedPlan.price.toLocaleString()} تومان\nموجودی فعلی شما: ${currentUser.walletBalance.toLocaleString()} تومان\n\nبرای تکمیل خرید، لطفا ابتدا کیف پول خود را شارژ کنید.`
              : `❌ Insufficient Funds!\n\nSelected Config: ${matchedPlan.name}\nPrice: ${matchedPlan.price.toLocaleString()} Toman\nYour wallet balance: ${currentUser.walletBalance.toLocaleString()} Toman\n\nPlease top up your wallet first to purchase this plan.`,
            600,
            [
              [t.btnTopUp, t.buyCancel]
            ]
          );
        }
      }
    }
  };

  const handleKeyboardClick = (text: string) => {
    // If we are confirming checkout
    if ((text === "✅ بله، خرید نهایی شود" || text === "Yes, complete buy") && selectedPlanToBuy && purchaseStep === "confirm_plan") {
      setPurchaseStep("ask_client_name");
      const isUserAdminOrOwner = currentUser.userId === 6536288293 || currentUser.username === "daltoon_owner";
      const paymentMsg = lang === "fa"
        ? `✍️ <b>لطفاً یک نام دلخواه (بدون فاصله، انگلیسی) برای کانفیگ خود بفرستید:</b>\n\n` +
          `• طرح انتخابی: <code>${selectedPlanToBuy.name}</code>\n` +
          `• هزینه طرح: ${isUserAdminOrOwner ? "پیش‌نمایش مدیریت (رایگان 👑)" : selectedPlanToBuy.price.toLocaleString() + " تومان"}\n\n` +
          `⚠️ قوانین نام‌گذاری:\n` +
          `۱. فقط از حروف و اعداد انگلیسی استفاده نمایید (مثال: <code>aria_vpn</code>)\n` +
          `۲. از فاصله (space)، علامت یا حروف فارسی استفاده نکنید.`
        : `✍️ <b>Please send a preferred username (no space, English only) for your configuration:</b>\n\n` +
          `• Selected Plan: <code>${selectedPlanToBuy.name}</code>\n` +
          `• Plan Cost: ${isUserAdminOrOwner ? "FREE for Admin 👑" : selectedPlanToBuy.price.toLocaleString() + " Toman"}\n\n` +
          `⚠️ Rules:\n` +
          `1. Use English letters & numbers (eg: <code>aria_vpn</code>)\n` +
          `2. Do not use space or special signs.`;

      addBotReply(paymentMsg, 500, [
        [lang === "fa" ? "❌ انصراف و برگشت" : "Cancel and Back"]
      ]);
      return;
    }

    handleUserAction(text);
  };

  const handleInvoiceFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(invoiceAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert(lang === "fa" ? "لطفا مبلغ معتبری وارد کنید." : "Please enter a valid amount.");
      return;
    }

    const gradients = [
      "from-indigo-500 to-purple-700",
      "from-teal-500 to-cyan-600",
      "from-purple-500 to-pink-600",
      "from-blue-600 to-indigo-700"
    ];
    const randomGrad = `bg-gradient-to-br ${gradients[Math.floor(Math.random() * gradients.length)]}`;

    const newTx: Transaction = {
      id: "TX-" + Math.floor(Math.random() * 9000 + 1000),
      userId: currentUser.userId,
      username: currentUser.username,
      amount: amountNum,
      receiptImage: randomGrad,
      status: "pending",
      date: new Date().toISOString(),
      description: invoiceDesc
    };

    addNewTransaction(newTx);
    setShowInvoiceUpload(false);
    setInvoiceAmount("");

    // Add user message to chat saying receipt submitted
    const msg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: lang === "fa" 
        ? `💸 ارسال فیش واریز کارت به کارت\n💵 مبلغ: ${amountNum.toLocaleString()} تومان\n📝 توضیحات: ${invoiceDesc}`
        : `💸 Card-to-card slip uploaded\n💵 Price: ${amountNum.toLocaleString()} Toman\n📝 Detail: ${invoiceDesc}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages(prev => [...prev, msg]);

    // Bot responds
    addBotReply(
      lang === "fa"
        ? `✅ فیش شما دریافت شد!\n\nکد رهگیری تراکنش: ${newTx.id}\nمبلغ: ${amountNum.toLocaleString()} تومان\n\nپشتیبانی دالتون فیش شما را تایید خواهد کرد. به محض تایید، کیف پول شما شارژ شده و اطلاع‌رسانی می‌شود. سپاس از شکیبایی شما 🙏`
        : `✅ Receipt uploaded successfully!\n\nReference Code: ${newTx.id}\nAmount: ${amountNum.toLocaleString()} Toman\n\nAdmins will inspect your bank slip. As soon as it is approved, your balance is credited and we will notify you. Thank you!`,
      1000,
      [
        [t.btnBuyPlan, t.btnMyAccount],
        [t.btnTopUp, t.btnSupport]
      ]
    );
  };

  return (
    <div id="bot-sim-tab" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Selector and explanation */}
      <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl block space-y-4 h-fit">
        <div>
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            {t.botEmulatorTitle}
          </h3>
          <p className="text-xs text-gray-400">{t.botEmulatorDesc}</p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">{t.selectUserPersona}</label>
          <div className="grid grid-cols-1 gap-1.5">
            {users.map((u) => (
              <button
                key={u.userId}
                onClick={() => setActiveUserId(u.userId)}
                className={`w-full text-left p-3 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer transition ${
                  u.userId === activeUserId 
                    ? "bg-indigo-600/10 border-indigo-500/50 text-white" 
                    : "bg-slate-900 border-slate-800 text-gray-400 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className={`w-4 h-4 ${u.userId === activeUserId ? "text-indigo-400" : "text-gray-500"}`} />
                  <div>
                    <span className="block font-semibold">@{u.username}</span>
                    <span className="text-[10px] text-gray-500 font-mono">ID: {u.userId}</span>
                  </div>
                </div>

                <div className="text-right text-[10px]">
                  <span className="block font-semibold text-emerald-400 font-display">{u.walletBalance.toLocaleString()} {lang === "fa" ? "ت" : "T"}</span>
                  <span className="text-slate-500">{u.status === "active" ? (lang === "fa" ? "فعال" : "active") : (lang === "fa" ? "مسدود" : "banned")}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1f2937]/50 p-4 border border-slate-800 rounded-lg text-xs space-y-2 text-gray-400">
          <p className="font-semibold text-gray-300">{t.howToTestTitle}</p>
          <ol className="list-decimal pl-4 space-y-1.5 font-sans leading-relaxed">
            <li>{t.howToTestStep1}</li>
            <li>{t.howToTestStep2}</li>
            <li>{t.howToTestStep3}</li>
            <li>{t.howToTestStep4}</li>
            <li>{t.howToTestStep5}</li>
            <li>{t.howToTestStep6}</li>
          </ol>
        </div>
      </div>

      {/* Smartphone emulator frame */}
      <div className="lg:col-span-2 flex flex-col items-center justify-center">
        <div className="w-full max-w-[370px] aspect-[9/18.5] bg-[#0c0d14] rounded-[38px] border-[5px] border-[#1e293b] shadow-[0_0_60px_rgba(0,0,0,0.7)] relative flex flex-col overflow-hidden">
          
          {/* Phone Top Notch Speaker */}
          <div className="absolute top-0 inset-x-0 h-5 flex items-center justify-center z-30 pointer-events-none">
            <div className="w-20 h-3 bg-[#1e293b] rounded-b-xl flex justify-center items-center">
              <div className="w-6 h-0.5 bg-black rounded-full mb-0.5"></div>
            </div>
          </div>

          {/* Chat Header */}
          <div className="bg-[#111827] border-b border-[#1f2937] pt-6 p-2 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs select-none">
                DL
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-white leading-tight">{lang === "fa" ? "ربات تلگرام دالتون استور 🤖" : "Daltoon Store Bot 🤖"}</h4>
                <p className="text-[9px] text-emerald-400 flex items-center gap-1 leading-none mt-0.5">
                  <span className="h-1 w-1 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                  {lang === "fa" ? "ربات فعال است (bot.py)" : "bot.py polling active"}
                </p>
              </div>
            </div>

            <span className="text-[9px] font-mono font-medium py-0.5 px-1.5 bg-slate-800 text-slate-400 rounded">
              @daltoon_store_bot
            </span>
          </div>

          {/* Chat Pane */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/75 select-text">
            {messages.map((m) => (
              <div key={m.id} className="space-y-1">
                <div className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                    m.sender === "user" 
                      ? "bg-indigo-600 text-white rounded-tr-xs" 
                      : "bg-[#111827] text-gray-200 border border-[#1f2937] rounded-tl-xs whitespace-pre-wrap font-sans"
                  }`}>
                    <div className="break-words">
                      {m.sender === "bot" ? (
                        (() => {
                          const parts = m.text.split(/(\n|<\/?b>|<\/?code>)/g);
                          let isBold = false;
                          let isCode = false;
                          return parts.map((part, i) => {
                            if (part === "<b>") { isBold = true; return null; }
                            if (part === "</b>") { isBold = false; return null; }
                            if (part === "<code>") { isCode = true; return null; }
                            if (part === "</code>") { isCode = false; return null; }
                            if (part === "\n") return <br key={i} />;
                            if (isCode) {
                              return (
                                <code 
                                  key={i} 
                                  onClick={() => {
                                    copyTextToClipboard(part);
                                  }}
                                  className="bg-slate-900/95 text-pink-400 px-1.5 py-0.5 rounded font-mono text-[10px] break-all border border-slate-800 select-all hover:bg-slate-805 cursor-pointer block mt-1 mb-1 shadow-inner text-center"
                                  title="Copy code"
                                >
                                  {part}
                                </code>
                              );
                            }
                            if (isBold) return <strong key={i} className="font-extrabold text-[#f3f4f6]">{part}</strong>;
                            return part;
                          });
                        })()
                      ) : (
                        m.text
                      )}
                    </div>

                    {m.imageUrl && (
                      <div className="mt-3 flex flex-col items-center bg-white p-2 rounded-xl border border-[#374151]/40 shadow-md">
                        <img 
                          src={m.imageUrl} 
                          alt="QR Code" 
                          referrerPolicy="no-referrer"
                          className="w-40 h-40 object-contain" 
                        />
                        <span className="text-[9px] text-slate-500 font-sans mt-1">
                          {lang === "fa" ? "📷 برای اتصال اسکن نمایید" : "📷 Scan to connect"}
                        </span>
                      </div>
                    )}
                    
                    <span className={`block text-[8px] text-right mt-1.5 ${m.sender === "user" ? "text-indigo-200" : "text-gray-500"} font-mono`}>
                      {m.timestamp}
                    </span>
                  </div>
                </div>

                {/* Render inline buttons inside chat if bot posted them */}
                {m.sender === "bot" && m.inlineButtons && m.inlineButtons.length > 0 && (
                  <div className="flex flex-col gap-1 max-w-[85%] mt-1 pl-2">
                    {m.inlineButtons.map((btn, index) => (
                      <button
                        key={index}
                        onClick={() => handleInlineClick(btn.action)}
                        className="w-full text-center py-2 px-3 bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 font-semibold rounded-lg text-[11px] border border-slate-800 cursor-pointer transition flex items-center justify-center gap-1.5"
                      >
                        {btn.text.includes("ارسال") || btn.text.includes("Upload") || btn.text.includes("upload") ? <Camera className="w-3.5 h-3.5 text-emerald-400" /> : null}
                        {btn.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#111827] text-gray-500 rounded-2xl p-2.5 px-4 text-xs border border-[#1f2937] rounded-tl-none">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Receipt Submission Form Overlay */}
          {showInvoiceUpload && (
            <div className="absolute inset-x-0 bottom-0 top-1/4 bg-slate-900 border-t border-[#1f2937] z-20 flex flex-col p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-[#2d3748] pb-2">
                <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  {lang === "fa" ? "اطلاعات حواله واریز کارت به کارت" : "Card-to-Card Receipt Details"}
                </span>
                <button 
                  onClick={() => setShowInvoiceUpload(false)}
                  className="text-xs text-rose-400 hover:text-white"
                >
                  {t.cancelBtn}
                </button>
              </div>

              <form onSubmit={handleInvoiceFormSubmit} className="space-y-4 text-xs flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-400 mb-1">{t.formAmountLabel}</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 135000"
                      className="w-full bg-[#111827] border border-gray-700 rounded-lg p-2.5 text-sm text-white font-display focus:ring-1 focus:ring-indigo-500"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">{t.formDescLabel}</label>
                    <input
                      type="text"
                      className="w-full bg-[#111827] border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. Card-to-Card to Melli bank"
                      value={invoiceDesc}
                      onChange={(e) => setInvoiceDesc(e.target.value)}
                    />
                  </div>
                  
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-500 space-y-1 font-mono text-[9px] text-center">
                    <p className="text-gray-400">📎 SCREENSHOT ATTACHMENT MOCKED</p>
                    <p>{t.mockSubmitNotice}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition text-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <FileCheck className="w-4 h-4" />
                  {t.submitReceiptBtn}
                </button>
              </form>
            </div>
          )}

          {/* Interactive Bot Navigation Menu Keyboard */}
          <div className="bg-[#111827] border-t border-[#1f2937] p-3 space-y-2 shrink-0 z-10 select-none">
            {messages.length > 0 && messages[messages.length - 1].keyboard ? (
              <div className={
                settings?.keyboardLayout === "vertical"
                  ? "grid grid-cols-1 gap-1.5"
                  : "grid grid-cols-2 gap-1.5"
              }>
                {(() => {
                  const keyboardRows = messages[messages.length - 1].keyboard || [];
                  const flatButtons = keyboardRows.flatMap(row => row);
                  const isStepped = settings?.keyboardLayout === "stepped";
                  
                  return flatButtons.map((buttonText, idx) => {
                    const colSpanClass = isStepped && idx % 3 === 0 ? "col-span-2" : "";
                    return (
                      <button
                        key={buttonText}
                        onClick={() => handleKeyboardClick(buttonText)}
                        className={`py-2.5 px-2 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-gray-200 font-semibold hover:bg-slate-800 hover:text-white transition cursor-pointer text-center ${colSpanClass}`}
                      >
                        {buttonText}
                      </button>
                    );
                  });
                })()}
              </div>
            ) : null}

            {/* Manual user message input field */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder={t.typeMessagePlaceholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputText.trim()) {
                    handleUserAction(inputText);
                    setInputText("");
                  }
                }}
              />
              <button
                disabled={!inputText.trim()}
                onClick={() => {
                  handleUserAction(inputText);
                  setInputText("");
                }}
                className={`p-1.5 rounded-full text-white cursor-pointer transition ${
                  inputText.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-800 text-slate-600"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
