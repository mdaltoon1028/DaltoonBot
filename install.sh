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
    if [ -f "$dir/.env" ] && [ -s "$dir/.env" ]; then
        echo -e "${GREEN}Backing up .env configuration from $dir...${NC}"
        cp "$dir/.env" "$BACKUP_DIR/.env_backup"
    fi
    if [ -f "$dir/Daltoon_Bot.json" ] && [ -s "$dir/Daltoon_Bot.json" ]; then
        echo -e "${GREEN}Backing up bot database from $dir/Daltoon_Bot.json...${NC}"
        cp "$dir/Daltoon_Bot.json" "$BACKUP_DIR/Daltoon_Bot.json"
    fi
    if [ -f "$dir/database.json" ] && [ -s "$dir/database.json" ]; then
        echo -e "${GREEN}Backing up legacy database.json from $dir...${NC}"
        cp "$dir/database.json" "$BACKUP_DIR/database.json"
    fi
    if [ -f "$dir/db.json" ] && [ -s "$dir/db.json" ]; then
        echo -e "${GREEN}Backing up legacy db.json from $dir...${NC}"
        cp "$dir/db.json" "$BACKUP_DIR/db.json"
    fi
    if [ -f "$dir/bot_database.json" ] && [ -s "$dir/bot_database.json" ]; then
        echo -e "${GREEN}Backing up legacy bot_database.json from $dir...${NC}"
        cp "$dir/bot_database.json" "$BACKUP_DIR/bot_database.json"
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
if [ -f "$BACKUP_DIR/.env_backup" ]; then
    echo -e "${GREEN}Restoring .env configuration from backup...${NC}"
    cp "$BACKUP_DIR/.env_backup" ".env" 2>/dev/null
    cp "$BACKUP_DIR/.env_backup" "/opt/daltoon-store/.env" 2>/dev/null
fi
if [ -f "$BACKUP_DIR/database.json" ]; then
    echo -e "${GREEN}Restoring database.json from backup...${NC}"
    cp "$BACKUP_DIR/database.json" "database.json" 2>/dev/null
    cp "$BACKUP_DIR/database.json" "/opt/daltoon-store/database.json" 2>/dev/null
fi
if [ -f "$BACKUP_DIR/db.json" ]; then
    echo -e "${GREEN}Restoring db.json from backup...${NC}"
    cp "$BACKUP_DIR/db.json" "db.json" 2>/dev/null
    cp "$BACKUP_DIR/db.json" "/opt/daltoon-store/db.json" 2>/dev/null
fi
if [ -f "$BACKUP_DIR/bot_database.json" ]; then
    echo -e "${GREEN}Restoring bot_database.json from backup...${NC}"
    cp "$BACKUP_DIR/bot_database.json" "bot_database.json" 2>/dev/null
    cp "$BACKUP_DIR/bot_database.json" "/opt/daltoon-store/bot_database.json" 2>/dev/null
fi
if [ -f "$BACKUP_DIR/Daltoon_Bot.json" ]; then
    echo -e "${GREEN}Restoring Daltoon_Bot.json from backup...${NC}"
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

# Load current credentials from existing configuration if any
CONFIG_DATA=$(node -e "
const fs = require('fs');
let user = 'Daltoon';
let pass = 'Daltoon';
let port = '3000';

const dbPaths = ['./Daltoon_Bot.json', '$INSTALL_DIR/Daltoon_Bot.json', './database.json', '$INSTALL_DIR/database.json', './db.json', '$INSTALL_DIR/db.json', './bot_database.json', '$INSTALL_DIR/bot_database.json'];

function getScore(p) {
  try {
    if (!fs.existsSync(p)) return -1;
    const stat = fs.statSync(p);
    const content = fs.readFileSync(p, 'utf8').trim();
    if (!content || content === '{}' || content === '[]') return -1;
    const parsed = JSON.parse(content);
    let score = 0;
    if (Array.isArray(parsed.users) && parsed.users.length > 0) score += parsed.users.length * 10;
    if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) score += parsed.transactions.length * 10;
    if (parsed.settings && parsed.settings.panel_config) {
      const pc = typeof parsed.settings.panel_config === 'string' ? JSON.parse(parsed.settings.panel_config) : parsed.settings.panel_config;
      if (pc.botToken && pc.botToken !== 'DUMMY_TOKEN') score += 100;
      if (pc.dashboardUsername) score += 50;
    }
    return score > 0 ? (score * 1000000) + stat.size : -1;
  } catch(e) { return -1; }
}

let bestFile = null;
let bestScore = -1;
for (const p of dbPaths) {
  const score = getScore(p);
  if (score > bestScore) { bestScore = score; bestFile = p; }
}

if (bestFile) {
  try {
    const parsed = JSON.parse(fs.readFileSync(bestFile, 'utf8'));
    if (parsed.settings) {
      if (parsed.settings.dashboardUsername) user = parsed.settings.dashboardUsername;
      if (parsed.settings.dashboardPassword) pass = parsed.settings.dashboardPassword;
      if (parsed.settings.serverPort) port = parsed.settings.serverPort.toString();
      
      if (parsed.settings.panel_config) {
        const pc = typeof parsed.settings.panel_config === 'string' ? JSON.parse(parsed.settings.panel_config) : parsed.settings.panel_config;
        if (pc) {
          if (pc.dashboardUsername) user = pc.dashboardUsername;
          if (pc.dashboardPassword) pass = pc.dashboardPassword;
          if (pc.serverPort) port = pc.serverPort.toString();
        }
      }
    }
  } catch(e){}
}

console.log(user + '|' + pass + '|' + port);
" | tr -d '\n')

IFS='|' read -r CURRENT_USER CURRENT_PASS CURRENT_PORT <<< "$CONFIG_DATA"

if [ -c /dev/tty ]; then
    read -p "Enter Admin Username [$CURRENT_USER]: " DASH_USER < /dev/tty
    read -s -p "Enter Admin Password [$CURRENT_PASS]: " DASH_PASS < /dev/tty
    echo ""
    read -p "Enter Server Port [$CURRENT_PORT]: " DASH_PORT < /dev/tty
else
    read -p "Enter Admin Username [$CURRENT_USER]: " DASH_USER
    read -s -p "Enter Admin Password [$CURRENT_PASS]: " DASH_PASS
    echo ""
    read -p "Enter Server Port [$CURRENT_PORT]: " DASH_PORT
fi

DASH_USER=${DASH_USER:-$CURRENT_USER}
DASH_PASS=${DASH_PASS:-$CURRENT_PASS}
DASH_PORT=${DASH_PORT:-$CURRENT_PORT}

echo -e "${YELLOW}Saving configuration to database...${NC}"
node -e "
const fs = require('fs');
const dbPath = '$INSTALL_DIR/Daltoon_Bot.json';
let db = {};
let parseError = false;
if (fs.existsSync(dbPath)) {
  try { 
    const content = fs.readFileSync(dbPath, 'utf8');
    if (content && content.trim()) {
      db = JSON.parse(content) || {};
    }
  } catch(e){
    console.error('CRITICAL: Failed to parse existing database JSON. Aborting configuration write to prevent data loss!');
    parseError = true;
  }
}

if (parseError) {
  process.exit(1);
}

// Ensure standard keys are preserved/created to avoid any data loss or blank UI
if (!db.users) db.users = [];
if (!db.transactions) db.transactions = [];
if (!db.subscription_keys) db.subscription_keys = [];
if (!db.vpn_plans) db.vpn_plans = [];
if (!db.custom_buttons) db.custom_buttons = [];
if (!db.plan_categories) db.plan_categories = [];

if (!db.settings) db.settings = {};

// Merge existing config if present
let ps = {};
if (db.settings.panel_config) {
  try {
    ps = typeof db.settings.panel_config === 'string' ? JSON.parse(db.settings.panel_config) : db.settings.panel_config;
  } catch(e) {}
}

// Preserve old credentials if they are missing from prompt but in DB
const newConfig = {
  ...ps,
  dashboardUsername: '$DASH_USER',
  dashboardPassword: '$DASH_PASS',
  serverPort: parseInt('$DASH_PORT')
};

db.settings.dashboardUsername = '$DASH_USER';
db.settings.dashboardPassword = '$DASH_PASS';
db.settings.serverPort = parseInt('$DASH_PORT');
db.settings.panel_config = JSON.stringify(newConfig);
if (!db.users) db.users = [];
if (!db.transactions) db.transactions = [];
if (!db.subscription_keys) db.subscription_keys = [];
if (!db.vpn_plans) db.vpn_plans = [];
if (!db.colleague_packages) db.colleague_packages = [];
if (!db.colleague_accounts) db.colleague_accounts = [];
if (!db.colleague_categories) db.colleague_categories = [];
if (!db.inbounds) db.inbounds = [];
if (!db.custom_buttons) db.custom_buttons = [];
if (!db.gift_codes) db.gift_codes = [];
if (!db.promo_codes) db.promo_codes = [];
if (!db.tickets) db.tickets = [];
if (!db.plan_categories) db.plan_categories = [];

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
"

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
