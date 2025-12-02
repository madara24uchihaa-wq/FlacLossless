# FlacLossless Backend - Dependencies Guide

## Required Dependencies

### 1. **yt-dlp** (Latest: 2025.12.1)
Downloads and converts YouTube videos to MP3

**Installation:**
```bash
pip install yt-dlp==2025.12.1
```

**Verify:**
```bash
yt-dlp --version
```

---

### 2. **FFmpeg** (Required for audio conversion)
Converts downloaded audio to MP3 format

**Installation by OS:**

#### macOS
```bash
brew install ffmpeg
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

#### Windows
Download from: https://ffmpeg.org/download.html

#### Docker
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

**Verify:**
```bash
ffmpeg -version
```

---

### 3. **Python Dependencies** (in requirements.txt)
```
Flask==3.0.0
flask-cors==4.0.0
yt-dlp==2025.12.1
requests==2.31.0
Werkzeug==3.0.1
```

**Install all:**
```bash
pip install -r requirements.txt
```

---

## Deployment Platform Checks

### **Render**
✅ Automatically installs Python packages from `requirements.txt`
✅ Automatically installs FFmpeg via Nixpacks
⚠️ May need environment variables set

### **Railway**
✅ Python packages from `requirements.txt`
✅ FFmpeg installed via Nixpacks
⚠️ May have old yt-dlp version - update in requirements.txt

### **Heroku**
✅ Python packages from `requirements.txt`
⚠️ FFmpeg NOT included by default - need buildpack:
```bash
heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
```

### **Replit**
✅ FFmpeg pre-installed
✅ Python pip works
✅ Just `pip install -r requirements.txt`

---

## Testing yt-dlp Locally

```bash
# Test basic search
python -c "import yt_dlp; ydl = yt_dlp.YoutubeDL({'quiet': True, 'extract_flat': True}); info = ydl.extract_info('ytsearch5:hello', download=False); print([v['title'] for v in info['entries']])"

# Test download capability
yt-dlp -f bestaudio --extract-audio --audio-format mp3 "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

---

## Troubleshooting

### ❌ "yt-dlp: command not found"
**Solution:** Install yt-dlp
```bash
pip install yt-dlp
```

### ❌ "FFmpeg not found"
**Solution:** Install FFmpeg for your OS (see above)

### ❌ YouTube search returns empty
**Reason:** YouTube is blocking yt-dlp requests
**Solution:** Already handled in server.py with proper headers and geo-bypass

### ❌ "No module named yt_dlp"
**Solution:** Install in current Python environment
```bash
python -m pip install yt-dlp
```

---

## Health Check Endpoint

Test if backend is working:
```bash
curl http://localhost:5000/health
```

Response should show yt-dlp version is installed:
```json
{
  "status": "ok",
  "yt_dlp_version": "2025.12.1",
  "cached_videos": 0,
  "active_jobs": 0
}
```

---

## Environment Variables (Optional)

```bash
PORT=5000                           # Backend port
AUDIO_DIR=/tmp/audio                # Where to save MP3s
CACHE_FILE=/tmp/cache.json          # Cache metadata
CLEANUP_HOURS=24                    # Delete old MP3s after 24 hours
```

---

## Next Steps

1. ✅ Ensure `requirements.txt` is in root directory
2. ✅ Deploy to chosen platform (Render/Railway/Heroku)
3. ✅ Verify `/health` endpoint responds
4. ✅ Test `/search?q=hello` endpoint
5. ✅ Add backend URL to Vercel `VITE_BACKEND_URL`
6. ✅ Redeploy Vercel frontend
