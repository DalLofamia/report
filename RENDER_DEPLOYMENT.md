# Deployment Guide for Render.com

## Overview
This guide walks you through deploying your Project Tracker app to Render.com for production use with real-time multi-user sync.

## Prerequisites
- GitHub account (fork or push your repo to GitHub)
- Render.com account (free at https://render.com)

## Step 1: Prepare Your Code for Deployment

### 1.1 Update your root package.json to add serve for production
```bash
npm install --save-dev serve
```

### 1.2 Create .env files for production

**Root .env.production:**
```
REACT_APP_API_BASE_URL=https://your-api-url.onrender.com
NODE_ENV=production
```

**server/.env.production:** (already exists, verify these settings)
```
NODE_ENV=production
PORT=5000
DB_PATH=/var/data/projects.db
UPLOADS_DIR=/var/data/uploads
ALLOWED_ORIGINS=https://your-frontend-url.onrender.com
```

## Step 2: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit for Render deployment"
git remote add origin https://github.com/YOUR_USERNAME/your-repo-name.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Render.com

### Option A: Deploy with render.yaml (Automatic Setup - Easiest)

1. Go to https://dashboard.render.com
2. Click "New +" and select "Blueprint"
3. Select your GitHub repository
4. Render will automatically detect render.yaml and create services
5. Configure the environment variables:
   - For **project-tracker-api**:
     - `ALLOWED_ORIGINS`: Set to your frontend URL
   - For **project-tracker-web**:
     - `REACT_APP_API_BASE_URL`: Will auto-populate from API service

6. Click "Deploy"

### Option B: Manual Setup (If render.yaml doesn't work)

#### Deploy Backend First:
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Select your GitHub repository
4. Configure:
   - **Name:** `project-tracker-api`
   - **Runtime:** Node
   - **Build Command:** `npm install --prefix server`
   - **Start Command:** `npm start --prefix server`
   - **Plan:** Free (or paid if you need better performance)
   
5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=5000
   DB_PATH=/var/data/projects.db
   UPLOADS_DIR=/var/data/uploads
   ALLOWED_ORIGINS=https://your-frontend-url.onrender.com
   ```

6. Add Disk:
   - **Name:** `data`
   - **Mount Path:** `/var/data`
   - **Size:** 10 GB

7. Deploy

#### Deploy Frontend:
1. Click "New +" → "Web Service"
2. Select your GitHub repository
3. Configure:
   - **Name:** `project-tracker-web`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s build -l 3000`
   - **Plan:** Free

4. Add Environment Variables:
   - `REACT_APP_API_BASE_URL`: Paste your backend URL (e.g., `https://project-tracker-api.onrender.com`)
   - `NODE_ENV`: `production`

5. Deploy

## Step 4: Update CORS Settings

After deployment, update both services:

1. Get your frontend URL from Render (something like `https://project-tracker-web.onrender.com`)
2. Get your backend URL from Render (something like `https://project-tracker-api.onrender.com`)

3. In Render Dashboard:
   - Go to Backend Service
   - Environment → Edit `ALLOWED_ORIGINS`
   - Set to: `https://project-tracker-web.onrender.com`
   - Redeploy

4. In Render Dashboard:
   - Go to Frontend Service
   - Environment → Edit `REACT_APP_API_BASE_URL`
   - Set to: `https://project-tracker-api.onrender.com`
   - Redeploy

## Step 5: Test Real-Time Sync

1. Open your app at: `https://project-tracker-web.onrender.com`
2. Create a project
3. Open the app in another browser tab/window
4. Make changes in one tab
5. You should see real-time updates in the other tab ✅

## Important Notes

### Persistent Data
- Your SQLite database is stored in `/var/data` which persists between deployments
- Data persists as long as your Render service is active
- Free tier services spin down after 15 minutes of inactivity (data still saved)

### Multi-User Access
- All users access the **same shared database**
- Real-time sync updates all users simultaneously
- Upload files are stored in `/var/data/uploads`

### Cost
- **Free tier:** Up to 750 compute hours/month (enough for low-traffic app)
- **Paid tier:** $7+/month for always-on services
- Disk storage: $10/month for 10GB

### Upgrading Database (Optional)
If you want better performance with multiple users, upgrade to PostgreSQL:
1. Create PostgreSQL database on Render
2. Update your backend code to use PostgreSQL instead of SQLite
3. Update DB connection strings

## Troubleshooting

### "CORS blocked request from origin"
- Check that `ALLOWED_ORIGINS` includes your frontend URL
- Make sure to include `https://` (not `http://`)
- Redeploy backend after updating

### "Cannot connect to API"
- Verify backend is deployed and running
- Check `REACT_APP_API_BASE_URL` is correct in frontend
- Check backend health: Visit `https://your-api-url.onrender.com/health`

### Real-time sync not working
- Check browser console for API errors
- Verify both frontend and backend are deployed
- Clear browser cache (Ctrl+Shift+Delete)
- Check network tab to see if requests reach the backend

### Database not persisting
- Verify disk is mounted at `/var/data`
- Check that `DB_PATH` and `UPLOADS_DIR` point to `/var/data`
- Don't spin down the service (free tier may auto-spin-down)

## Next Steps

1. Follow Steps 1-4 above
2. Test the app at your Render URLs
3. Share the frontend URL with other users
4. They'll automatically see real-time sync! 🎉

**Need help?** The Render dashboard shows logs for any deployment issues.
