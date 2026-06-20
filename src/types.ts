export interface PanelSettings {
  botToken: string;
  baseUrl: string;
  subUrl?: string;
  panelUrl: string;
  panelUsername: string;
  panelPassword: string;
  activeInboundIds: number[];
  ownerId: number;
  geminiApiKey?: string;
  cardNumber?: string;
  cardHolder?: string;
  bankName?: string;
  welcomeText?: string;
  guidesText?: string;
  supportText?: string;
  tgChannel?: string;
  supportHandle?: string;
  hideBtnBuyNew?: boolean;
  btnTextBuyNew?: string;
  hideBtnMySubs?: boolean;
  btnTextMySubs?: string;
  hideBtnGuides?: boolean;
  btnTextGuides?: string;
  hideBtnProfile?: boolean;
  btnTextProfile?: string;
  hideBtnSupport?: boolean;
  btnTextSupport?: string;
  hideBtnTicketSupport?: boolean;
  btnTextTicketSupport?: string;
  hideBtnFreeTest?: boolean;
  btnTextFreeTest?: string;
  isFreeTestActive?: boolean;
  freeTestDisabledMessage?: string;
  hideBtnInstantSupport?: boolean;
  btnTextInstantSupport?: string;
  hideBtnFeedback?: boolean;
  btnTextFeedback?: string;
  btnTextWallet?: string;
  hideBtnWallet?: boolean;
  btnTextReferral?: string;
  hideBtnReferral?: boolean;
  btnTextColleagues?: string;
  hideBtnColleagues?: boolean;
  btnTextAiChat?: string;
  hideBtnAiChat?: boolean;
  botTelegramHandle?: string;
  referralRewardAmount?: number;
  referralRewardPercent?: number; // Kept as invite percent
  referralPurchasePercent?: number; // New: Purchase percent
  referralL2Percent?: number;
  referralL3Percent?: number;
  referralL4Percent?: number;
  referralRewardCondition?: 'invite' | 'purchase' | 'both';
  referralBaseAmount?: number;
  referralMessage?: string;
  dashboardUsername?: string;
  dashboardPassword?: string;
  hideSupport?: boolean;
  hideBuy?: boolean;
  hideProfile?: boolean;
  hideWallet?: boolean;
  serverPort?: number;
  autoRefreshInterval?: number;
  keyboardLayout?: "horizontal" | "vertical" | "stepped";
  mainButtonsOrder?: string[];
  purchaseSuccessNote?: string;
  panelConnectionActive?: boolean;

  // New Payment Gateways
  gatewayPlisioWallet?: string;
  gatewayNowpaymentsKey?: string;
  gatewayCryptomusKey?: string;
  gatewayCryptomusMerchantId?: string;
  gatewayHeleketWallet?: string;
  gatewayStarsStatus?: boolean;

  // Auto Warning config
  autoWarningConfigBtn?: boolean;
  autoWarningNoConnectionBtn?: boolean;
  autoWarningFirstConnectionBtn?: boolean;

  // Mandatory Join Config
  mandatoryJoinActive?: boolean;
  mandatoryJoinChannel?: string;
  mandatoryJoinText?: string;

  admins?: Array<{
    id: string;
    userId: number;
    username: string;
    role: "admin" | "super_admin";
    createdAt: string;
  }>;

  // Auto Backup
  autoBackupEnabled?: boolean;
  autoBackupInterval?: string;
}

export interface InboundInfo {
  id: number;
  remark: string;
  protocol: "vless" | "vmess" | "trojan" | "shadowsocks";
  port: number;
  totalClients: number;
  trafficUsed: string; // in GB
  trafficLimit: string; // in GB
  status: "active" | "inactive";
}

export interface User {
  userId: number; // Telegram User ID
  username: string;
  walletBalance: number; // in Toman
  activePlansCount: number;
  joinDate: string;
  status: "active" | "banned";
}

export interface Transaction {
  id: string;
  userId: number;
  username: string;
  amount: number; // in Toman
  receiptImage: string; // Mock SVG or placeholder image base64
  status: "pending" | "approved" | "rejected";
  date: string;
  description?: string;
}

export interface VpnPlan {
  id: string;
  name: string;
  durationDays: number;
  trafficGb: number;
  price: number; // in Toman
  category: "Standard" | "VIP" | "Unlimited VoIP";
  configStock?: string[];
}

export interface SubscriptionKey {
  id: string;
  userId: number;
  planId: string;
  planName: string;
  clientName?: string;
  subLink: string;
  expireDate: string;
  trafficLimitGb: number;
  trafficUsedGb: number;
  colleagueAccountId?: string;
  status: "active" | "expired" | "suspended";
}

export interface CustomButton {
  id: string;
  text: string;
  replyText: string;
}

export interface GiftCode {
  id: string;
  code: string;
  amount: number;
  totalUsage: number;
  maxUsage: number;
  usedBy: number[];
  createdAt: string;
}

export interface ColleaguePackage {
  id: string;
  title: string;
  price: number;
  trafficGb: number;
  description: string;
}

export interface ColleagueAccount {
  id: string;
  userId?: number;
  username: string;
  password: string;
  packageId: string;
  packageTitle: string;
  createdAt: string;
  trafficGb: number;
  usedTrafficGb?: number;
  realUsedTrafficGb?: number;
  prefix: string;
  status: "active" | "expired" | "suspended";
}

export interface BotActionLog {
  id: string;
  date: string;
  userId?: number;
  username?: string;
  action: string;
  details: string;
}

export interface PromoCode {
  id: string;
  code: string;
  type: "percent" | "extend_days";
  value: number; // discount percent or days of free extension
  maxUsage: number;
  totalUsage: number;
  usedBy: number[];
  createdAt: string;
}

export interface TicketMessage {
  sender: "user" | "admin";
  message: string;
  date: string;
}

export interface Ticket {
  id: string; // unique tracking number
  userId: number;
  username: string;
  subject: string;
  status: "open" | "answered" | "closed";
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}


