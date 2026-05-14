# Local Development vs Server Deployment - Key Differences

## Why Faculty Dashboard Works Locally But Not on Server

When you run the project locally on your laptop, Vite's dev server handles everything automatically. But on the college server, you need to handle configuration and process management manually.

---

## 1. Local Development (Your Laptop)

```
Your Browser
    ↓
Vite Dev Server (port 3035)
    ├─ React app (loaded from source)
    ├─ Vite proxy → /proconnectBackend/* → Flask backend (port 3036)
    └─ HMR (Hot Module Reloading for instant updates)

Backend runs manually:
    cd ProConnect-Backend
    python app.py (or via IDE)
    
No .env needed:
    - Config.py falls back to environment defaults
    - Local defaults work for dev (localhost:27017, etc)
```

**Everything works because:**
- Vite dev server auto-proxies API calls
- Flask runs in same local network
- No production build needed
- No reverse proxy needed

---

## 2. Server Deployment (College Server)

```
Browser → Nginx (reverse proxy)
    ├─ /proconnect/* → Node server (port 3035) → Serves dist/ folder
    │                  (Node server.js)
    │
    └─ /proconnectBackend/* → Gunicorn (port 3036)
                              (Flask backend)

MongoDB (port 27017)
    ← Connected by Flask backend
```

**Requires manual configuration:**
- ✅ Frontend built to `dist/` folder
- ✅ Backend `.env` file with correct MongoDB URI
- ✅ Nginx configured to proxy both frontend and backend
- ✅ Python virtual environment with dependencies installed
- ✅ Both processes running and monitored (PM2)
- ✅ Database connection working

---

## 3. What's Different on Server

### A. Frontend (Vite → Node Server + Nginx)

**Local:**
```bash
npm run dev
# Vite runs on port 3035
# Auto-proxies /proconnectBackend/* to backend
# React components hot-reload on file change
```

**Server:**
```bash
npm run build
# Creates dist/ folder with compiled React
# Node server.js serves dist/ folder
# Nginx proxies requests
# No hot-reload (static files)
```

### B. Backend (Flask → Gunicorn + PM2)

**Local:**
```bash
cd ProConnect-Backend
python app.py
# Flask runs in debug mode
# Single worker process
# Crashes on error
# Auto-restarts on file change (if using debugger)
```

**Server:**
```bash
# Create .env with real MongoDB URI and secrets
cd ProConnect-Backend
source .venv/bin/activate
pm2 start gunicorn ... -- -w 4 -b 127.0.0.1:3036 app:app
# Gunicorn runs 4 worker processes
# PM2 auto-restarts if crash
# Survives server reboot
# No debug mode (production)
```

### C. API Routing

**Local:**
```
Browser → Vite Dev (3035) → Vite Proxy → /proconnectBackend/api → Flask (3036)
                     ↓ (auto-proxies)
                  localhost:3036
```

**Server:**
```
Browser → Nginx → /proconnect/* → Node (3035)
                → /proconnectBackend/* → Gunicorn (3036)
                
Nginx rules:
    location /proconnect/ {
        proxy_pass http://127.0.0.1:3035/;
    }
    location /proconnectBackend/ {
        proxy_pass http://127.0.0.1:3036/;
    }
```

### D. Database Connection

**Local:**
```
config.py: MONGODB_URI = os.getenv('MONGODB_URI')
If .env not found: Falls back to None
But local MongoDB might be running anyway
```

**Server:**
```
.env MUST exist with correct MongoDB URI:
    - Local: mongodb://localhost:27017/proconnect
    - OR Atlas: mongodb+srv://user:pass@cluster...

Without .env:
    db = None → All API calls fail with database error
```

### E. Environment Variables

**Local (optional):**
- `ProConnect-Backend/.env` not needed
- Config falls back to Python defaults
- Works because local MongoDB often runs on port 27017

**Server (REQUIRED):**
- Must create `ProConnect-Backend/.env`
- Must set `MONGODB_URI` to your database
- Must set `JWT_SECRET`, `SECRET_KEY` to secure values
- Must set email variables if using password reset

---

## 4. The Most Common Failures

### ❌ Faculty Dashboard Loads But Shows No Data
**Cause:** Backend `.env` missing or has wrong MongoDB URI
**Fix:** Create `ProConnect-Backend/.env` with correct `MONGODB_URI`

### ❌ API Calls Return 404 or Timeout
**Cause:** Backend not running or Nginx proxy not configured
**Fix:** 
```bash
# Check backend is running:
pm2 status
# Check Nginx proxy:
curl http://localhost:3036/api/health
```

### ❌ Login Page Loads But Login Button Does Nothing
**Cause:** API request fails silently (backend not reachable)
**Fix:**
- Check browser console: F12 → Network tab → See what happens on login
- Verify backend endpoint is accessible: `curl /proconnectBackend/api/auth/login`

### ❌ "Cannot find module" or Import Errors
**Cause:** Node dependencies not installed
**Fix:**
```bash
npm install
npm run build
```

### ❌ "Database connection not established" in logs
**Cause:** `.env` file missing or `MONGODB_URI` wrong
**Fix:** Create `.env` with correct MongoDB URI

---

## 5. Checklist: From Local to Server

- [ ] **npm install** - Install Node dependencies
- [ ] **npm run build** - Create dist/ folder
- [ ] **Create ProConnect-Backend/.env** - With MongoDB URI and secrets
- [ ] **cd ProConnect-Backend && python3 -m venv .venv** - Create virtual env
- [ ] **source .venv/bin/activate && pip install -r requirements.txt** - Install Python packages
- [ ] **Configure Nginx** - Proxy both /proconnect/ and /proconnectBackend/
- [ ] **Start PM2 processes** - Frontend and backend
- [ ] **Test URLs** - /proconnect/faculty/login and /proconnectBackend/api/health
- [ ] **Check logs** - pm2 logs proconnectFrontend and pm2 logs proconnectBackend

---

## 6. Quick Diagnosis Commands

```bash
# Is frontend running?
curl http://localhost:3035/

# Is backend running?
curl http://localhost:3036/api/health

# Are Node deps installed?
ls -la node_modules/ | head

# Is Python venv created?
ls -la ProConnect-Backend/.venv/

# Check PM2 status
pm2 status

# View PM2 logs (last 50 lines)
pm2 logs proconnectFrontend --lines 50
pm2 logs proconnectBackend --lines 50

# Check if .env exists
cat ProConnect-Backend/.env

# Test MongoDB connection
mongosh "your-mongodb-uri"
```

---

## 7. The .env File is the Key

Everything breaks without `ProConnect-Backend/.env` because:

1. Backend loads environment variables from `.env`
2. `config.py` uses these to connect to MongoDB
3. If connection fails, `db = None`
4. All API endpoints return "Database connection not established"
5. Faculty Dashboard loads but has no data to display

**Solution:** Create `.env` with at minimum:
```
MONGODB_URI=mongodb://localhost:27017/proconnect
JWT_SECRET=any-random-secret-key
SECRET_KEY=any-random-secret-key
```

---

If you follow the **SERVER_DEPLOYMENT_CHECKLIST.md** from start to finish, your faculty dashboard will work perfectly on the college server.
