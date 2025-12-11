#!/bin/bash

# HLS Streaming Stress Test - One-Command Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/World-of-WOW/WOW-Live-Stress-Test/main/install.sh | bash

set -e

# Default values
DEFAULT_STREAM_URL="https://worldofwow.dev/assets/streams/example.html"
DEFAULT_STREAM_BITRATE_KBPS="2800"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔════════════════════════════════════════╗"
echo "║   HLS Streaming Stress Test Installer  ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Check for Node.js
echo -e "${CYAN}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo ""
    echo "Please install Node.js v22 or later:"
    echo "  - macOS: brew install node"
    echo "  - Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "  - Or visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ERROR: Node.js version 22 or higher is required       ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Current version: ${YELLOW}v$NODE_VERSION${NC}"
    echo -e "  Required version: ${GREEN}v22+${NC}"
    echo ""
    echo "  Please upgrade Node.js:"
    echo "    - macOS: brew install node"
    echo "    - Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "    - Or visit: https://nodejs.org/"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v) found${NC}"

# Determine installation directory
INSTALL_DIR="${INSTALL_DIR:-$HOME/wow-live-stress-test}"

echo ""
echo -e "${CYAN}Installing to: ${INSTALL_DIR}${NC}"

# Clone or download repository
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Directory exists, updating...${NC}"
    cd "$INSTALL_DIR"
    if [ -d ".git" ]; then
        git pull --quiet
    else
        # No .git folder = ZIP install, remove and re-download
        echo -e "${YELLOW}No git repository found, removing old installation...${NC}"
        cd ..
        rm -rf "$INSTALL_DIR"
    fi
fi

if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${CYAN}Downloading project...${NC}"

    # Try git clone first, fall back to downloading archive
    if command -v git &> /dev/null; then
        # Replace with your actual repo URL
        REPO_URL="${REPO_URL:-https://github.com/World-of-WOW/WOW-Live-Stress-Test.git}"
        git clone --quiet "$REPO_URL" "$INSTALL_DIR" 2>/dev/null || {
            echo -e "${YELLOW}Git clone failed, trying direct download...${NC}"
            mkdir -p "$INSTALL_DIR"
            # If git fails, user should set REPO_URL or copy files manually
            echo -e "${RED}Please set REPO_URL environment variable or clone manually${NC}"
            exit 1
        }
    else
        echo -e "${RED}Git not found. Please install git or clone the repository manually.${NC}"
        exit 1
    fi

    cd "$INSTALL_DIR"
fi

# Install dependencies
echo ""
echo -e "${CYAN}Installing npm dependencies...${NC}"
npm install --silent

# Install Playwright browsers
echo ""
echo -e "${CYAN}Installing Playwright browser (Chromium)...${NC}"
npx playwright install --with-deps chromium

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      Installation Complete! ✓          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}To run the stress test:${NC}"
echo ""
echo "  cd $INSTALL_DIR"
echo "  STREAM_URL=https://your-stream-page.com npm start"
echo ""
echo -e "${CYAN}Or with command line options:${NC}"
echo ""
echo "  npm start --url=https://your-stream-page.com"
echo ""
echo -e "${CYAN}Additional options:${NC}"
echo "  --max=10      Limit to 10 browsers"
echo "  --headless    Run without visible windows"
echo "  --yes         Skip confirmation prompt"
echo ""

# Create .env file with defaults if it doesn't exist
if [ ! -f ".env" ]; then
    echo "STREAM_URL=${STREAM_URL:-$DEFAULT_STREAM_URL}" > .env
    echo "STREAM_BITRATE_KBPS=${STREAM_BITRATE_KBPS:-$DEFAULT_STREAM_BITRATE_KBPS}" >> .env
    echo -e "${GREEN}✓ Created .env with default settings${NC}"
fi

# Ask user if they want to run the test
echo ""
if read -p "Would you like to start the stress test now? (y/n): " -n 1 -r 2>/dev/null; then
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}Starting stress test...${NC}"
        echo ""
        npm start
    fi
else
    # read failed (likely piped execution on Linux after sudo prompt)
    echo ""
    echo -e "${CYAN}To start the stress test, run:${NC}"
    echo ""
    echo "  cd $INSTALL_DIR && npm start"
    echo ""
fi
