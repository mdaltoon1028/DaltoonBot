import React, { useState, useEffect, useRef } from "react";
import { User, VpnPlan, Transaction, SubscriptionKey, CustomButton } from "../types";
import { Language, translations } from "../locales";
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
  transactions: Transaction[];
  keys: SubscriptionKey[];
  activeUserId: number;
  setActiveUserId: (id: number) => void;
  updateUserBalance: (userId: number, newBalance: number) => void;
  addNewTransaction: (tx: Transaction) => void;
  addNewSubscriptionKey: (key: SubscriptionKey) => void;
  lang: Language;
  customButtons: CustomButton[];
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  keyboard?: string[][]; // Custom Telegram reply keyboard
  inlineButtons?: { text: string; action: string }[]; // Custom Telegram inline markup
}

export default function BotSimulator({
  users,
  plans,
  transactions,
  keys,
  activeUserId,
  setActiveUserId,
  updateUserBalance,
  addNewTransaction,
  addNewSubscriptionKey,
  lang,
  customButtons
}: BotSimulatorProps) {
  const t = translations[lang];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState<VpnPlan | null>(null);
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
    if (selectedPlanToBuy && (text.includes("انصراف") || text.includes("Cancel") || text.includes("cancel") || text.includes("برگشت"))) {
      setSelectedPlanToBuy(null);
      addBotReply(t.buyCancelConfirmation, 500, [
        [t.btnBuyPlan, t.btnMyAccount],
        [t.btnTopUp, t.btnSupport]
      ]);
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
          `💳 آموزش شارژ کیف پول:\n\nلطفا مبلغ مورد نظر خود را به شماره کارت زیر واریز نمایید:\n\n📥 شماره کارت:\n<code>6037-9918-2831-8848</code>\n🏦 بانک ملی ایران\n👤 به نام: دالتون سرورز\n\nپس از واریز، روی دکمه زیر کلیک کرده و مبلغ پرداختی به همراه تصویر فیش بانکی را برای ما ارسال کنید تا بررسی و تأیید شود. 👇`,
          800,
          undefined,
          [{ text: "📸 ارسال فیش واریزی (Upload Slip)", action: "upload_receipt" }]
        );
      } else {
        addBotReply(
          `💳 Deposit Wallet Guides:\n\nPlease transfer your desired amount to our bank card details below:\n\n📥 Card Number:\n<code>6037-9918-2831-8848</code>\n🏦 Bank Melli Iran\n👤 Holder: Daltoon Team\n\nAfter transferring, tap the button below to upload your digital payment receipt so admins can credit your balance. 👇`,
          800,
          undefined,
          [{ text: "📸 Upload Slip Receipt", action: "upload_receipt" }]
        );
      }
    } 
    else if (text.includes("📞") || text.includes("پشتیبانی") || text.includes("Support") || text.includes("support")) {
      addBotReply(
        lang === "fa" 
          ? "📞 بخش پشتیبانی دالتون سرور:\n\nبخش چت آنلاین در وب‌سایت هم‌اکنون در دسترس است.\n\nهمچنین با آیدی تلگرام @daltoon_owner در ارتباط باشید.\n\nساعات پاسخگویی: ۱۰ صبح الی ۲ بامداد"
          : "📞 Customer Service Support:\n\nOur online system is live 24/7. Feel free to contact @daltoon_owner on Telegram directly for billing answers.",
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
        const hasEnough = currentUser.walletBalance >= matchedPlan.price;
        
        if (hasEnough) {
          addBotReply(
            lang === "fa"
              ? `🛒 تأیید نهایی سفارش:\n\nکانفیگ انتخابی: ${matchedPlan.name}\nقیمت: ${matchedPlan.price.toLocaleString()} تومان\n\nکیف پول شما موجودی کافی دارد (${currentUser.walletBalance.toLocaleString()} تومان).\nآیا مایلید از کیف پول پرداخت کنید؟`
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
    if ((text === "✅ بله، خرید نهایی شود" || text === "Yes, complete buy" || text === "✅ بله، خرید نهایی شود") && selectedPlanToBuy) {
      if (currentUser.walletBalance >= selectedPlanToBuy.price) {
        const newBal = currentUser.walletBalance - selectedPlanToBuy.price;
        updateUserBalance(currentUser.userId, newBal);
        
        // Generate mock subscription link based on plan specs
        const randomUUID = Math.random().toString(36).substring(2, 15) + "-" + Math.random().toString(36).substring(2, 10);
        const mockSub: SubscriptionKey = {
          id: "SUB-" + Math.floor(Math.random() * 9000 + 1000),
          userId: currentUser.userId,
          planId: selectedPlanToBuy.id,
          planName: selectedPlanToBuy.name,
          subLink: `vless://${randomUUID}@m.daltoon-server.ir:2052?security=reality&sni=google.com&fp=chrome#Daltoon-${selectedPlanToBuy.trafficGb}G`,
          expireDate: new Date(Date.now() + selectedPlanToBuy.durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          trafficLimitGb: selectedPlanToBuy.trafficGb,
          trafficUsedGb: 0,
          status: "active"
        };

        addNewSubscriptionKey(mockSub);
        setSelectedPlanToBuy(null);

        // Add Bot message
        const confirmMsg = lang === "fa"
          ? `🎉 خرید شما با موفقیت انجام شد!\n\n💳 هزینه کسر شده: ${selectedPlanToBuy.price.toLocaleString()} تومان\n💰 موجودی باقیمانده: ${newBal.toLocaleString()} تومان\n\n🔑 کانفیگ VLESS اختصاصی شما صادر شد:\n\n<code>${mockSub.subLink}</code>\n\nجهت استفاده، کانفیگ بالا را کپی کرده و در نرم‌افزار v2rayNG (اندروید) یا Sing-box / Streisand (آیفون) وارد نمایید.`
          : `🎉 VPN subscription purchased successfully!\n\n💳 Price Deducted: ${selectedPlanToBuy.price.toLocaleString()} Toman\n💰 Remaining Balance: ${newBal.toLocaleString()} Toman\n\n🔑 Your Dedicated VLESS Subscription Link:\n\n<code>${mockSub.subLink}</code>\n\nCopy the link above and paste it in client apps like NapsternetV, v2rayNG, or Streisand.`;
        
        addBotReply(confirmMsg, 1000, [
          [t.btnBuyPlan, t.btnMyAccount],
          [t.btnTopUp, t.btnSupport]
        ]);
      } else {
        setSelectedPlanToBuy(null);
        addBotReply(
          lang === "fa" 
            ? "متأسفانه خطایی در پرداخت رخ داد. موجودی کیف پول خود را بررسی کنید." 
            : "Sorry, checkout error occurred. Please verify wallet balance.", 
          500, 
          [
            [t.btnBuyPlan, t.btnMyAccount],
            [t.btnTopUp, t.btnSupport]
          ]
        );
      }
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
        <div className="w-full max-w-[420px] aspect-[9/18.5] bg-[#0c0d14] rounded-[44px] border-[8px] border-[#1e293b] shadow-[0_0_80px_rgba(0,0,0,0.8)] relative flex flex-col overflow-hidden">
          
          {/* Phone Top Notch Speaker */}
          <div className="absolute top-0 inset-x-0 h-7 flex items-center justify-center z-30 pointer-events-none">
            <div className="w-24 h-4 bg-[#1e293b] rounded-b-2xl flex justify-center items-center">
              <div className="w-8 h-1 bg-black rounded-full mb-1"></div>
            </div>
          </div>

          {/* Chat Header */}
          <div className="bg-[#111827] border-b border-[#1f2937] pt-8 p-3 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                DL
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">{lang === "fa" ? "ربات تلگرام دالتون 🤖" : "Daltoon VPN Bot 🤖"}</h4>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 leading-none mt-0.5">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                  {lang === "fa" ? "ربات فعال است (bot.py)" : "bot.py polling active"}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono font-semibold py-0.5 px-2 bg-slate-800 text-slate-400 rounded-md">
              @daltoon_vpn_bot
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
                    {m.text}
                    
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
              <div className="grid grid-cols-2 gap-1.5">
                {messages[messages.length - 1].keyboard?.flatMap(row => row).map((buttonText) => (
                  <button
                    key={buttonText}
                    onClick={() => handleKeyboardClick(buttonText)}
                    className="py-2.5 px-2 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-gray-200 font-semibold hover:bg-slate-800 hover:text-white transition cursor-pointer text-center"
                  >
                    {buttonText}
                  </button>
                ))}
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
