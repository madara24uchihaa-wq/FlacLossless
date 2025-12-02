# SonicPulse ULTRA

## Overview
SonicPulse ULTRA is an AI-powered music player with studio-grade audio processing, real-time visualizations, and intelligent EQ generation. Built with React, TypeScript, and Vite.

## Project Structure
```
├── App.tsx              # Main application component
├── components/          # React components
│   ├── Equalizer.tsx    # 10-band parametric equalizer
│   ├── PlayerControls.tsx # Playback controls
│   ├── Playlist.tsx     # Track playlist management
│   ├── StreamingSource.tsx # Spotify/YouTube integration
│   └── Visualizer.tsx   # Audio visualizer
├── services/            # Business logic services
│   ├── audioGraph.ts    # Web Audio API processing
│   ├── geminiService.ts # AI EQ generation
│   ├── liveService.ts   # Voice control
│   ├── spotifyService.ts # Spotify API integration
│   └── youtubeService.ts # YouTube API integration
├── constants.ts         # App constants and presets
├── types.ts             # TypeScript interfaces
└── vite.config.ts       # Vite configuration
```

## Running the App
- Development: `npm run dev` (runs on port 5000)
- Build: `npm run build`
- Preview: `npm run preview`

## Environment Variables
- `GEMINI_API_KEY` - Required for AI-powered EQ generation
- `VITE_SPOTIFY_CLIENT_ID` - Optional, for Spotify integration
- `VITE_YOUTUBE_API_KEY` - Optional, for YouTube integration

## Key Features
- 10-band parametric equalizer with presets
- AI-powered EQ preset generation via Gemini
- Real-time audio visualization
- Spotify and YouTube playlist integration
- Local audio file playback (FLAC, MP3, WAV)
- Voice control capabilities
- PWA support for installation

## Tech Stack
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Web Audio API
- Google Gemini AI

## Deployment
Static deployment configured with `npm run build` outputting to `dist/` directory.
