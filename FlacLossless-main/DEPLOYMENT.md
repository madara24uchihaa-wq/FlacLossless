# Deployment Guide

## The Problem
Your **frontend** is deployed on Vercel, but your **backend** (Flask server) is still running locally. That's why YouTube search doesn't work on Vercel - the frontend can't reach the backend.

## Solution: Deploy Backend Separately

### Quick Option: Deploy to Railway.app (Easiest)
1. Go to [railway.app](https://railway.app)
2. Click "Create Project" → "Deploy from GitHub"
3. Select your FlacLossless repository
4. Railway will auto-detect it's Python
5. It will deploy and give you a URL like `https://flaclessless-production.up.railway.app`

### Connect Frontend to Backend
1. Copy your backend URL from Railway
2. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `VITE_BACKEND_URL`
   - **Value:** `https://your-railway-url` (replace with actual URL, no trailing slash)
4. Click "Save" and **Redeploy** your Vercel project
5. Wait 1-2 minutes for Vercel to rebuild and deploy

### Test It
1. Go to your Vercel URL
2. Click **STREAM** button
3. Search for any song - it should now work! ✅

## Alternative Backends
- **Render.com** - Free tier available
- **Heroku** - Paid tier
- **AWS/Azure** - For production scale

## Environment Variables Needed

For Vercel Environment Variables, add:
```
VITE_BACKEND_URL=https://your-backend-url.com
GEMINI_API_KEY=your_gemini_key (if using AI features)
VITE_SPOTIFY_CLIENT_ID=your_spotify_id (if using Spotify)
```
