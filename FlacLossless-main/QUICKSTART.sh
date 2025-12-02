#!/bin/bash

# 🎵 FlacLossless - Quick Start Script
# This script sets up and runs both backend and frontend

set -e

echo ""
echo "╔═════════════════════════════════════════════╗"
echo "║  🎵 FlacLossless Backend + Frontend Setup  ║"
echo "╚═════════════════════════════════════════════╝"
echo ""

# Detect OS
OS="$(uname -s)"
echo "📱 Detected OS: $OS"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python
echo ""
echo "🔍 Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 not found${NC}"
    echo "   Install: brew install python3 (macOS) or apt-get install python3 (Linux)"
    exit 1
fi
echo -e "${GREEN}✓ Python $(python3 --version | cut -d' ' -f2)${NC}"

# Check FFmpeg
echo ""
echo "🔍 Checking FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}⚠️  FFmpeg not found${NC}"
    echo "   Install:"
    if [ "$OS" == "Darwin" ]; then
        echo "     brew install ffmpeg"
    elif [ "$OS" == "Linux" ]; then
        echo "     sudo apt-get install ffmpeg"
    else
        echo "     Download from https://ffmpeg.org/download.html"
    fi
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ FFmpeg installed${NC}"
fi

# Check Node.js for React
echo ""
echo "🔍 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "   Install: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node $(node --version)${NC}"

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null
pip install -q -r requirements.txt
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
deactivate 2>/dev/null || true

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd ..
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✓ Frontend dependencies cached${NC}"
fi

echo ""
echo "╔═════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                         ║"
echo "╚═════════════════════════════════════════════╝"
echo ""

# Offer to start
echo "Ready to start? You need TWO terminals:"
echo ""
echo "🟢 Terminal 1 (Backend):"
echo "   cd backend && python server.py"
echo ""
echo "🟢 Terminal 2 (Frontend):"
echo "   npm start   (or npm run dev)"
echo ""
echo "Then open: http://localhost:3000 (or 5173 if Vite)"
echo ""
echo "💡 Backend API: http://localhost:5000"
echo ""

read -p "Start backend now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd backend
    echo ""
    echo -e "${GREEN}🚀 Starting Backend...${NC}"
    echo ""
    python server.py
fi
