# Railway Backend Deployment Guide

## Step 1: Only Deploy the Backend

You're deploying **ONLY the backend folder** to Railway. The frontend stays on Vercel.

## Step 2: Connect GitHub to Railway

1. Go to [railway.app](https://railway.app)
2. Click **"Create New Project"**
3. Select **"Deploy from GitHub repo"**
4. Click **"Configure GitHub App"** to authorize Railway
5. Select your **FlacLossless** repository
6. Click **"Deploy"**

## Step 3: Railway Auto-Detection

Railway will automatically:
- Detect it's a Python project
- Install dependencies from `requirements.txt`
- Install FFmpeg (needed for yt-dlp)
- Install yt-dlp v2025.11.12
- Run the command from `Procfile`

## Step 4: Get Your Backend URL

1. Railway deployment will take 3-5 minutes
2. Go to **"Settings"** → **"Environment"**
3. Look for the **"Public URL"** or **"Domain"**
4. Copy the URL (looks like `https://flaclessless-production.up.railway.app`)

## Step 5: Connect to Vercel Frontend

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add new variable:
   - **Name:** `VITE_BACKEND_URL`
   - **Value:** `https://your-railway-url` (paste your Railway URL)
3. Click **Save**
4. Click **"Redeploy"** on the main branch
5. Wait 2 minutes for rebuild

## Step 6: Test

1. Go to your Vercel frontend URL
2. Click **STREAM**
3. Search for any YouTube song
4. It should work! ✅

## What Got Deployed

Files created for Railway:
- `Procfile` - Tells Railway how to run your backend
- `railway.json` - Railway configuration
- Updated `backend/requirements.txt` - Latest yt-dlp v2025.11.12

## Troubleshooting

**If YouTube search doesn't work:**
- Check Vercel Environment Variables have correct `VITE_BACKEND_URL`
- Verify Railway deployment shows "Running" status
- Check Railway logs for errors

**If deployment fails:**
- Check the `requirements.txt` is valid Python
- Verify `Procfile` syntax is correct
- Check Railway logs in the dashboard
