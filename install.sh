#!/bin/bash

# --- Daltoon Store Auto-Installation Script ---
# Designed for Ubuntu / Debian systems

# Colors for terminal styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Daltoon Store Auto-Installer ===${NC}"
echo -e "${YELLOW}Starting installation process... Please wait.${NC}"

# 1. Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run this script with sudo or as root user!${NC}"
  exit 1
fi

# 2. Update packages
echo -e "${GREEN}[1/6] Updating system packages...${NC}"
apt update && apt upgrade -y
apt install -y curl git build-essential ufw

# 3. Install Node.js v20 LTS
if ! command -v node &> /dev/null; then
    echo -e "${GREEN}[2/6] Node.js is not installed. Installing Node.js LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo -e "${GREEN}[2/6] Node.js is already installed: $(node -v)${NC}"
fi

# 4. Check if we are running inside cloned folder or need to clone
BACKUP_DIR="/tmp/daltoon_db_backup"
mkdir -p "$BACKUP_DIR"

# Backup databases if they exist anywhere to verify persistence
for dir in "/opt/daltoon-store" "$(pwd)" "$HOME" "/root" "/root/daltoon" "/root/DaltoonBot"; do
    if [ -f "$dir/Daltoon_Bot.json" ] && [ -s "$dir/Daltoon_Bot.json" ]; then
        echo -e "${GREEN}Backing up bot database from $dir/Daltoon_Bot.json...${NC}"
        cp "$dir/Daltoon_Bot.json" "$BACKUP_DIR/Daltoon_Bot.json"
        break
    elif [ -f "$dir/bot_database.json" ] && [ -s "$dir/bot_database.json" ]; then
        echo -e "${GREEN}Migrating legacy bot_database.json from $dir to Daltoon_Bot.json...${NC}"
        cp "$dir/bot_database.json" "$BACKUP_DIR/Daltoon_Bot.json"
        break
    fi
done

for dir in "/opt/daltoon-store" "$(pwd)" "$HOME" "/root" "/root/daltoon" "/root/DaltoonBot"; do
    if [ -f "$dir/database.json" ] && [ -s "$dir/database.json" ]; then
        echo -e "${GREEN}Backing up server database from $dir/database.json...${NC}"
        cp "$dir/database.json" "$BACKUP_DIR/database.json"
        break
    fi
done

if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}No package.json detected in the current directory.${NC}"
    DEFAULT_REPO="https://github.com/mdaltoon1028/DaltoonBot"
    
    # Use the first command line argument as REPO_URL, otherwise fall back to DEFAULT_REPO
    REPO_URL=${1:-$DEFAULT_REPO}

    # If the directory exists and has a git repository, let's update it in-place!
    if [ -d "/opt/daltoon-store/.git" ]; then
        echo -e "${GREEN}[3/6] Existing installation found. Updating repository securely...${NC}"
        cd /opt/daltoon-store || exit
        git remote set-url origin "$REPO_URL" &> /dev/null
        git fetch --all
        git reset --hard origin/main || git reset --hard origin/master
    else
        echo -e "${GREEN}[3/6] Cloning repository from $REPO_URL...${NC}"
        # Remove older clone if exists to prevent conflicts
        if [ -d "/opt/daltoon-store" ]; then
            echo -e "${YELLOW}Removing existing directory at /opt/daltoon-store...${NC}"
            rm -rf /opt/daltoon-store
        fi
        git clone "$REPO_URL" /opt/daltoon-store
        cd /opt/daltoon-store || exit
    fi
else
    echo -e "${GREEN}[3/6] package.json detected. Skipping git clone...${NC}"
fi

# Restore databases if backups exist to both current dir & opt-store targets
if [ -f "$BACKUP_DIR/database.json" ]; then
    echo -e "${GREEN}Restoring server database from backup...${NC}"
    cp "$BACKUP_DIR/database.json" "database.json" 2>/dev/null
    cp "$BACKUP_DIR/database.json" "/opt/daltoon-store/database.json" 2>/dev/null
fi
if [ -f "$BACKUP_DIR/Daltoon_Bot.json" ]; then
    echo -e "${GREEN}Restoring bot database from backup...${NC}"
    cp "$BACKUP_DIR/Daltoon_Bot.json" "Daltoon_Bot.json" 2>/dev/null
    cp "$BACKUP_DIR/Daltoon_Bot.json" "/opt/daltoon-store/Daltoon_Bot.json" 2>/dev/null
fi

# 5. Install Node-modules and Build project
echo -e "${GREEN}[4/6] Installing dependencies...${NC}"
npm install

echo -e "${GREEN}[5/6] Building frontend & server targets...${NC}"
npm run build

# Ensure Python 3 dependencies are completely satisfied
echo -e "${GREEN}Installing Python 3 dependencies...${NC}"
if ! command -v pip3 &> /dev/null; then
    apt install -y python3-pip || apt install -y python3-setuptools || true
fi
pip3 install pyTelegramBotAPI python-dotenv requests --break-system-packages || pip install pyTelegramBotAPI python-dotenv requests || true

# 5.5 Configure Dashboard Credentials
echo -e "${YELLOW}=== Configure Dashboard Settings ===${NC}"

INSTALL_DIR=$(pwd)
if [ -d "/opt/daltoon-store" ]; then
    INSTALL_DIR="/opt/daltoon-store"
fi

ALREADY_CONFIGURED=$(node -e "
const fs = require('fs');
const dbPath = '$INSTALL_DIR/Daltoon_Bot.json';
let db = {};
try { db = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch(e){}
let hasConfig = false;
if (db.settings && db.settings.panel_config) {
  try {
    const pc = JSON.parse(db.settings.panel_config);
    if (pc.dashboardUsername && pc.dashboardPassword && pc.serverPort) hasConfig = true;
  } catch(e){}
}
console.log(hasConfig);
")

if [ "$ALREADY_CONFIGURED" = "true" ]; then
    echo -e "${GREEN}Existing configuration found! Preserving previous Username, Password, and Port...${NC}"
    DASH_PORT=$(node -e "
      const fs = require('fs');
      try {
        const db = JSON.parse(fs.readFileSync('$INSTALL_DIR/Daltoon_Bot.json', 'utf8'));
        const pc = JSON.parse(db.settings.panel_config);
        console.log(pc.serverPort || 3000);
      } catch(e) { console.log(3000); }
    ")
else
    read -p "Enter Admin Username [Daltoon]: " DASH_USER < /dev/tty
    DASH_USER=${DASH_USER:-Daltoon}

    read -s -p "Enter Admin Password [Daltoon]: " DASH_PASS < /dev/tty
    echo ""
    DASH_PASS=${DASH_PASS:-Daltoon}

    read -p "Enter Server Port [3000]: " DASH_PORT < /dev/tty
    DASH_PORT=${DASH_PORT:-3000}

    echo -e "${YELLOW}Saving configuration to database...${NC}"
    node -e "
    const fs = require('fs');
    const dbPath = '$INSTALL_DIR/Daltoon_Bot.json';
    let db = {};
    if (fs.existsSync(dbPath)) {
      try { 
        const content = fs.readFileSync(dbPath, 'utf8');
        if (content && content.trim()) {
          db = JSON.parse(content) || {};
        }
      } catch(e){}
    }
    
    // Ensure standard keys are preserved/created to avoid any data loss or blank UI
    if (!db.users) db.users = [];
    if (!db.transactions) db.transactions = [];
    if (!db.subscription_keys) db.subscription_keys = [];
    if (!db.vpn_plans || db.vpn_plans.length === 0) {
      db.vpn_plans = [
        { id: 'std_1m_30g', name: 'یک‌ماهه ۳۰ گیگابایت', durationDays: 30, trafficGb: 30, price: 60000, category: 'Standard' },
        { id: 'std_1m_50g', name: 'یک‌ماهه ۵۰ گیگابایت', durationDays: 30, trafficGb: 50, price: 90000, category: 'Standard' },
        { id: 'std_1m_100g', name: 'یک‌ماهه ۱۰۰ گیگابایت', durationDays: 30, trafficGb: 100, price: 150000, category: 'Standard' },
        { id: 'vip_1m_50g', name: 'وی‌آی‌پی یک‌ماهه ۵۰ گیگابایت', durationDays: 30, trafficGb: 50, price: 110000, category: 'Vip' },
        { id: 'vip_1m_100g', name: 'وی‌آی‌پی یک‌ماهه ۱۰۰ گیگابایت', durationDays: 30, trafficGb: 100, price: 180000, category: 'Vip' },
        { id: 'vip_3m_200g', name: 'وی‌آی‌پی سه‌ماهه ۲۰۰ گیگابایت', durationDays: 90, trafficGb: 200, price: 320000, category: 'Vip' },
        { id: 'unl_1m_unlimit', name: 'یک‌ماهه نامحدود', durationDays: 30, trafficGb: 0, price: 250000, category: 'Unlimited' }
      ];
    }
    if (!db.custom_buttons || db.custom_buttons.length === 0) {
      db.custom_buttons = [
        { id: 'cb_gift', text: '🎁 تست رایگان ۲ ساعته', replyText: 'کاربر گرامی، بدین وسیله یک اکانت تست ۲ ساعته با حجم ۲۰۰ مگابایت برای شما تولید شد:\\n\\nvless://f39281a1-9b1d-4050-b498-3882aef1277a@example.com:2052?security=reality&sni=google.com&fp=chrome#GiftTest' },
        { id: 'cb_channel', text: '📢 کانال تلگرام', replyText: 'دوست گرامی! برای عضویت در گروه حل مشکلات و مطلع شدن از آخرین اخبار و پایداری شبکه روی پیوند زیر ضربه بزنید:\\n\\n👉 @example_channel' }
      ];
    }
    if (!db.plan_categories || db.plan_categories.length === 0) {
      db.plan_categories = [
        { id: '1', name: 'Standard', emoji: '⚡️' },
        { id: '2', name: 'Vip', emoji: '⭐️' },
        { id: '3', name: 'Unlimited', emoji: '🚀' }
      ];
    }
    
    let panel_config = {};
    if (db.settings && db.settings.panel_config) {
      try { 
        panel_config = typeof db.settings.panel_config === 'string' ? JSON.parse(db.settings.panel_config) : db.settings.panel_config; 
      } catch(e){}
    }
    
    panel_config.dashboardUsername = '$DASH_USER';
    panel_config.dashboardPassword = '$DASH_PASS';
    panel_config.serverPort = Number('$DASH_PORT');
    
    if (!db.settings) db.settings = {};
    db.settings.panel_config = JSON.stringify(panel_config);
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    "
fi

# Allow custom port through firewall
echo -e "${YELLOW}Configuring firewall for port $DASH_PORT...${NC}"
ufw allow $DASH_PORT/tcp > /dev/null 2>&1 || true
iptables -I INPUT -p tcp --dport $DASH_PORT -j ACCEPT > /dev/null 2>&1 || true

# 6. Install PM2 and Start Server
echo -e "${GREEN}[6/6] Setting up process manager PM2...${NC}"
npm install -g pm2

# Clear previous pm2 instances if any exist
pm2 delete daltoon-store &> /dev/null
pm2 delete daltoon-bot &> /dev/null

# Start production server and python telegram bot
INSTALL_DIR=$(pwd)
if [ -d "/opt/daltoon-store" ]; then
    INSTALL_DIR="/opt/daltoon-store"
fi

pm2 start "$INSTALL_DIR/dist/server.cjs" --name "daltoon-store" --cwd "$INSTALL_DIR"
pm2 start "$INSTALL_DIR/bot.py" --name "daltoon-bot" --interpreter python3 --cwd "$INSTALL_DIR"
pm2 save
pm2 startup

# 7. Configure simple Firewall rules if wanted
echo -e "${YELLOW}Configuring firewall (opening port ${DASH_PORT})...${NC}"
ufw allow ${DASH_PORT}/tcp

# 8. Setup daltoon-dashboard system CLI globally
echo -e "${YELLOW}Setting up global CLI command (daltoon-dashboard)...${NC}"
if [ -f "/opt/daltoon-store/daltoon-dashboard" ]; then
    chmod +x /opt/daltoon-store/daltoon-dashboard
    ln -sf /opt/daltoon-store/daltoon-dashboard /usr/local/bin/daltoon-dashboard
elif [ -f "daltoon-dashboard" ]; then
    chmod +x daltoon-dashboard
    ln -sf "$(pwd)/daltoon-dashboard" /usr/local/bin/daltoon-dashboard
fi

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}🎉 Daltoon Store Dashboard Installed Successfully!${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "You can now access your web panel at:"
echo -e "${BLUE}👉 http://$(curl -s https://api.ipify.org):${DASH_PORT}${NC}"
echo -e ""
echo -e "To manage credentials, admins or ports, type: ${YELLOW}daltoon-dashboard${NC}"
echo -e "To view logs, type: ${YELLOW}pm2 logs daltoon-store${NC}"
echo -e "To restart application, type: ${YELLOW}pm2 restart daltoon-store${NC}"
echo -e "===================================================="
