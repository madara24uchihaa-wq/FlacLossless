# Backend + Frontend Integration Guide

## What You Now Have

| Component | What It Does |
|-----------|-------------|
| `backend/server.py` | Flask server that downloads YouTube audio → converts to MP3 → serves via HTTP |
| `backend/requirements.txt` | Python dependencies (Flask, yt-dlp, flask-cors) |
| `services/backendService.ts` | React service that talks to backend |
| `services/youtubeService.ts` | **Updated** to use backend instead of proxy APIs |
| `.env.local` | **New** `VITE_BACKEND_URL=http://localhost:5000` |

---

## Setup Steps

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**If FFmpeg is missing:**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
# Or: choco install ffmpeg
```

### 2. Run Backend in One Terminal

```bash
cd backend
python server.py
```

You'll see:
```
🎵 FlacLossless Backend starting on 0.0.0.0:5000
   Audio dir: ./audio
   Cleanup: 24h
```

### 3. Run React Frontend in Another Terminal

```bash
npm start
```

Or with Vite (if configured):
```bash
npm run dev
```

---

## How It Works (End-to-End)

### Flow Diagram

```
┌─────────────────┐
│   React App     │
│  (YouTubePlayer)│
└────────┬────────┘
         │ "Play YouTube URL"
         │ POST /download?url=...
         ↓
┌─────────────────────────────┐
│  Flask Backend (localhost)  │
│  yt-dlp + FFmpeg            │
│  (server.py)                │
└────────┬────────────────────┘
         │ 1. Check cache.json
         │ 2. Download audio via yt-dlp
         │ 3. Convert to MP3
         │ 4. Save to ./audio/UUID.mp3
         │ 5. Return /stream/UUID.mp3
         ↓
   Return URL to React
         │
         ↓
  Play in <audio> tag
  http://localhost:5000/stream/UUID.mp3
```

---

## API Endpoints (for testing)

### Download Audio

```bash
curl "http://localhost:5000/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

**Response:**
```json
{
  "file": "/stream/a1b2c3d4.mp3",
  "metadata": {
    "title": "Never Gonna Give You Up",
    "duration": 213,
    "thumbnail": "https://...",
    "uploader": "Rick Astley"
  },
  "cached": false,
  "video_id": "dQw4w9WgXcQ"
}
```

### Stream MP3

Open in browser:
```
http://localhost:5000/stream/a1b2c3d4.mp3
```

Or curl:
```bash
curl http://localhost:5000/stream/a1b2c3d4.mp3 > song.mp3
```

### Check Cache

```bash
curl http://localhost:5000/cache
```

### Health Check

```bash
curl http://localhost:5000/health
```

---

## React Integration

Your React component now does:

```typescript
// In YouTubePlayer.tsx or similar
import { youtubeService } from '../services/youtubeService';

const playYouTubeVideo = async (videoId: string) => {
  try {
    // This now uses backend instead of proxy services
    const streamUrl = await youtubeService.getPlayableAudioUrl(videoId);
    
    // Play the stream
    const audio = new Audio(streamUrl);
    audio.play();
  } catch (e) {
    console.error('Failed to play:', e);
  }
};
```

---

## Configuration

### Change Backend URL

If your backend is on a different machine:

**`.env.local`:**
```
VITE_BACKEND_URL=http://192.168.1.5:5000
```

(Replace `192.168.1.5` with your machine's IP)

### Change Audio Directory

**`backend/.env`:**
```bash
AUDIO_DIR=./audio            # Where MP3s are stored
CLEANUP_HOURS=24             # Auto-delete old files after N hours
DEBUG_MODE=False             # Verbose logging
PORT=5000
HOST=0.0.0.0
```

### Change Cleanup Retention

```bash
export CLEANUP_HOURS=48  # Keep MP3s for 2 days
python server.py
```

---

## Troubleshooting

### Backend won't start

```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill it
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### "ModuleNotFoundError: No module named 'flask'"

```bash
pip install -r requirements.txt
# Or:
pip install flask flask-cors yt-dlp
```

### "ffmpeg: command not found"

Install FFmpeg (see Setup section above)

### React can't reach backend

- Make sure backend is running: `python server.py`
- Check VITE_BACKEND_URL in `.env.local`
- On same machine: `http://localhost:5000`
- Different machine: `http://YOUR_IP:5000`

### Files pile up in `audio/`

The background cleanup worker runs every hour. You can:
- Increase `CLEANUP_HOURS` env var to keep longer
- Manually delete old MP3s
- Or delete entire `audio/` folder (cache.json remains)

---

## Advanced: Running on Network

To access backend from another computer on your network:

### 1. Find Your Machine's IP

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

Look for something like `192.168.1.5` or `10.0.0.X`

### 2. Start Backend on That IP

```bash
export HOST=192.168.1.5
export PORT=5000
python server.py
```

### 3. Update React `.env.local`

```
VITE_BACKEND_URL=http://192.168.1.5:5000
```

### 4. Connect from Client Device

On phone/tablet on same network:
```
http://192.168.1.5:5000/download?url=...
```

---

## Next Steps (Optional Features)

- [ ] **Search from UI**: Add YouTube search that uses YouTube API, then backend for download
- [ ] **Playlist support**: Batch download entire playlists
- [ ] **Offline mode**: Store MP3 file paths in React, play without backend
- [ ] **Metadata in UI**: Show title, artist, thumbnail before playing
- [ ] **Quality selector**: Choose between 128/192/320 kbps
- [ ] **Auth**: Simple token to protect backend from public abuse
- [ ] **Docker**: containerize backend for easy deployment
- [ ] **Cloud deployment**: Deploy to Heroku, Railway, or AWS Lambda

---

## Summary

✓ Backend downloads YouTube audio securely (your machine, not third-party)
✓ React talks only to your backend (no CORS issues)
✓ Caching prevents duplicate downloads
✓ Auto-cleanup keeps storage under control
✓ Supports seeking/range requests in streaming

Enjoy your music app! 🎵
