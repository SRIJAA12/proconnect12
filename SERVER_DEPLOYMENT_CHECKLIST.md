# ProConnect Server Deployment Checklist

## ⚠️ CRITICAL ISSUES FOUND

Your project needs these critical steps to work on the college server:

---

## 1. **MISSING: Backend .env File** ❌ CRITICAL

The backend is looking for `ProConnect-Backend/.env` but it doesn't exist.

### Action Required:
Create `ProConnect-Backend/.env` with your server configuration:

```bash
# From project root:
cat > ProConnect-Backend/.env << 'EOF'
# Flask Configuration
SECRET_KEY=your-secret-key-change-this
FLASK_ENV=production
FLASK_DEBUG=False
JWT_EXPIRATION_HOURS=24

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-change-this

# MongoDB Configuration
# Option A: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/proconnect
# Option B: MongoDB Atlas (replace with your connection string)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/proconnect?retryWrites=true&w=majority
DB_NAME=proconnect

# Server Configuration
HOST=0.0.0.0
PORT=3036

# Email Configuration (for password reset)
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-app-password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EOF
```

**⚠️ Important:** 
- Change `SECRET_KEY` and `JWT_SECRET` to unique values
- If using Gmail for password reset, use an **App Password** (not your regular password)
- If you don't want email features, leave `SENDER_EMAIL` blank and the backend will skip email-based password reset

---

## 2. **Frontend Build Missing** ❌ REQUIRED

The `dist/` folder doesn't exist. The frontend must be built before serving.

### Action Required:
```bash
# From project root
npm install
npm run build
```

This creates `dist/` which contains the compiled React app.

---

## 3. **Node.js Dependencies Not Installed** ❌ REQUIRED

### Action Required:
```bash
# From project root
npm install
```

Installs: axios, react, react-router-dom, vite, typescript, etc.

---

## 4. **Python Backend Dependencies Not Installed** ❌ REQUIRED

### Action Required:
```bash
# From project root
cd ProConnect-Backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..
```

This installs: Flask, Flask-CORS, pymongo, PyJWT, bcrypt, gunicorn, etc.

---

## 5. **Nginx Configuration** ❌ REQUIRED FOR SERVER

The college server needs nginx to proxy both frontend and backend.

### Action Required:

Edit your nginx config (usually `/etc/nginx/sites-available/default` or `/etc/nginx/nginx.conf`):

```nginx
server {
    listen 80;
    server_name your-college-domain.com;  # Change this

    # Frontend under /proconnect/
    location /proconnect/ {
        proxy_pass http://127.0.0.1:3035/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API under /proconnectBackend/
    location /proconnectBackend/ {
        proxy_pass http://127.0.0.1:3036/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Optional: Redirect root to /proconnect/
    location / {
        return 301 /proconnect/;
    }
}
```

Then reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. **PM2 Process Manager** ⚠️ STRONGLY RECOMMENDED

Without PM2, processes will stop if they crash or if the server reboots.

### Action Required:

#### Install PM2:
```bash
sudo npm install -g pm2
pm2 startup
pm2 save
```

#### Start Frontend Process:
```bash
cd /path/to/ProConnect_final-main
pm2 start server.js --name proconnectFrontend
```

#### Start Backend Process:
```bash
cd /path/to/ProConnect_final-main/ProConnect-Backend
source .venv/bin/activate
pm2 start .venv/bin/gunicorn --name proconnectBackend \
  --cwd /path/to/ProConnect_final-main/ProConnect-Backend \
  -- -w 4 -b 127.0.0.1:3036 app:app
```

#### Save and check:
```bash
pm2 save
pm2 status
pm2 logs proconnectFrontend
pm2 logs proconnectBackend
```

---

## 7. **Database Setup** ⚠️ REQUIRED

Your backend needs MongoDB to store student and faculty data.

### Option A: Local MongoDB on server
```bash
sudo apt install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod
# Test connection:
mongosh
> db.adminCommand('ping')
> exit
```

### Option B: MongoDB Atlas (Cloud)
- Create account at https://www.mongodb.com/cloud/atlas
- Get connection string
- Paste into `ProConnect-Backend/.env` as `MONGODB_URI`

---

## 8. **CORS Configuration Update** ⚠️ CHECK REQUIRED

The backend currently only allows requests from localhost. Update `ProConnect-Backend/app.py`:

```python
# Find this section and update with your server domain:
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",
            "http://your-college-domain.com",
            "https://your-college-domain.com",
            "http://your-college-ip",
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

---

## 9. **Test Each Component** ✅ VERIFICATION

After all setup, test these URLs:

```
http://your-domain/proconnect                    # Should show student login
http://your-domain/proconnect/student/login      # Student login page
http://your-domain/proconnect/faculty/login      # Faculty login page
http://your-domain/proconnectBackend/api/health  # Should return {"status": "healthy"}
```

### Check logs:
```bash
pm2 logs proconnectFrontend --lines 50
pm2 logs proconnectBackend --lines 50
```

---

## 10. **Common Issues & Fixes**

### Faculty Dashboard Shows Blank/No Data
- ❌ Check if backend is running: `pm2 logs proconnectBackend`
- ❌ Check if MongoDB is connected: Look for `[OK] Connected to MongoDB` in logs
- ❌ Check if `.env` has correct MongoDB URI

### "Cannot POST /api/auth/login" 
- ❌ Backend process crashed or not running
- ❌ Nginx not proxying to backend correctly
- ❌ Check `pm2 status` and `pm2 logs proconnectBackend`

### API calls timeout
- ❌ Backend listening on wrong port (should be 3036)
- ❌ Nginx proxy not configured correctly
- ❌ Firewall blocking port 3036

### Email/Password reset not working
- ❌ `SENDER_EMAIL` and `SENDER_PASSWORD` not set in `.env`
- ❌ Gmail app password incorrect (use app password, not regular password)

---

## 11. **Complete Deployment Sequence**

Run these commands in order on your college server:

```bash
# 1. Prepare
cd /path/to/ProConnect_final-main
git pull  # or copy the latest files

# 2. Frontend
npm install
npm run build

# 3. Backend setup
cd ProConnect-Backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..

# 4. Create .env (see section 1 above)
# nano ProConnect-Backend/.env

# 5. Start PM2 processes (if PM2 installed)
pm2 start server.js --name proconnectFrontend
cd ProConnect-Backend
source .venv/bin/activate
pm2 start .venv/bin/gunicorn --name proconnectBackend \
  --cwd $(pwd) -- -w 4 -b 127.0.0.1:3036 app:app
cd ..

# 6. Verify
pm2 status
curl http://localhost:3036/api/health
curl http://localhost:3035/

# 7. Configure nginx (see section 5)
sudo nginx -t
sudo systemctl reload nginx

# 8. Check final URLs in browser
# http://your-domain/proconnect/faculty/login
```

---

## Summary

| Component | Status | Action |
|-----------|--------|--------|
| Frontend build (`dist/`) | ❌ Missing | `npm install && npm run build` |
| Backend `.env` file | ❌ Missing | Create with correct values |
| Node dependencies | ⚠️ Check | `npm install` |
| Python venv | ⚠️ Check | Create and `pip install -r requirements.txt` |
| Database (MongoDB) | ⚠️ Check | Set up MongoDB or Atlas |
| Nginx proxy | ⚠️ Check | Configure to proxy /proconnect/ and /proconnectBackend/ |
| PM2 processes | ⚠️ Check | Start with PM2 |
| CORS settings | ⚠️ Check | Update for your domain |

---

**Next Step:** Start with section 1 (create `.env`) and follow through all sections in order.
