# Deployment Guide

This guide explains how to deploy your Project Tracker application to online hosting or as a standalone app.

## Overview

Your application has two components:
- **Frontend**: React app (port 3000 in development)
- **Backend**: Express.js server with SQLite database (port 5000 in development)

## Local Development Setup

### Prerequisites
- Node.js v14+ and npm installed
- Git (optional, for version control)

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Start the Application

The easiest way is to use the provided start script:

```bash
npm run start-all
```

Or start them separately in different terminals:

```bash
# Terminal 1 - Frontend
npm start

# Terminal 2 - Backend
cd server
npm run dev
```

## Production Deployment

### Database Configuration

SQLite works well for small-to-medium deployments. The database file needs to be stored in a **persistent location**.

#### Option 1: Relative Path (Default)
```bash
# .env file
DB_PATH=./projects.db
UPLOADS_DIR=./uploads
```
**Works best for:** Single-server deployments where uploads/server directory persists.

#### Option 2: Absolute Path (Recommended)
```bash
# .env file (Linux/Mac)
DB_PATH=/var/lib/app/data/projects.db
UPLOADS_DIR=/var/lib/app/data/uploads

# .env file (Windows)
DB_PATH=C:\app\data\projects.db
UPLOADS_DIR=C:\app\data\uploads
```
**Works best for:** Any production environment where you control the server.

#### Option 3: Docker/Cloud Deployment (Persistent Volume)
```bash
# .env file
DB_PATH=/data/projects.db
UPLOADS_DIR=/data/uploads
```
**Works best for:** Containerized deployments (Docker, Kubernetes) or cloud platforms (AWS, Azure, Heroku).

### Deployment Scenarios

## 1. **Heroku Deployment**

### Setup
```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add buildpack for Node.js (if needed)
heroku buildpacks:add heroku/nodejs
```

### Configuration

**Set environment variables:**
```bash
heroku config:set DB_PATH=/app/projects.db
heroku config:set UPLOADS_DIR=/app/uploads
heroku config:set REACT_APP_API_BASE_URL=https://your-app-name.herokuapp.com
```

**Note:** Heroku's filesystem is ephemeral. Your database and uploads will be lost when the app restarts. Use a persistent database service instead:
- Option A: PostgreSQL add-on
- Option B: AWS S3 for file uploads + Heroku Data add-ons

### Deploy
```bash
git push heroku main
```

---

## 2. **Self-Hosted VPS (DigitalOcean, Linode, AWS EC2)**

### Prerequisites
- Ubuntu/Linux server
- SSH access
- Node.js installed

### Setup

1. **Create data directory:**
```bash
sudo mkdir -p /var/lib/app/data
sudo chown $USER:$USER /var/lib/app/data
chmod 755 /var/lib/app/data
```

2. **Clone/upload your app:**
```bash
cd /var/lib/app
git clone <your-repo> .
# or upload files manually
```

3. **Install dependencies:**
```bash
npm install
cd server
npm install
cd ..
```

4. **Create `.env` file:**
```bash
cat > .env << EOF
REACT_APP_API_BASE_URL=https://your-domain.com
EOF

cat > server/.env << EOF
PORT=5000
DB_PATH=/var/lib/app/data/projects.db
UPLOADS_DIR=/var/lib/app/data/uploads
EOF
```

5. **Setup PM2 (process manager):**
```bash
npm install -g pm2

# Create PM2 ecosystem config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'project-tracker-backend',
      script: 'server/server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        DB_PATH: '/var/lib/app/data/projects.db',
        UPLOADS_DIR: '/var/lib/app/data/uploads'
      }
    },
    {
      name: 'project-tracker-frontend',
      script: 'npm start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        REACT_APP_API_BASE_URL: 'https://your-domain.com'
      }
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration to restart on server reboot
pm2 save
pm2 startup
```

6. **Setup Nginx as reverse proxy:**
```bash
sudo apt-get install nginx

# Create config
sudo nano /etc/nginx/sites-available/default
```

Add this configuration:
```nginx
upstream backend {
    server localhost:5000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Uploaded files
    location /uploads {
        proxy_pass http://backend;
    }
}
```

Reload Nginx:
```bash
sudo systemctl reload nginx
```

7. **Enable SSL (HTTPS) with Let's Encrypt:**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 3. **Docker Deployment**

### Create Dockerfile

Create `Dockerfile` in root directory:
```dockerfile
FROM node:16

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install && cd ..

# Copy app code
COPY . .

# Build frontend
RUN npm run build

EXPOSE 3000 5000

# Create data directory
RUN mkdir -p /data/uploads

# Set environment variables
ENV NODE_ENV=production
ENV DB_PATH=/data/projects.db
ENV UPLOADS_DIR=/data/uploads
ENV REACT_APP_API_BASE_URL=http://localhost:5000

# Start both frontend and backend
CMD ["node", "scripts/start-all.js"]
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "5000:5000"
    volumes:
      - app-data:/data
    environment:
      - NODE_ENV=production
      - DB_PATH=/data/projects.db
      - UPLOADS_DIR=/data/uploads
      - REACT_APP_API_BASE_URL=http://localhost:5000
      - PORT=5000

volumes:
  app-data:
    driver: local
```

### Run Docker

```bash
docker-compose up --build
```

---

## 4. **Windows Executable (Electron)**

For converting to a Windows app:

1. **Install Electron:**
```bash
npm install electron --save-dev
```

2. **Create main.js for Electron integration:**
```javascript
const { app, BrowserWindow } = require('electron');
const spawn = require('child_process').spawn;
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;
let server;

function startBackend() {
  const backendPath = path.join(__dirname, 'server', 'server.js');
  process.env.DB_PATH = path.join(app.getPath('userData'), 'projects.db');
  process.env.UPLOADS_DIR = path.join(app.getPath('userData'), 'uploads');
  
  server = spawn('node', [backendPath]);
}

app.on('ready', () => {
  startBackend();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false
    }
  });

  const startUrl = isDev 
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);
});

app.on('quit', () => {
  if (server) server.kill();
});
```

3. **Add Electron build script to package.json:**
```json
{
  "scripts": {
    "electron": "electron .",
    "electron-build": "npm run build && electron-builder"
  }
}
```

---

## 5. **Cloud Platforms**

### AWS (Elastic Beanstalk)
```bash
pip install awsebcli --upgrade --user
eb init -p node.js-16
eb create prod-env
eb deploy
```

### Azure App Service
```bash
az webapp create --resource-group myResourceGroup --plan myPlan --name myApp
az webapp config set --resource-group myResourceGroup --name myApp --startup-file "server/server.js"
```

### Google Cloud Run
```bash
gcloud run deploy project-tracker \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Important Considerations

### 1. **Database Backups**
Always backup your SQLite database regularly:
```bash
cp /var/lib/app/data/projects.db /backups/projects.db.$(date +%Y%m%d)
```

### 2. **Environment Variables**
- **Never commit `.env` files to git**
- Use `.env.example` as a template
- Set different values for each environment (dev, staging, prod)

### 3. **CORS Configuration**
If frontend and backend are on different domains, update CORS:
```javascript
// server/server.js
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

### 4. **File Uploads**
For production:
- Set upload size limit in Nginx: `client_max_body_size 50M;`
- Consider using cloud storage (S3) for large deployments
- Implement file cleanup to prevent disk space issues

### 5. **Performance**
For high-traffic deployments, consider:
- Using PostgreSQL instead of SQLite
- Adding Redis caching
- Using a CDN for static files
- Load balancing multiple backend instances

### 6. **Security**
- Use HTTPS/SSL certificates
- Keep Node.js packages updated: `npm audit fix`
- Add rate limiting middleware
- Validate and sanitize all inputs
- Set secure CORS headers
- Use environment variables for sensitive data

---

## Troubleshooting

### Database not found
```
Error: ENOENT: no such file or directory
```
**Solution:** Ensure `DB_PATH` directory exists and is writable:
```bash
mkdir -p $(dirname $DB_PATH)
chmod 755 $(dirname $DB_PATH)
```

### Can't connect to API
- Check `REACT_APP_API_BASE_URL` matches your backend URL
- Verify CORS is configured correctly
- Check firewall rules allow traffic on port 5000

### Uploads fail
- Verify `UPLOADS_DIR` exists and is writable
- Check file permissions: `chmod 755 $UPLOADS_DIR`
- Ensure sufficient disk space

### Database locked
If you see "database is locked":
- Restart the server
- Check for other processes using the database
- Use WAL mode in SQLite (more concurrent access)

---

## Quick Reference Commands

```bash
# Local development
npm run start-all

# Production build
npm run build

# Backend only
cd server && npm run dev

# Check if ports are in use
lsof -i :3000
lsof -i :5000

# Kill process on port
kill -9 $(lsof -t -i:3000)
```

For more help, refer to the README.md in the project root.
