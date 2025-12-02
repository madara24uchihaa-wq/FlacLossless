# FlacLossless Backend Deployment Guide

## Option 1: Render (Recommended) ✅

### Setup (5 minutes):

1. **Create Render account** at https://render.com
2. **Connect GitHub** to Render
3. **Create new Web Service**:
   - Select your FlacLossless repository
   - Name: `flaclessless-backend`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python wsgi.py`
   - Plan: Free (or Paid)

4. **Set Environment Variables**:
   - `PORT`: `5000`
   - `PYTHON_VERSION`: `3.11.0`
   - `AUDIO_DIR`: `/tmp/audio`
   - `CACHE_FILE`: `/tmp/cache.json`

5. **Deploy** - Click "Create Web Service"

**Your backend URL** will be: `https://flaclessless-backend.onrender.com`

---

## Option 2: Heroku (Legacy but works)

### Setup:
```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login
heroku login

# Create app
heroku create flaclessless-backend

# Push code
git push heroku main

# Set environment variables
heroku config:set PORT=5000 PYTHON_VERSION=3.11.0
```

---

## Option 3: Replit (Free & Easy)

1. Go to https://replit.com
2. Import GitHub repository
3. Create `.replit` file:
```
run = "python wsgi.py"
```
4. Click Run - that's it!

---

## Option 4: Oracle Cloud Free Tier (Best Free Option)

- **Always Free**: 2 AMD CPUs, 1GB RAM
- More powerful than Railway/Render free
- Need VM instance setup

---

## Testing Your Backend

Once deployed, test the endpoint:

```bash
curl https://your-backend-url/health
```

Response should be:
```json
{
  "status": "ok",
  "audio_dir": "/tmp/audio",
  "cached_videos": 0,
  "active_jobs": 0,
  "yt_dlp_version": "2025.11.12"
}
```

---

## Connect to Vercel Frontend

1. Get your backend URL from deployment platform
2. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
3. Add:
   - Name: `VITE_BACKEND_URL`
   - Value: `https://your-backend-url` (e.g., `https://flaclessless-backend.onrender.com`)
4. **Redeploy** on Vercel

---

## Recommendation

**Use Render** because:
- ✅ Better Flask support than Railway
- ✅ Simpler configuration
- ✅ Free tier is reliable
- ✅ Can upgrade to paid tier easily
- ✅ Great documentation
