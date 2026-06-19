export interface PanelSettings {
  botToken: string;
  baseUrl: string;
  subUrl?: string;
  panelUrl: string;
  panelUsername: string;
  panelPassword: string;
  activeInboundIds: number[];
  ownerId: number;
  cardNumber?: string;
  cardHolder?: string;
  bankName?: string;
  welcomeText?: string;
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
  hideBtnFreeTest?: boolean;
  btnTextFreeTest?: string;
  hideBtnInstantSupport?: boolean;
  btnTextInstantSupport?: string;
  hideBtnFeedback?: boolean;
  btnTextFeedback?: string;
  dashboardUsername?: string;
  dashboardPassword?: string;
  serverPort?: number;
  autoRefreshInterval?: number;
  keyboardLayout?: "horizontal" | "vertical" | "stepped";
  purchaseSuccessNote?: string;
  panelConnectionActive?: boolean;
  admins?: Array<{
    id: string;
    userId: number;
    username: string;
    role: "admin" | "super_admin";
    createdAt: string;
  }>;
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

