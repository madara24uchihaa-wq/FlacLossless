# FlacLossless Backend

A lightweight Flask + yt-dlp server that downloads audio from YouTube and serves it as MP3—all without your app talking to YouTube directly.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

You also need **FFmpeg** installed:
- **macOS**: `brew install ffmpeg`
- **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

### 2. Run the Server

```bash
python server.py
```

You'll see:
```
🎵 FlacLossless Backend starting on 0.0.0.0:5000
   Audio dir: ./audio
   Cleanup: 24h
```

### 3. Test It

Open your browser or curl:

```bash
# Download audio from YouTube
curl "http://localhost:5000/download?url=https://www.youtube.com/watch?v=XXXX"

# Response:
{
  "file": "/stream/a1b2c3d4-e5f6.mp3",
  "metadata": {
    "title": "Song Name",
    "duration": 240,
    "thumbnail": "https://...",
    "uploader": "Channel Name"
  },
  "cached": false,
  "video_id": "XXXX"
}
```

Then play the MP3:
```bash
# In browser: http://localhost:5000/stream/a1b2c3d4-e5f6.mp3
# Or with curl: curl http://localhost:5000/stream/a1b2c3d4-e5f6.mp3 > song.mp3
```

## API Endpoints

### `GET /download?url=YOUTUBE_URL`
Download audio and return streaming URL.

**Response:**
```json
{
  "file": "/stream/UUID.mp3",
  "metadata": {
    "title": "Song Title",
    "duration": 240,
    "thumbnail": "https://...",
    "uploader": "Artist"
  },
  "cached": false,
  "video_id": "video_id"
}
```

### `GET /stream/<filename>`
Stream an MP3 file. Supports range requests for seeking.

**Example:** `http://localhost:5000/stream/a1b2c3d4.mp3`

### `GET /metadata/<video_id>`
Get cached metadata for a video (no re-download).

**Example:** `http://localhost:5000/metadata/dQw4w9WgXcQ`

### `GET /cache`
List all cached videos.

**Response:**
```json
{
  "cached": 5,
  "items": [
    {
      "video_id": "dQw4w9WgXcQ",
      "title": "Never Gonna Give You Up",
      "downloaded_at": "2025-12-01T10:30:45",
      "file_exists": true
    }
  ]
}
```

### `DELETE /cache/<video_id>`
Delete a cached video.

**Example:** `curl -X DELETE http://localhost:5000/cache/dQw4w9WgXcQ`

### `GET /health`
Server health check.

## Configuration (Environment Variables)

```bash
# Set via env before running:
export AUDIO_DIR="./audio"           # Where MP3s are stored
export CACHE_FILE="./cache.json"     # Cache metadata
export CLEANUP_HOURS=24              # Auto-delete MP3s older than N hours
export DEBUG_MODE=False              # Enable verbose logging
export PORT=5000                     # Server port
export HOST="0.0.0.0"                # Server host
```

Or create a `.env` file in `backend/`:
```
AUDIO_DIR=./audio
CACHE_FILE=./cache.json
CLEANUP_HOURS=24
DEBUG_MODE=False
PORT=5000
HOST=0.0.0.0
```

## Architecture

1. **Client** (React app) sends YouTube URL to `/download`
2. **Server** uses yt-dlp to extract best audio stream
3. **FFmpeg** converts audio to MP3 (192 kbps)
4. **Server** stores MP3 locally with UUID filename
5. **Client** receives streaming URL: `/stream/UUID.mp3`
6. **Client** plays MP3 via HTML5 Audio or any music player
7. **Background worker** deletes old MP3s every hour

## How It Solves CORS

- ✗ Direct YouTube API: blocked by CORS
- ✗ Proxy services: slow, unreliable
- ✓ Your backend: full control, no CORS issues

Your app talks **only** to your backend. The backend talks to YouTube on your computer.

## Front-End Integration (React)

```typescript
// services/youtubeService.ts
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export async function downloadAudio(url: string) {
  const response = await fetch(`${BACKEND_URL}/download?url=${encodeURIComponent(url)}`);
  const data = await response.json();
  
  if (response.ok) {
    return {
      streamUrl: `${BACKEND_URL}${data.file}`,
      metadata: data.metadata,
      videoId: data.video_id
    };
  }
  throw new Error(data.error);
}
```

Then in your React component:
```typescript
const { streamUrl, metadata } = await downloadAudio(youtubeUrl);
// Play streamUrl in your audio player
audio.src = streamUrl;
audio.play();
```

## Limitations & Notes

- **Network**: Backend must be on same network as client (or use ngrok/tunnel for remote)
- **Storage**: MP3s are stored locally. Set `CLEANUP_HOURS` to auto-delete old files
- **Performance**: First download takes ~10-30 seconds. Cached videos return instantly
- **Quality**: Default 192 kbps MP3. Adjust in `server.py` line ~75

## Troubleshooting

### FFmpeg not found
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg

# Windows: Download from ffmpeg.org or use chocolatey
choco install ffmpeg
```

### "No module named 'flask'"
```bash
pip install -r requirements.txt
```

### Download hangs
- Check network / firewall
- Try a different YouTube URL
- Increase timeout in `server.py` if needed

### Files pile up
- Increase `CLEANUP_HOURS` to keep longer
- Or manually delete `audio/` folder

## Advanced: Deploy to Production

For production (cloud server), use:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 server:app
```

Or Docker:
```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt && apt-get update && apt-get install -y ffmpeg
COPY server.py .
CMD ["python", "server.py"]
```

## License

MIT
