# SonicPulse AI - Audio Player Application

## Overview

SonicPulse AI is an advanced web-based audio player that combines professional-grade audio processing with modern streaming capabilities. The application features a 10-band parametric equalizer, real-time audio visualization, AI-powered EQ generation, and integration with YouTube for music streaming. Built as a Progressive Web App (PWA), it provides a native-like experience with offline capabilities.

The system architecture separates the frontend React application from a Python backend that handles YouTube audio extraction using yt-dlp, enabling CORS-free audio streaming without relying on external proxy services.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 19 with TypeScript for type-safe component development
- Vite as the build tool and development server (port 5000)
- Tailwind CSS 4.x for styling with custom design system
- Web Audio API for real-time audio processing

**Component Structure:**
The application follows a feature-based component architecture:

- **App.tsx** - Main application orchestrator managing global state and coordinating between components
- **Visualizer.tsx** - Canvas-based real-time audio visualization with particle effects and beat detection
- **Equalizer.tsx** - 10-band parametric EQ with additional controls (reverb, stereo width, playback rate, pre-amp, limiter)
- **PlayerControls.tsx** - Standard playback interface (play/pause, seek, time display)
- **Playlist.tsx** - Track queue management with drag-and-drop reordering
- **StreamingSource.tsx** - Unified interface for Spotify and YouTube integration with download progress tracking
- **YouTubePlayer.tsx** - Embedded YouTube player overlay
- **DownloadProgress.tsx** - Real-time download status display for YouTube audio extraction

**State Management:**
Uses React's built-in useState/useEffect hooks without external state management libraries. State is lifted to App.tsx and passed down via props, keeping data flow unidirectional and predictable.

**Audio Processing Pipeline:**
The Web Audio API graph (services/audioGraph.ts) implements a sophisticated signal chain:

1. **Input Stage** - MediaElementSource from HTML5 audio element
2. **Pre-Amplification** - Input gain control to prevent clipping before EQ
3. **10-Band Parametric EQ** - Peaking filters at standard frequencies (32Hz to 16kHz)
4. **Vocal Presence Filter** - Dedicated mid-range boost for vocal clarity
5. **Reverb Chain** - ConvolverNode with wet/dry mix using impulse response
6. **Stereo Width** - StereoPanner for spatial control
7. **Dynamic Range Compression** - Master limiter to prevent distortion
8. **Analysis Node** - FFT analyzer (4096 bins) for visualization data
9. **Output Gain** - Final volume control

This design prioritizes audio quality with high-resolution FFT, smooth parameter interpolation, and optional bit-perfect playback when no effects are applied.

### Backend Architecture

**Technology:** Python Flask server with yt-dlp for YouTube audio extraction

**Rationale:** Browser-based YouTube audio extraction faces CORS restrictions and API rate limits. A server-side solution using yt-dlp provides:
- Reliable audio extraction without proxy dependencies
- Caching to reduce redundant downloads
- Server-Sent Events (SSE) for real-time progress updates
- Local file storage for instant playback on repeated requests

**API Endpoints:**

- `GET /health` - Backend availability check
- `GET /search?q={query}` - YouTube video search (returns metadata only)
- `GET /download?url={youtube_url}` - Download and convert video to MP3, returns stream URL
- `GET /download/progress?url={youtube_url}` - SSE endpoint for real-time download progress
- `GET /stream/{file_id}.mp3` - Serve cached MP3 files
- `GET /metadata/{video_id}` - Check cache for existing downloads
- `GET /cache` - List all cached files with metadata

**Download Job System:**
The backend implements a job queue (downloadJobService.ts) that:
- Queues multiple download requests (max 3 concurrent)
- Streams progress via SSE (queued → downloading → completed/failed states)
- Provides granular status updates (extracting metadata, downloading, converting)
- Handles errors gracefully with retry logic

**File Storage:**
- Audio files stored in `backend/audio/` directory
- Metadata cached in `cache.json` with video_id as key
- Files expire after 24 hours (configurable via CLEANUP_HOURS)
- UUID-based filenames prevent collisions

**Alternative Considered:** Direct browser-based extraction using cors-anywhere proxies was rejected due to unreliability, rate limiting, and security concerns. Server-side extraction provides better control and user experience.

### Progressive Web App (PWA)

**Implementation:**
- Service worker registration (serviceWorkerRegistration.ts) for offline caching
- Web App Manifest (manifest.json) for installability
- Cache-first strategy for static assets
- Network-first for API requests

**Benefits:**
- Install to home screen on mobile devices
- Offline playback of cached tracks
- Native-like performance and user experience

### AI Integration

**Gemini AI Service (geminiService.ts):**
Uses Google's Gemini 2.5 Flash model to generate EQ presets based on:
- User text prompts ("more bass", "vocal clarity")
- Track metadata (title, artist for genre detection)
- Real-time audio analysis (bass/mid/treble energy levels 0-255)

Returns structured JSON with preset name and 10-band gain values (-12 to +12 dB).

**Voice Control (liveService.ts):**
Implements Gemini Live API for hands-free operation:
- Function calling for EQ updates and playback control
- Microphone input via getUserMedia
- Real-time audio streaming to Gemini
- Tool definitions: updateEQ, controlPlayback
- Bidirectional audio communication (planned feature)

**Trade-off:** AI features require API key and incur usage costs. Made optional with graceful degradation when unavailable.

## External Dependencies

### Third-Party APIs

1. **Google Gemini API**
   - Purpose: AI-powered EQ generation and voice control
   - Configuration: GEMINI_API_KEY environment variable
   - Rate Limits: Subject to Google AI quota
   - Fallback: Manual EQ presets when unavailable

2. **Spotify Web API** (Optional)
   - Purpose: Search and playlist integration
   - Authentication: OAuth 2.0 Client Credentials flow
   - Configuration: VITE_SPOTIFY_CLIENT_ID, VITE_SPOTIFY_CLIENT_SECRET
   - Limitation: Only provides 30-second preview URLs
   - Usage: Search metadata only, actual playback via YouTube lookup

3. **YouTube Data API** (Indirect)
   - Backend uses yt-dlp which scrapes YouTube without requiring API keys
   - Avoids YouTube API quota limitations
   - More reliable than official API for audio extraction
   - Supports cookie authentication to bypass bot detection (see Cookie Setup below)

### Backend Services

1. **yt-dlp** (Python library, version 2025.1.26)
   - Core YouTube audio extraction engine
   - Handles format selection, metadata extraction, conversion
   - Requires FFmpeg for audio transcoding
   - Active maintenance with frequent updates for YouTube changes
   - **Cookie Support**: To bypass YouTube bot detection, export cookies from your browser and place them in `youtube_cookies.txt`. The backend checks for cookies on each request from:
     - `YT_COOKIES_FILE` environment variable path
     - `./youtube_cookies.txt` (backend directory)
     - `../youtube_cookies.txt` (project root)
     - `~/youtube_cookies.txt` (home directory)

2. **FFmpeg**
   - System dependency for audio format conversion
   - Converts downloaded streams to MP3 (128-320kbps)
   - Must be installed separately on host system
   - Verification: `ffmpeg -version` command

### NPM Packages

1. **@google/genai** (^1.30.0) - Official Gemini SDK
2. **lucide-react** (^0.555.0) - Icon library
3. **react** (^19.2.0) - UI framework
4. **vite** (^6.2.0) - Build tool and dev server
5. **tailwindcss** (^4.1.17) - Utility-first CSS framework

### Python Dependencies (Backend)

1. **Flask** (3.0.0) - Web server framework
2. **flask-cors** (4.0.0) - CORS handling
3. **yt-dlp** (2025.1.26) - YouTube extraction
4. **gunicorn** (21.2.0) - Production WSGI server

### Deployment Platforms

**Frontend:**
- Primary: Vercel (zero-config deployment from Git)
- Alternatives: Netlify, GitHub Pages (static hosting)
- Environment variables injected during build (VITE_* prefix)

**Backend:**
- Recommended: Railway.app (Python auto-detection, FFmpeg included)
- Alternatives: Render.com, Heroku, AWS/Azure for production
- Requires: Python 3.11, FFmpeg system package
- Port configuration: Dynamic PORT environment variable
- Persistent storage: /tmp directory (ephemeral on free tiers)

**Environment Variables Required for Production:**
```
Frontend (Vercel):
- VITE_BACKEND_URL=https://backend-url.railway.app
- GEMINI_API_KEY=your_key (optional)
- VITE_SPOTIFY_CLIENT_ID=your_id (optional)

Backend (Railway):
- PORT=5000 (auto-configured)
- AUDIO_DIR=/tmp/audio
- CACHE_FILE=/tmp/cache.json
- CLEANUP_HOURS=24
```

**Deployment Workflow:**
1. Frontend deploys to Vercel automatically on git push
2. Backend deploys to Railway separately
3. Frontend configured with backend URL via environment variable
4. CORS configured to allow frontend domain

**Critical Integration Point:** Frontend and backend must be deployed separately with VITE_BACKEND_URL pointing to the backend deployment. Local development uses Vite proxy configuration to route /api requests to localhost:3001.