Deploying the full app (client + server) to Render using Docker

1) Overview
- This Dockerfile builds the React client and runs the Node `server/server.js` process which serves API routes and static files from `build/`.

2) Build & Deploy on Render (Docker)
- Create a new Web Service on Render and connect your GitHub repository.
- Choose "Docker" as the environment and set the Dockerfile path to `/app/Dockerfile`.
- Set the service to run on port `3000` (the container exposes `3000`).
- Add required environment variables (e.g., `NODE_ENV`, any DB credentials).

3) Local test
```bash
cd app
docker build -t new-report-app .
docker run -p 3000:3000 --env PORT=3000 new-report-app
# Open http://localhost:3000
```

4) Notes
- The server marks `sqlite3` and `tesseract.js` as optional dependencies; if your deployment needs them, make sure the target environment supports native binaries or switch to managed services for OCR/DB.
