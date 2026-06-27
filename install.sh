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
echo -e "${YELLOW}Searching the system for any existing Daltoon databases...${NC}"

# Define candidate directories first (these are fast)
CANDIDATE_DIRS=("/opt/daltoon-store" "$(pwd)" "$HOME" "/root" "/root/daltoon" "/root/DaltoonBot" "/root/daltoon-store" "/root/daltoon-bot" "/root/daltoonbot" "/root/Daltoon_Bot" "/opt/daltoon" "/opt/daltoon-bot" "/home/daltoon" "/var/www/daltoon" "/var/daltoon")

# Collect all files that exist in candidates
FOUND_FILES=()
for dir in "${CANDIDATE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        for f in "Daltoon_Bot.json" "database.json" "db.json" "bot_database.json" ".env"; do
            if [ -f "$dir/$f" ] && [ -s "$dir/$f" ]; then
                FOUND_FILES+=("$dir/$f")
            fi
        done
    fi
done

# Additionally, do a quick find across common root folders to be absolutely sure we don't miss anything
# Exclude system folders to keep it very fast and avoid hangs
ADDITIONAL_FIND=$(find /root /home /opt /var -maxdepth 4 -type f \( -name "Daltoon_Bot.json" -o -name "database.json" -o -name "db.json" -o -name "bot_database.json" -o -name ".env" \) 2>/dev/null | grep -vE "/proc|/sys|/dev|/var/lib/docker|/snap|/tmp|/run|/node_modules|/\.git")

for p in $ADDITIONAL_FIND; do
    FOUND_FILES+=("$p")
done

# De-duplicate the list of found files
UNIQUE_FILES=$(echo "${FOUND_FILES[@]}" | tr ' ' '\n' | sort -u)

for file_path in $UNIQUE_FILES; do
    filename=$(basename "$file_path")
    dirpath=$(dirname "$file_path")
    
    if [ "$filename" == ".env" ]; then
        echo -e "${GREEN}Found and backing up configuration .env from $dirpath...${NC}"
        cp "$file_path" "$BACKUP_DIR/.env_backup"
    elif [ "$filename" == "Daltoon_Bot.json" ]; then
        echo -e "${GREEN}Found and backing up database Daltoon_Bot.json from $dirpath...${NC}"
        cp "$file_path" "$BACKUP_DIR/Daltoon_Bot.json"
    elif [ "$filename" == "database.json" ]; then
        echo -e "${GREEN}Found and backing up database database.json from $dirpath...${NC}"
        cp "$file_path" "$BACKUP_DIR/database.json"
    elif [ "$filename" == "db.json" ]; then
        echo -e "${GREEN}Found and backing up database db.json from $dirpath...${NC}"
        cp "$file_path" "$BACKUP_DIR/db.json"
    elif [ "$filename" == "bot_database.json" ]; then
        echo -e "${GREEN}Found and backing up database bot_database.json from $dirpath...${NC}"
        cp "$file_path" "$BACKUP_DIR/bot_database.json"
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

node -e "
const fs = require('fs');
const path = require('path');

const backupDir = '$BACKUP_DIR';
const installDir = path.resolve(process.cwd());
const optDir = '/opt/daltoon-store';

const targetBackupFile = path.join(backupDir, 'Daltoon_Bot.json');
const legacyFiles = ['database.json', 'db.json', 'bot_database.json'];

function getScore(p) {
  try {
    if (!fs.existsSync(p)) return -1;
    const stat = fs.statSync(p);
    const content = fs.readFileSync(p, 'utf8').trim();
    if (!content || content === '{}' || content === '[]') return -1;
    const parsed = JSON.parse(content);
    let score = 1;
    if (Array.isArray(parsed.users) && parsed.users.length > 0) score += parsed.users.length * 10;
    if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) score += parsed.transactions.length * 10;
    if (parsed.settings) {
      if (parsed.settings.dashboardUsername) score += 20;
      if (parsed.settings.panel_config) {
        const pc = typeof parsed.settings.panel_config === 'string' ? JSON.parse(parsed.settings.panel_config) : parsed.settings.panel_config;
        if (pc.botToken && pc.botToken !== 'DUMMY_TOKEN') score += 100;
        if (pc.dashboardUsername) score += 50;
      }
    }
    return score > 0 ? (score * 1000000) + stat.size : -1;
  } catch(e) { return -1; }
}

// 1. Check if we have Daltoon_Bot.json in backup
let targetData = null;
if (getScore(targetBackupFile) > 0) {
  try {
    targetData = JSON.parse(fs.readFileSync(targetBackupFile, 'utf8'));
  } catch(e) {}
}

// 2. If no valid Daltoon_Bot.json found in backup, try to find the best legacy backup file
if (!targetData) {
  let bestFile = null;
  let bestScore = -1;
  for (const f of legacyFiles) {
    const p = path.join(backupDir, f);
    const score = getScore(p);
    if (score > bestScore) {
      bestScore = score;
      bestFile = p;
    }
  }
  if (bestFile) {
    try {
      console.log('[Installer Migration] Migrating legacy backup ' + bestFile + ' to unified Daltoon_Bot.json...');
      targetData = JSON.parse(fs.readFileSync(bestFile, 'utf8'));
    } catch(e) {}
  }
}

// 3. Write unified data to both current directory and opt directory
if (targetData) {
  const content = JSON.stringify(targetData, null, 2);
  fs.writeFileSync(path.join(installDir, 'Daltoon_Bot.json'), content, 'utf8');
  if (fs.existsSync(optDir)) {
    try {
      fs.writeFileSync(path.join(optDir, 'Daltoon_Bot.json'), content, 'utf8');
    } catch(e) {}
  }
  console.log('[Installer] Restored unified Daltoon_Bot.json database successfully.');
}

// 4. Delete all legacy database files from backup directory, current directory, and opt directory
for (const f of legacyFiles) {
  for (const dir of [backupDir, installDir, optDir]) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch(e) {}
    }
    const bak = p + '.bak';
    if (fs.existsSync(bak)) {
      try {
        fs.unlinkSync(bak);
      } catch(e) {}
    }
  }
}
"

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

const dbPaths = [
  './Daltoon_Bot.json', 
  '$INSTALL_DIR/Daltoon_Bot.json', 
  '/tmp/daltoon_db_backup/Daltoon_Bot.json',
  './database.json', 
  '$INSTALL_DIR/database.json', 
  '/tmp/daltoon_db_backup/database.json',
  './db.json', 
  '$INSTALL_DIR/db.json', 
  '/tmp/daltoon_db_backup/db.json',
  './bot_database.json', 
  '$INSTALL_DIR/bot_database.json',
  '/tmp/daltoon_db_backup/bot_database.json'
];

function getScore(p) {
  try {
    if (!fs.existsSync(p)) return -1;
    const stat = fs.statSync(p);
    const content = fs.readFileSync(p, 'utf8').trim();
    if (!content || content === '{}' || content === '[]') return -1;
    const parsed = JSON.parse(content);
    let score = 1; // Base score for a valid JSON file
    if (Array.isArray(parsed.users) && parsed.users.length > 0) score += parsed.users.length * 10;
    if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) score += parsed.transactions.length * 10;
    if (parsed.settings) {
      if (parsed.settings.dashboardUsername) score += 20;
      if (parsed.settings.panel_config) {
        const pc = typeof parsed.settings.panel_config === 'string' ? JSON.parse(parsed.settings.panel_config) : parsed.settings.panel_config;
        if (pc.botToken && pc.botToken !== 'DUMMY_TOKEN') score += 100;
        if (pc.dashboardUsername) score += 50;
      }
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

let is_update = bestScore > 0 ? '1' : '0';
console.log(user + '|' + pass + '|' + port + '|' + is_update);
" | tr -d '\n')

IFS='|' read -r CURRENT_USER CURRENT_PASS CURRENT_PORT IS_UPDATE <<< "$CONFIG_DATA"

if [ "$IS_UPDATE" == "1" ]; then
    echo -e "${GREEN}Existing configuration found. Skipping credential setup...${NC}"
    echo -e "${YELLOW}(Tip: Use 'daltoon-dashboard' command to change credentials later)${NC}"
    DASH_USER=$CURRENT_USER
    DASH_PASS=$CURRENT_PASS
    DASH_PORT=$CURRENT_PORT
else
    if [ -t 0 ]; then
        read -p "Enter Admin Username [$CURRENT_USER]: " DASH_USER
        read -s -p "Enter Admin Password [$CURRENT_PASS]: " DASH_PASS
        echo ""
        read -p "Enter Server Port [$CURRENT_PORT]: " DASH_PORT
    elif [ -c /dev/tty ]; then
        read -p "Enter Admin Username [$CURRENT_USER]: " DASH_USER < /dev/tty
        read -s -p "Enter Admin Password [$CURRENT_PASS]: " DASH_PASS < /dev/tty
        echo ""
        read -p "Enter Server Port [$CURRENT_PORT]: " DASH_PORT < /dev/tty
    else
        echo -e "${YELLOW}Non-interactive terminal detected. Using current defaults.${NC}"
    fi
fi

DASH_USER=${DASH_USER:-$CURRENT_USER}
DASH_PASS=${DASH_PASS:-$CURRENT_PASS}
DASH_PORT=${DASH_PORT:-$CURRENT_PORT}

echo -e "${YELLOW}Saving configuration to database...${NC}"
node -e "
const fs = require('fs');
const path = require('path');

const installDir = '$INSTALL_DIR';
const dbPath = path.resolve(installDir, 'Daltoon_Bot.json');

const filesToSearch = [
  'Daltoon_Bot.json',
  'database.json',
  'db.json',
  'bot_database.json'
];

const searchDirs = [
  '.',
  installDir,
  '/tmp/daltoon_db_backup'
];

function getScore(p) {
  try {
    if (!fs.existsSync(p)) return -1;
    const stat = fs.statSync(p);
    const content = fs.readFileSync(p, 'utf8').trim();
    if (!content || content === '{}' || content === '[]') return -1;
    const parsed = JSON.parse(content);
    let score = 1; // Base score for valid JSON
    if (Array.isArray(parsed.users) && parsed.users.length > 0) score += parsed.users.length * 10;
    if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) score += parsed.transactions.length * 10;
    if (parsed.settings) {
      if (parsed.settings.dashboardUsername) score += 20;
      if (parsed.settings.panel_config) {
        const pc = typeof parsed.settings.panel_config === 'string' ? JSON.parse(parsed.settings.panel_config) : parsed.settings.panel_config;
        if (pc.botToken && pc.botToken !== 'DUMMY_TOKEN') score += 100;
        if (pc.dashboardUsername) score += 50;
      }
    }
    return score > 0 ? (score * 1000000) + stat.size : -1;
  } catch(e) { return -1; }
}

let bestFile = null;
let bestScore = -1;

for (const dir of searchDirs) {
  for (const file of filesToSearch) {
    const fullPath = path.resolve(dir, file);
    const score = getScore(fullPath);
    if (score > bestScore) {
      bestScore = score;
      bestFile = fullPath;
    }
  }
}

let db = {};
if (bestFile) {
  try {
    console.log('Using database source from: ' + bestFile + ' (Score: ' + bestScore + ')');
    db = JSON.parse(fs.readFileSync(bestFile, 'utf8')) || {};
  } catch(e) {
    console.error('CRITICAL: Failed to parse best database JSON. Aborting configuration write to prevent data loss!');
    process.exit(1);
  }
}

// Ensure standard keys are preserved/created to avoid any data loss or blank UI
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

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Successfully saved unified database to: ' + dbPath);

// Cleanup other legacy files in the install directory to prevent scoring/sync conflicts in the future!
for (const file of filesToSearch) {
  if (file !== 'Daltoon_Bot.json') {
    const legacyPath = path.resolve(installDir, file);
    if (fs.existsSync(legacyPath)) {
      try {
        fs.unlinkSync(legacyPath);
        console.log('Legacy database ' + file + ' completely deleted to avoid conflicts.');
      } catch(e) {}
    }
  }
}
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
