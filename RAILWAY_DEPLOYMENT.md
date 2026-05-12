# Railway.app Deployment Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Deploy Backend to Railway

1. Go to https://railway.app
2. Click **"Start New Project"**
3. Click **"Deploy from GitHub Repo"**
4. Select your `DalLofamia/report` repository
5. Railway auto-detects Node.js and starts building
6. Wait 2-3 minutes for deployment

### Step 2: Get Your Backend URL

1. In Railway Dashboard, click your project
2. Go to the **Deployments** tab
3. Copy your Railway domain (looks like: `project-tracker-api-production.up.railway.app`)
4. Copy this URL - you'll need it for Vercel

### Step 3: Set Environment Variables

In Railway Dashboard:

1. Click **"Variables"** tab
2. Add these variables:
   ```
   NODE_ENV=production
   PORT=5000
   DB_PATH=/data/projects.db
   UPLOADS_DIR=/data/uploads
   ALLOWED_ORIGINS=https://your-vercel-frontend.vercel.app
   ```
3. Click **"Save"**
4. Railway auto-redeploys

### Step 4: Deploy Frontend to Vercel

1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Import your `DalLofamia/report` repository
4. Add Environment Variable:
   ```
   REACT_APP_API_BASE_URL=https://your-railway-backend.up.railway.app
   ```
5. Click **"Deploy"**

### Step 5: Test Real-Time Sync

✅ Visit your Vercel URL  
✅ Create a project  
✅ Open in another tab  
✅ See real-time updates!  

---

## 📊 How It Works

```
User Browser #1
      ↓
Vercel Frontend (report.vercel.app)
      ↓
Railway Backend (*.up.railway.app)
      ↓
SQLite Database (/data/projects.db)
      ↑
Railway Backend
      ↑
Vercel Frontend
      ↓
User Browser #2
```

Multiple users see real-time updates automatically!

---

## 🎯 What You Get (FREE)

✅ **$5/month free Railway credits** (lasts many months for this app)  
✅ **Unlimited Vercel deployments** (free)  
✅ **No credit card required initially** (Railway gives $5 free)  
✅ **Real-time sync for unlimited users**  
✅ **Database persists** between restarts  
✅ **SSL/HTTPS included** on both services  

---

## 🔧 Troubleshooting

### Backend won't start
- Check Railway logs in Dashboard
- Verify `PORT` is set to `5000`
- Ensure `DB_PATH` and `UPLOADS_DIR` are set

### "Cannot connect to API"
- Verify `REACT_APP_API_BASE_URL` matches your Railway backend URL
- Include the full domain (e.g., `https://yourapp.up.railway.app`)
- No trailing slash

### "CORS blocked"
- Update `ALLOWED_ORIGINS` in Railway to match your Vercel URL
- Format: `https://yourapp.vercel.app`

### Real-time sync not working
- Clear browser cache (Ctrl+Shift+Delete)
- Refresh page
- Check browser console for API errors

---

## 📝 Next Steps

1. ✅ Code is on GitHub
2. ⏭️ Deploy backend to Railway
3. ⏭️ Deploy frontend to Vercel
4. ⏭️ Share your Vercel URL with your team
5. ⏭️ Everyone sees real-time updates!

**Ready? Start with Step 1 above!**
