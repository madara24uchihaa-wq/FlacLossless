# SonicPulse ULTRA - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create/Update `.env.local` file in the root directory:

```env
# Gemini API Key (for AI EQ generation)
GEMINI_API_KEY=your_gemini_api_key_here

# Spotify Integration (Optional)
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here

# YouTube Integration (Optional)
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
The app will start at `http://localhost:3002` (or next available port)

---

## API Setup Instructions

### 🎵 Spotify Integration

**Why you need it:** Import and play Spotify playlists directly in the app.

**Steps:**

1. Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account (create one if needed)
3. Click **Create an App**
4. Accept the terms and click **Create App**
5. Copy your **Client ID**
6. In your project, open `.env.local` and add:
   ```env
   VITE_SPOTIFY_CLIENT_ID=your_client_id_here
   ```
7. Refresh the app
8. Click the **STREAM** button → Spotify tab → **Login with Spotify**

**Features:**
- Search any Spotify playlist
- Import entire playlists
- See album artwork
- Play 30-second previews

---

### 🎬 YouTube Integration

**Why you need it:** Search and import YouTube music playlists.

**Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **YouTube Data API v3**:
   - Click **APIs & Services** → **Enable APIs and Services**
   - Search for "YouTube Data API v3"
   - Click **Enable**
4. Create an API Key:
   - Go to **Credentials**
   - Click **Create Credentials** → **API Key**
   - Copy the key
5. Add to `.env.local`:
   ```env
   VITE_YOUTUBE_API_KEY=your_api_key_here
   ```
6. Refresh the app
7. Click **STREAM** button → YouTube tab → Search playlists

**Features:**
- Search YouTube playlists
- View all videos
- Import playlists
- See channel info

---

### 🤖 Gemini API (AI Features)

**Why you need it:** AI-powered EQ preset generation.

**Steps:**

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **Create API Key**
3. Copy the key
4. Add to `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
5. Refresh the app
6. Use the **Smart AI** button in the player to generate EQ presets

**Features:**
- Text-based EQ generation ("boost bass", "vocal clarity")
- Deep audio analysis with live listening
- AI-powered sound optimization

---

## Features Overview

### 🎧 Local Playback
- Upload FLAC, MP3, WAV, and other audio formats
- Upload multiple files at once
- Organize your playlist with drag-and-drop
- Auto-advance to next track

### 🎚️ Studio-Grade EQ
- 10-band parametric equalizer (-12 to +12 dB)
- Pre-amp control
- Safety limiter to prevent clipping
- Instant presets (Flat, Bass Boost, Vocal Boost, etc.)

### ✨ Advanced Effects
- Vocal presence enhancement
- Reverb/Space control
- Stereo width adjustment
- Playback rate/pitch control

### 🌊 Visualizer
- Real-time frequency analyzer
- Beat detection
- Dynamic circular gradient animation
- Smooth particle effects
- Multiple color modes

### 🎵 Streaming Integration
- **Spotify:** Search, preview, and import playlists
- **YouTube:** Search and import music videos
- Mix local files with streaming tracks

### 🤖 AI Sound Architect
- Generate EQ presets from text descriptions
- Deep audio analysis with live listening
- Genre detection from metadata
- Smart frequency balancing

### 🎤 Voice Control
- Real-time voice commands
- Adjust EQ via voice
- Playback control
- AI-powered responses

---

## Troubleshooting

### "Invalid Client" Error
- ❌ Client ID is missing or incorrect
- ✅ Go to Spotify Dashboard → Your App → Copy Client ID exactly
- ✅ Paste to `.env.local` 
- ✅ Restart dev server (`npm run dev`)

### YouTube API Not Working
- ❌ API key not created or invalid
- ✅ Create API key in Google Cloud Console
- ✅ Make sure **YouTube Data API v3** is enabled
- ✅ Add correct key to `.env.local`

### Spotify Playlists Not Loading
- ❌ Token expired
- ✅ Click **Logout** in the STREAM modal
- ✅ Log in again

### No Audio in Visualizer
- ❌ Audio context not initialized
- ✅ Try playing a track first
- ✅ Browser may require user interaction before audio plays

---

## Build for Production

```bash
npm run build
npm run preview
```

---

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Tips & Tricks

1. **Keyboard Shortcuts:**
   - Space: Play/Pause
   - Drag visualizer track: Jump to position

2. **Best EQ Workflow:**
   - Start with a preset
   - Use Studio Rack for fine-tuning
   - Use AI for quick optimization

3. **Playlist Management:**
   - Drag tracks to reorder
   - Use Spotify/YouTube for large playlists
   - Save custom EQ presets for different genres

4. **Voice Control Tips:**
   - Speak naturally ("boost the bass" / "add reverb")
   - Wait for response before next command
   - Disconnect when not needed (saves battery)

---

## License

MIT - Feel free to use and modify!

---

## Support

For issues or feature requests, please check:
- Browser console for error messages
- GitHub Issues in the repository
