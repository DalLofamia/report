# Production Deployment Guide

This guide explains how to deploy your app to production with proper database and API configuration.

## Quick Start Checklist

- [ ] Build the React app for production
- [ ] Configure backend environment variables
- [ ] Set API URL for frontend (auto-detection or explicit)
- [ ] Ensure SQLite database path is persistent
- [ ] Test API connectivity
- [ ] Deploy both frontend and backend

## 1. Building the Frontend for Production

```bash
# Navigate to app directory
cd app

# Build the React app
npm run build

# This creates a "build/" folder with optimized static files
```

The build folder contains:
- `index.html` - Main HTML file
- `static/css/` - Optimized CSS files
- `static/js/` - Optimized JavaScript bundles

## 2. Configure Backend Environment Variables

Copy `server/.env.production` template and set your production values:

```bash
cp server/.env.production server/.env
```

### Database Configuration (Critical for Production!)

**For a single server (recommended for SQLite):**
```env
# Linux/Mac - use absolute path
DB_PATH=/var/lib/app/data/projects.db
UPLOADS_DIR=/var/lib/app/data/uploads

# Windows - use absolute path
DB_PATH=C:\app\data\projects.db
UPLOADS_DIR=C:\app\data\uploads
```

**For Docker deployments:**
```env
DB_PATH=/data/projects.db
UPLOADS_DIR=/data/uploads
```

### Configure CORS

Set allowed origins for your frontend domain:

```env
# Single domain
ALLOWED_ORIGINS=https://example.com

# Multiple domains
ALLOWED_ORIGINS=https://example.com,https://www.example.com,https://app.example.com

# Include ports if needed
ALLOWED_ORIGINS=https://example.com:8443,https://example.com
```

## 3. API URL Configuration (Frontend)

### Option A: Auto-Detection (Recommended)

The frontend will automatically detect the API URL from the hostname:

1. **Same domain, same port:**
   - Frontend: `https://example.com`
   - Backend: `https://example.com:5000` (auto-detected)

2. **Same domain, implicit port (80/443):**
   - Frontend: `https://example.com`
   - Backend: `https://example.com` (auto-detected)

**No environment variable needed** - just ensure backend is on same host!

### Option B: Explicit Configuration

Create `.env.production` in the app root:

```bash
# If backend is on different domain
REACT_APP_API_BASE_URL=https://api.example.com

# If backend is on different port
REACT_APP_API_BASE_URL=https://example.com:5000

# If backend is on subdomain
REACT_APP_API_BASE_URL=https://api.example.com
```

Then rebuild:
```bash
npm run build
```

## 4. Deployment Scenarios

### Scenario 4: Netlify Frontend Hosting

Netlify can host the React build, but it cannot run the Express/SQLite backend in `server/`.

**Use this setup:**
- Deploy the React app to Netlify
- Host the API server somewhere else, such as a VPS, Render, Railway, Fly.io, or Heroku
- Set `REACT_APP_API_BASE_URL` in Netlify to the backend URL
- Keep the backend `ALLOWED_ORIGINS` list updated with your Netlify domain

**Netlify build settings:**
```bash
Build command: npm run build
Publish directory: build
```

**Required frontend env var:**
```env
REACT_APP_API_BASE_URL=https://your-backend.example.com
```

The `public/_redirects` file included in this repo makes React Router routes work on refresh.

### Scenario 1: Single VPS (Recommended for SQLite)

**Setup:**
- Frontend and backend on same server
- Frontend served on port 80/443 (via nginx/Apache)
- Backend API on port 5000

**Backend (.env):**
```env
PORT=5000
NODE_ENV=production
DB_PATH=/var/lib/app/data/projects.db
UPLOADS_DIR=/var/lib/app/data/uploads
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

**Nginx reverse proxy (optional):**
```nginx
location /api/ {
    proxy_pass http://localhost:5000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

**Frontend (.env.production):**
```env
# Leave empty - frontend will auto-detect localhost API
# Or explicitly set:
REACT_APP_API_BASE_URL=https://example.com/api
```

### Scenario 2: Docker Deployment

**Docker Compose (docker-compose.yml):**
```yaml
version: '3.8'

services:
  backend:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      DB_PATH: /data/projects.db
      UPLOADS_DIR: /data/uploads
      ALLOWED_ORIGINS: https://example.com
    volumes:
      - app_data:/data
    restart: unless-stopped

  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_BASE_URL: https://example.com/api
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  app_data:
```

**Build and run:**
```bash
docker-compose up -d
```

### Scenario 3: Heroku Deployment

**Procfile:**
```
web: npm run start:server
release: npm run build
```

**Heroku environment variables:**
```bash
heroku config:set NODE_ENV=production
heroku config:set DB_PATH=/app/projects.db
heroku config:set UPLOADS_DIR=/app/uploads
heroku config:set ALLOWED_ORIGINS=https://your-app.herokuapp.com
```

**Frontend (.env.production):**
```env
REACT_APP_API_BASE_URL=https://your-app.herokuapp.com
```

## 5. Troubleshooting

### Error: "Failed to fetch subcontractors"

**Cause:** API not reachable from frontend

**Solutions:**
1. Check CORS configuration - verify `ALLOWED_ORIGINS` includes frontend domain
2. Check API URL - open browser DevTools → Network tab → check request URL
3. Test health endpoint: `curl https://example.com/health`
4. Check backend is running: `curl https://example.com:5000/health`

### Error: "Cannot connect to database"

**Cause:** Database path not writable or doesn't exist

**Solutions:**
1. Create directory: `mkdir -p /var/lib/app/data`
2. Set permissions: `chmod 755 /var/lib/app/data`
3. Check path in `.env`: `DB_PATH=/var/lib/app/data/projects.db`
4. Verify parent directory exists and is writable

### Data lost after restart

**Cause:** Database stored in non-persistent location

**Solutions:**
1. Use absolute path: `DB_PATH=/var/lib/app/data/projects.db` (not relative)
2. For Docker: ensure volumes are mounted (`/data`)
3. For cloud: use managed database or persistent storage

## 6. Testing Production Setup Locally

```bash
# Terminal 1 - Backend (production mode)
cd server
NODE_ENV=production npm start

# Terminal 2 - Frontend (production build)
cd app
npm run build
npx serve -s build -l 3000

# Test: Open http://localhost:3000
```

## 7. Security Checklist

- [ ] Use HTTPS in production
- [ ] Set `ALLOWED_ORIGINS` to specific domain(s)
- [ ] Use absolute paths for database
- [ ] Regularly backup SQLite database
- [ ] Set appropriate file permissions
- [ ] Monitor backend logs for errors
- [ ] Enable CORS only for trusted domains

## 8. Monitoring

**Check backend logs:**
```bash
# If using systemd
journalctl -u project-tracker-api -f

# If using Docker
docker logs -f <container_name>

# If running directly
# Check console output for errors
```

**Health check endpoint:**
```bash
curl https://example.com/health
# Response: {"status":"ok","message":"Server is running"}
```

---

**Still having issues?** Check the error message in browser console (F12 → Console tab) and backend logs.
