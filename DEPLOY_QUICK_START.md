# Quick Deployment Checklist for Render.com

## TL;DR - 5 Minute Setup

### 1. Push Code to GitHub
```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/your-repo.git
git push -u origin main
```

### 2. Create Render Account
- Go to https://render.com and sign up with GitHub

### 3. Deploy with One Click
- In Render Dashboard: Click "New +" → "Blueprint"
- Select your repository
- Render will auto-detect `render.yaml` and deploy both services
- Takes 2-3 minutes

### 4. Get Your URLs
After deployment, Render gives you:
- **API URL:** `https://project-tracker-api.onrender.com`
- **Web URL:** `https://project-tracker-web.onrender.com`

### 5. Update CORS
In Render Dashboard:
1. Go to Backend Service
2. Environment Variables
3. Update `ALLOWED_ORIGINS` to match your frontend URL
4. Click "Deploy" to restart

### 6. Test It
- Visit `https://project-tracker-web.onrender.com`
- Create a project
- Open in another tab
- Real-time sync works! 🎉

---

## What You Get

✅ **Backend** runs 24/7 on Render  
✅ **Database** persists with 10GB disk  
✅ **Multiple users** can access simultaneously  
✅ **Real-time sync** works for all users  
✅ **File uploads** stored and served  
✅ **FREE for testing** (750 compute hours/month)  

---

## Costs

- **Free:** Perfect for testing (auto-sleeps after 15 min, data saved)
- **Starter ($7/month):** Always-on, production-ready
- **Storage ($10/month):** For 10GB persistent disk

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "CORS blocked" | Update `ALLOWED_ORIGINS` in backend environment |
| "Cannot connect" | Make sure API URL in frontend matches backend |
| "No real-time sync" | Check both services deployed, clear cache |
| "File uploads fail" | Verify `/var/data` disk mounted on backend |

---

## Still Stuck?

- Check deployment logs in Render Dashboard
- See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for detailed guide
- Test API health: `https://your-api-url/health`

---

**Ready to deploy?** Just push to GitHub and follow steps 1-5 above! 🚀
