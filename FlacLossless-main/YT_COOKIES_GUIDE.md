# YouTube Cookies Configuration Guide

YouTube requires cookies to avoid bot detection. Here's how to set it up:

## **Option 1: Use yt-dlp's Built-in Cookie Extraction (Recommended)**

The backend automatically tries to use `--cookies-from-browser` which extracts cookies from your Chrome installation.

### On Linux:
```bash
# Standard Chrome location
export BROWSER=chrome

# Or Flatpak Chrome
export BROWSER=chrome:~/.var/app/com.google.Chrome/
```

### On macOS/Windows:
Works automatically if Chrome is installed in default location.

---

## **Option 2: Manually Export and Upload Cookies (For Render/Cloud Deployment)**

### Step 1: Export Cookies Locally

**Using yt-dlp:**
```bash
# Make sure you're logged into YouTube in Chrome
yt-dlp --cookies-from-browser chrome --cookies cookies.txt "https://www.youtube.com/"
```

This creates a `cookies.txt` file with your YouTube cookies.

**OR Using Browser Extension:**
- Chrome: Install [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/)
- Firefox: Install [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)
- Go to youtube.com
- Click extension → Export cookies → Save as `cookies.txt`

### Step 2: Format Check

Make sure your `cookies.txt` starts with:
```
# HTTP Cookie File
# or
# Netscape HTTP Cookie File
```

Example content:
```
# Netscape HTTP Cookie File
.youtube.com	TRUE	/	TRUE	1735689600	VISITOR_INFO1_LIVE	abc123def456
.youtube.com	TRUE	/	TRUE	1735689600	PREF	f6=8&tz=UTC
```

### Step 3: Upload to Render/Railway

1. **Add Cookie File to Git** (not recommended - security risk):
```bash
echo "cookies.txt" >> .gitignore
# Don't commit cookies.txt
```

2. **Or Set via Environment Variable:**

**For Render:**
- Go to Dashboard → Environment → Add Variable
- Name: `YT_COOKIES_FILE`
- Value: `/tmp/youtube_cookies.txt`
- Then manually upload the file to `/tmp/` in the container

**For Railway:**
- Railway → Settings → Environment Variables
- Name: `YT_COOKIES_FILE`
- Value: `/tmp/youtube_cookies.txt`

3. **Or Use Build Script** to download cookies:

Create `scripts/setup_cookies.sh`:
```bash
#!/bin/bash
if [ -n "$YT_COOKIES_URL" ]; then
    curl -o /tmp/youtube_cookies.txt "$YT_COOKIES_URL"
fi
```

---

## **Option 3: Use a Private Gist (Advanced)**

1. Create GitHub Gist with your cookies.txt
2. Make it Secret (not public)
3. Get raw URL: `https://gist.githubusercontent.com/your-username/raw/...`
4. Set in Render/Railway:
```
YT_COOKIES_URL=https://gist.githubusercontent.com/your-username/raw/...
```

---

## **Backend Configuration**

The backend automatically:
1. ✅ Checks for `YT_COOKIES_FILE` environment variable
2. ✅ Uses `--cookies-from-browser chrome` if available
3. ✅ Falls back to enhanced headers + retry logic

### Set Environment Variable:

**Render:**
- Dashboard → Environment
- Add `YT_COOKIES_FILE=/tmp/youtube_cookies.txt`

**Railway:**
- Settings → Environment Variables
- Add `YT_COOKIES_FILE=/tmp/youtube_cookies.txt`

---

## **Testing**

After setup:

```bash
curl "https://your-backend.com/search?q=music&limit=5"
```

Or try downloading:
```bash
curl "https://your-backend.com/download?url=https://www.youtube.com/watch?v=BSJa1UytM8w"
```

---

## **Troubleshooting**

### ❌ Still getting "Sign in to confirm you're not a bot"

1. **Try a different video** - YouTube rate limits
2. **Wait 1-2 hours** - Your IP might be temporarily blocked
3. **Check cookie format** - Must start with `# Netscape HTTP Cookie File`
4. **Use VPN** - Connect to different region
5. **Update yt-dlp** - Run `pip install --upgrade yt-dlp`

### ❌ "HTTP Error 400: Bad Request"

Your cookies file has wrong newline format:
- Convert to LF (Unix): `dos2unix cookies.txt`
- Or re-export cookies

### ❌ "File not found" error

Make sure `YT_COOKIES_FILE` path exists in your deployment environment.

---

## **Security Note**

⚠️ **IMPORTANT**: Cookies contain authentication data. 
- Never commit `cookies.txt` to public repo
- Don't share your cookies with others
- Treat like passwords!

Use `.gitignore`:
```
cookies.txt
youtube_cookies.txt
*.cookies
```

