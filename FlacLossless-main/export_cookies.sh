#!/bin/bash
# Script to export YouTube cookies from your local Chrome browser

echo "=== YouTube Cookies Exporter ==="
echo ""
echo "This script exports your YouTube cookies to use with FlacLossless backend."
echo ""
echo "Prerequisites:"
echo "1. Make sure you're LOGGED INTO YOUTUBE in Chrome"
echo "2. Chrome/Chromium must be installed"
echo ""
echo "Steps:"
echo "1. Close all Chrome windows"
echo "2. Run this script"
echo ""
echo "Starting cookie extraction..."
echo ""

# Detect OS and Chrome location
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if [ -d "$HOME/.config/google-chrome" ]; then
        echo "✓ Found Chrome on Linux (standard location)"
        BROWSER="chrome"
    elif [ -d "$HOME/.var/app/com.google.Chrome" ]; then
        echo "✓ Found Chrome on Linux (Flatpak)"
        BROWSER="chrome:$HOME/.var/app/com.google.Chrome/"
    else
        echo "✗ Chrome not found in standard locations"
        exit 1
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if [ -d "$HOME/Library/Application Support/Google/Chrome" ]; then
        echo "✓ Found Chrome on macOS"
        BROWSER="chrome"
    else
        echo "✗ Chrome not found on macOS"
        exit 1
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    echo "✓ Found Windows environment"
    BROWSER="chrome"
else
    echo "✗ Unsupported OS: $OSTYPE"
    exit 1
fi

echo ""
echo "Extracting cookies..."
yt-dlp --cookies-from-browser "$BROWSER" --cookies youtube_cookies.txt "https://www.youtube.com/" 2>&1 | grep -E "(Extracting|cookies|Success|Error)" || true

if [ -f youtube_cookies.txt ]; then
    echo ""
    echo "✓ Cookies exported successfully!"
    echo "File: youtube_cookies.txt"
    echo "Size: $(wc -c < youtube_cookies.txt) bytes"
    echo ""
    echo "Next steps:"
    echo "1. Commit this file to your repo"
    echo "2. Set environment variable on Render/Railway: YT_COOKIES_FILE=/tmp/youtube_cookies.txt"
    echo "3. Upload youtube_cookies.txt to your deployment"
else
    echo ""
    echo "✗ Failed to export cookies"
    echo "Make sure you're logged into YouTube in Chrome!"
    exit 1
fi
