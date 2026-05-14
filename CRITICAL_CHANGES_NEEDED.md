# ProConnect Server: Critical Changes & Installations Needed

## 📋 Executive Summary

Your faculty dashboard doesn't work on the college server because **3 critical files are missing** and **several installations haven't been done**. Below is exactly what needs to be done.

---

## 🔴 CRITICAL: What's Missing on Server

### 1. Backend .env File ⚠️ MOST IMPORTANT

**Status:** ❌ MISSING - This is why dashboard shows no data

**Location:** `ProConnect-Backend/.env`

**What to do:**
```bash
# Create the file with these values (CHANGE THE SECRETS!):
cat > ProConnect-Backend/.env << 'EOF'
SECRET_KEY=generate-random-secret-key-at-least-32-characters
JWT_SECRET=generate-random-jwt-secret-at-least-32-characters
MONGODB_URI=mongodb://localhost:27017/proconnect
DB_NAME=proconnect
HOST=0.0.0.0
PORT=3036
FLASK_ENV=production
FLASK_DEBUG=False
JWT_EXPIRATION_HOURS=24
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-app-password-16-chars
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EOF
```

**Why:** Without this, the backend can't connect to MongoDB. Faculty dashboard loads but shows no student data.

---

### 2. Frontend Build Output ⚠️ MISSING

**Status:** ❌ MISSING - Need to build React app

**Location:** `dist/` folder (doesn't exist yet)

**What to do:**
```bash
npm install
npm run build
```

**Result:** Creates `dist/` folder with compiled React app (~2-5MB of files)

**Why:** The Node server.js serves files from `dist/`. Without it, frontend can't serve any pages.

---

### 3. Python Virtual Environment ⚠️ MISSING

**Status:** ❌ MISSING - Backend dependencies not installed

**Location:** `ProConnect-Backend/.venv/` (doesn't exist yet)

**What to do:**
```bash
cd ProConnect-Backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..
```

**Why:** Without this, backend can't import Flask, pymongo, bcrypt, etc.

---

## 📦 Required Installations on Server

### System Packages (if not already installed)

```bash
# Check if installed:
which git curl wget unzip nodejs npm python3 mongodb nginx

# Install what's missing (Ubuntu/Debian):
sudo apt update
sudo apt install -y git curl wget unzip nodejs npm python3 python3-venv python3-pip

# Optional but recommended:
sudo apt install -y nginx
sudo npm install -g pm2
```

---

### NPM Dependencies

```bash
# From project root:
npm install

# This installs: react, react-router-dom, axios, vite, typescript, etc.
```

**Check:** `ls -la node_modules/ | wc -l` should show 200+ directories

---

### Python Dependencies

```bash
# From ProConnect-Backend/:
cd ProConnect-Backend
source .venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..
```

**Check:** Look for `[OK] Connected to MongoDB` when backend starts

---

### MongoDB

**Option A: Local MongoDB (same server)**
```bash
sudo apt install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod
mongosh  # Test connection
```

**Option B: MongoDB Atlas (Cloud)**
- Go to https://www.mongodb.com/cloud/atlas
- Create free account and cluster
- Get connection string: `mongodb+srv://user:pass@cluster...`
- Add to `ProConnect-Backend/.env` as `MONGODB_URI`

---

### PM2 Process Manager (Recommended)

```bash
sudo npm install -g pm2
pm2 startup
pm2 save
```

**Why:** Keeps both frontend and backend running, auto-restarts on crash, survives server reboot.

---

### Nginx (Recommended for Server)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

**Then configure** (see below)

---

## ⚙️ Required Configuration Changes

### 1. Nginx Configuration

Create or edit `/etc/nginx/sites-available/default`:

```nginx
server {
    listen 80;
    server_name your-college-domain.com;

    # Frontend React App
    location /proconnect/ {
        proxy_pass http://127.0.0.1:3035/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend Flask API
    location /proconnectBackend/ {
        proxy_pass http://127.0.0.1:3036/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Redirect root to /proconnect/
    location / {
        return 301 /proconnect/;
    }
}
```

**Then reload:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 2. CORS Settings in Backend

**File:** `ProConnect-Backend/app.py` (Around line 20-30)

**Current (TOO RESTRICTIVE):**
```python
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            "",  # ← This is problematic
        ],
```

**Update to:**
```python
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            "http://your-college-domain.com",
            "https://your-college-domain.com",
            "http://your-college-server-ip:80",
        ],
```

---

## 🚀 Complete Deployment Sequence

Run these in order on your college server:

```bash
# 1. Navigate to project
cd /path/to/ProConnect_final-main

# 2. Install frontend dependencies
npm install
npm run build

# 3. Create backend .env (EDIT WITH YOUR VALUES!)
cat > ProConnect-Backend/.env << 'EOF'
SECRET_KEY=your-random-secret-key-change-this
JWT_SECRET=your-random-jwt-secret-change-this
MONGODB_URI=mongodb://localhost:27017/proconnect
DB_NAME=proconnect
HOST=0.0.0.0
PORT=3036
FLASK_ENV=production
FLASK_DEBUG=False
SENDER_EMAIL=your-gmail@gmail.com
SENDER_PASSWORD=your-app-password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EOF

# 4. Set up Python backend
cd ProConnect-Backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..

# 5. Start frontend
pm2 start server.js --name proconnectFrontend
pm2 save

# 6. Start backend
cd ProConnect-Backend
source .venv/bin/activate
pm2 start .venv/bin/gunicorn --name proconnectBackend \
  --cwd $(pwd) -- -w 4 -b 127.0.0.1:3036 app:app
deactivate
cd ..

# 7. Configure and reload nginx
sudo nano /etc/nginx/sites-available/default
# (Paste config from above)
sudo nginx -t
sudo systemctl reload nginx

# 8. Verify
pm2 status
curl http://localhost:3036/api/health
curl http://localhost:3035/
```

---

## ✅ Verification Checklist

After doing all above, test these:

```bash
☐ npm install completed without errors
☐ npm run build created dist/ folder
☐ dist/ folder exists with 200+ files
☐ ProConnect-Backend/.env file exists
☐ Python venv created: .venv/bin/activate exists
☐ pip install requirements.txt completed
☐ MongoDB is running (mongosh works)
☐ pm2 status shows both processes "online"
☐ curl http://localhost:3035/ returns HTML
☐ curl http://localhost:3036/api/health returns {"status": "healthy"}
☐ Nginx config loads without errors (sudo nginx -t)
☐ Nginx is running (sudo systemctl status nginx)
☐ Browser can access http://your-domain/proconnect/faculty/login
☐ Faculty dashboard loads after login
☐ Faculty dashboard shows student data
☐ Filters work correctly
```

---

## 🔍 Quick Diagnosis If Something Still Doesn't Work

```bash
# Check what's running
pm2 status

# Check logs
pm2 logs proconnectFrontend --lines 50
pm2 logs proconnectBackend --lines 50

# Test backend
curl http://localhost:3036/api/health

# Test MongoDB
mongosh --eval "db.adminCommand('ping')"

# Check .env exists
cat ProConnect-Backend/.env | grep MONGODB_URI

# Check dist/ exists
ls -la dist/ | head
```

---

## 📊 Summary Table

| What | Status | Need To Do |
|------|--------|-----------|
| `dist/` folder | ❌ Missing | `npm run build` |
| `ProConnect-Backend/.env` | ❌ Missing | Create with values |
| `node_modules/` | ❌ Missing | `npm install` |
| `ProConnect-Backend/.venv/` | ❌ Missing | `python3 -m venv .venv` + `pip install -r requirements.txt` |
| MongoDB | ⚠️ Needs setup | Install or use Atlas |
| Nginx | ⚠️ Needs config | Create proxy config |
| PM2 | ⚠️ Needs setup | Install and start processes |
| CORS config | ⚠️ May need update | Update domain in app.py |

---

## 🎯 What Each Fix Does

1. **`.env` file** → Backend can connect to database → Dashboard shows student data
2. **`npm run build`** → Create frontend build → Pages load and render correctly
3. **`npm install`** → Install React, Vite, axios → App runs without module errors
4. **Python venv** → Install Flask, pymongo, bcrypt → Backend API works
5. **MongoDB** → Database for storing student/faculty data → Data persists
6. **Nginx config** → Route requests correctly → /proconnect/ and /proconnectBackend/ work
7. **PM2** → Processes stay alive → App works after server restart
8. **CORS update** → Allow requests from your domain → No cross-origin errors

---

## 🆘 One More Thing

If you're stuck, the **most likely cause** is the `.env` file is missing or has wrong `MONGODB_URI`.

Check this:
```bash
# 1. Does .env exist?
cat ProConnect-Backend/.env

# 2. Can backend connect to MongoDB?
pm2 logs proconnectBackend --lines 50 | grep -i mongo

# 3. Are both processes running?
pm2 status

# 4. Can you reach backend API?
curl http://localhost:3036/api/health
```

If any of these fail, that's your problem!

---

**Need Help?** Follow the **SERVER_DEPLOYMENT_CHECKLIST.md** or **FACULTY_DASHBOARD_TROUBLESHOOTING.md** for detailed steps.
