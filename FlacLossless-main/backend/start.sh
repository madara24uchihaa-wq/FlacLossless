#!/bin/bash

# FlacLossless Backend - Quick Test & Setup Script

set -e

echo "🎵 FlacLossless Backend Setup"
echo "=============================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
  echo "❌ Python3 not found. Install it first:"
  echo "   macOS: brew install python3"
  echo "   Ubuntu: sudo apt-get install python3 python3-pip"
  exit 1
fi

echo "✓ Python $(python3 --version)"

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo "⚠️  FFmpeg not found. Install it:"
  echo "   macOS: brew install ffmpeg"
  echo "   Ubuntu: sudo apt-get install ffmpeg"
  echo "   Windows: Download from ffmpeg.org"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo "✓ FFmpeg installed"
fi

echo ""
echo "📦 Installing Python dependencies..."
cd backend
pip3 install -q -r requirements.txt
echo "✓ Dependencies installed"

echo ""
echo "🚀 Starting backend server..."
echo "   Backend URL: http://localhost:5000"
echo "   API Docs: http://localhost:5000/health"
echo "   Stop with: Ctrl+C"
echo ""

python3 server.py
