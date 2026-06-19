import re

with open("src/components/BotSimulator.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Replace getKeyboard() usages for the main menu with inlineButtons.
# In `BotSimulator.tsx`, `getKeyboard()` returns `string[][]`.
# Inline buttons are `({text: string, action: string} | ...)[]` 

# 1. Update getKeyboard() to return []
code = code.replace("return [...dynamicKeyboard, ...customRows];", "return [];")

# 2. Add getInlineKeyboard()
inline_kb = """
  const getInlineKeyboard = () => {
    const layout = settings?.keyboardLayout || "stepped";
    const defaultOrder = [
      "btnBuyNew", "btnMySubs", "btnGuides", "btnProfile", "btnWallet", "btnSupport", "btnFreeTest", "btnInstantSupport", "btnFeedback", "btnReferral"
    ];
    let order = [...(settings?.mainButtonsOrder || defaultOrder)];
    if (!order.includes("btnWallet")) order.push("btnWallet");
    if (!order.includes("btnReferral")) order.push("btnReferral");

    const buttons: {text: string, action: string}[] = [];
    order.forEach(key => {
      if (key === "btnBuyNew" && !settings?.hideBtnBuyNew) buttons.push({text: settings?.btnTextBuyNew || "🛒 خرید اشتراک جدید", action: "mm_btnBuyNew"});
      else if (key === "btnMySubs" && !settings?.hideBtnMySubs) buttons.push({text: settings?.btnTextMySubs || "🗂 اشتراک های من / تمدید", action: "mm_btnMySubs"});
      else if (key === "btnGuides" && !settings?.hideBtnGuides) buttons.push({text: settings?.btnTextGuides || "💡 آموزش ها", action: "mm_btnGuides"});
      else if (key === "btnProfile" && !settings?.hideBtnProfile) buttons.push({text: settings?.btnTextProfile || "👤 حساب کاربری", action: "mm_btnProfile"});
      else if (key === "btnWallet" && !settings?.hideBtnWallet) buttons.push({text: settings?.btnTextWallet || "💵 کیف پول + شارژ", action: "mm_btnWallet"});
      else if (key === "btnSupport" && !settings?.hideBtnSupport) buttons.push({text: settings?.btnTextSupport || "🎧 پشتیبانی", action: "mm_btnSupport"});
      else if (key === "btnFreeTest" && !settings?.hideBtnFreeTest) buttons.push({text: settings?.btnTextFreeTest || "🎁 موجودی رایگان", action: "mm_btnFreeTest"});
      else if (key === "btnInstantSupport" && !settings?.hideBtnInstantSupport) buttons.push({text: settings?.btnTextInstantSupport || "🤖 پشتیبانی آنی", action: "mm_btnInstantSupport"});
      else if (key === "btnFeedback" && !settings?.hideBtnFeedback) buttons.push({text: settings?.btnTextFeedback || "💌 بازخورد کاربر ها", action: "mm_btnFeedback"});
      else if (key === "btnReferral" && !settings?.hideBtnReferral) buttons.push({text: settings?.btnTextReferral || "👥 زیرمجموعه گیری", action: "mm_btnReferral"});
    });

    const dynamicKeyboard: {text: string, action: string}[][] = [];
    if (layout === "vertical") {
      buttons.forEach(b => dynamicKeyboard.push([b]));
    } else {
      let idx = 0;
      while (idx < buttons.length) {
        if (layout === "stepped" && idx === 0) {
          dynamicKeyboard.push([buttons[idx]]);
          idx += 1;
        } else if (idx + 1 < buttons.length) {
          dynamicKeyboard.push([buttons[idx], buttons[idx + 1]]);
          idx += 2;
        } else {
          dynamicKeyboard.push([buttons[idx]]);
          idx += 1;
        }
      }
    }

    const customLabels = customButtons.map((cb, idx) => ({text: cb.text, action: `mm_custom_${idx}`}));
    const customRows: {text: string, action: string}[][] = [];
    for (let i = 0; i < customLabels.length; i += 2) {
      customRows.push(customLabels.slice(i, i + 2));
    }
    
    return [...dynamicKeyboard, ...customRows];
  };
"""
code = code.replace("const getKeyboard = () => {", inline_kb + "\n  const getKeyboard = () => {")

# 3. Use inline keyboard in start effect
code = code.replace("keyboard: getKeyboard()", "keyboard: [], inlineButtons: getInlineKeyboard()")

# But if we search and replace, we might replace keyboard everywhere!
# We can replace all usages of text matching with checking `text === ...` or `action === mm_btnBuyNew`
code = code.replace("text === settings?.btnTextBuyNew || text === \\\"🛒 خرید اشتراک جدید\\\"", "action === 'mm_btnBuyNew' || text === settings?.btnTextBuyNew || text === \\\"🛒 خرید اشتراک جدید\\\"")
code = code.replace("text === settings?.btnTextProfile || text === \\\"👤 حساب کاربری\\\"", "action === 'mm_btnProfile' || text === settings?.btnTextProfile || text === \\\"👤 حساب کاربری\\\"")
code = code.replace("text === settings?.btnTextMySubs || text === \\\"🗂 اشتراک های من / تمدید\\\"", "action === 'mm_btnMySubs' || text === settings?.btnTextMySubs || text === \\\"🗂 اشتراک های من / تمدید\\\"")
code = code.replace("text === settings?.btnTextWallet || text === \\\"💵 کیف پول + شارژ\\\"", "action === 'mm_btnWallet' || text === settings?.btnTextWallet || text === \\\"💵 کیف پول + شارژ\\\"")
code = code.replace("text === settings?.btnTextSupport || text === \\\"🎧 پشتیبانی\\\"", "action === 'mm_btnSupport' || text === settings?.btnTextSupport || text === \\\"🎧 پشتیبانی\\\"")
code = code.replace("text === settings?.btnTextFreeTest || text === \\\"🎁 موجودی رایگان\\\"", "action === 'mm_btnFreeTest' || text === settings?.btnTextFreeTest || text === \\\"🎁 موجودی رایگان\\\"")
code = code.replace("text === settings?.btnTextReferral || text === \\\"👥 زیرمجموعه گیری\\\"", "action === 'mm_btnReferral' || text === settings?.btnTextReferral || text === \\\"👥 زیرمجموعه گیری\\\"")


# We also need to add an optional `action?: string` parameter to `handleUserAction`
code = code.replace("const handleUserAction = (text: string) => {", "const handleUserAction = (text: string, action?: string) => {")

# Modify Bot message replacement: remove old keyboard assignment. 
# Wait, changing ` BotSimulator.tsx` using python script is fragile because of typescript parsing.

with open("src/components/BotSimulator.tsx", "w", encoding="utf-8") as f:
    f.write(code)

