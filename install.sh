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
if [ -f "/opt/daltoon-store/database.json" ]; then
    echo -e "${GREEN}Backing up server database...${NC}"
    cp /opt/daltoon-store/database.json "$BACKUP_DIR/database.json"
fi
if [ -f "/opt/daltoon-store/bot_database.json" ]; then
    echo -e "${GREEN}Backing up bot database...${NC}"
    cp /opt/daltoon-store/bot_database.json "$BACKUP_DIR/bot_database.json"
fi

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

# Restore databases if backups exist
if [ -f "$BACKUP_DIR/database.json" ]; then
    echo -e "${GREEN}Restoring server database from backup...${NC}"
    cp "$BACKUP_DIR/database.json" "database.json" 2>/dev/null || cp "$BACKUP_DIR/database.json" "/opt/daltoon-store/database.json"
fi
if [ -f "$BACKUP_DIR/bot_database.json" ]; then
    echo -e "${GREEN}Restoring bot database from backup...${NC}"
    cp "$BACKUP_DIR/bot_database.json" "bot_database.json" 2>/dev/null || cp "$BACKUP_DIR/bot_database.json" "/opt/daltoon-store/bot_database.json"
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
echo -e "${YELLOW}Configuring firewall (opening port 3000)...${NC}"
ufw allow 3000/tcp

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
echo -e "${BLUE}👉 http://$(curl -s https://api.ipify.org):3000${NC}"
echo -e ""
echo -e "To manage credentials, admins or ports, type: ${YELLOW}daltoon-dashboard${NC}"
echo -e "To view logs, type: ${YELLOW}pm2 logs daltoon-store${NC}"
echo -e "To restart application, type: ${YELLOW}pm2 restart daltoon-store${NC}"
echo -e "===================================================="
