# Faculty Dashboard Troubleshooting Guide

## Problem: Faculty Dashboard Is A Mess / Not Working on Server

This guide helps you diagnose and fix specific faculty dashboard issues.

---

## Quick Diagnosis: Run These Tests

### Test 1: Is the Frontend Loading?
```bash
curl -I http://localhost:3035/

# Expected:
# HTTP/1.1 200 OK
```

### Test 2: Is the Backend Running?
```bash
curl http://localhost:3036/api/health

# Expected:
# {"status": "healthy", "message": "ProConnect Backend is running", "version": "1.0.0"}
```

### Test 3: Can the Frontend Reach the Backend?
Open browser console (F12) → Network tab → Login and watch requests
- Should see POST to `/proconnectBackend/api/auth/faculty-login`
- Should return 200 or 401 (not 404 or timeout)

---

## Common Faculty Dashboard Issues & Fixes

### ❌ Issue 1: Faculty Login Page Shows But Login Does Nothing

**Symptoms:**
- Faculty login page loads
- Click "Login" button
- Nothing happens, page stays same
- No error message

**Root Cause:** Backend not reachable

**Fixes (in order):**

1. **Check if backend is running:**
   ```bash
   pm2 status
   # Should show "proconnectBackend" online
   
   pm2 logs proconnectBackend --lines 20
   # Look for any error messages
   ```

2. **Check if backend can be reached:**
   ```bash
   curl http://localhost:3036/api/health
   # Should return: {"status": "healthy"}
   ```

3. **Check if Nginx proxy is configured:**
   ```bash
   curl http://localhost:3035/
   # Should return HTML of dist/index.html
   
   curl http://localhost:3035/proconnect/faculty/login
   # Should return the React app HTML
   ```

4. **Check Nginx configuration:**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   
   # View config:
   cat /etc/nginx/sites-available/default | grep -A5 "proconnectBackend"
   ```

5. **Test API call directly:**
   ```bash
   curl -X POST http://localhost:3036/api/auth/faculty-login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@psgitech.ac.in","password":"test"}'
   
   # Should return either:
   # - {"error": "Invalid email or password"} (backend working)
   # - Cannot connect (backend not running)
   ```

---

### ❌ Issue 2: Faculty Dashboard Loads But Shows No Data

**Symptoms:**
- Login works
- Dashboard loads
- No student data
- Page might say "Loading..." forever
- Or shows empty table

**Root Cause:** Database connection issue

**Fixes (in order):**

1. **Check backend .env exists:**
   ```bash
   cat ProConnect-Backend/.env
   # Should show MONGODB_URI, JWT_SECRET, etc.
   ```

2. **Check backend logs for database errors:**
   ```bash
   pm2 logs proconnectBackend --lines 50
   # Look for:
   # - "[FAIL] Failed to connect to MongoDB"
   # - "Database connection not established"
   # - "Connection refused"
   ```

3. **Test MongoDB connection:**
   ```bash
   # If using local MongoDB:
   mongosh
   > db.adminCommand('ping')
   # Should return: { ok: 1 }
   
   # If using Atlas, test the URI:
   mongosh "mongodb+srv://user:pass@cluster.mongodb.net/proconnect"
   ```

4. **Restart backend with correct .env:**
   ```bash
   pm2 restart proconnectBackend --update-env
   pm2 logs proconnectBackend --lines 50
   # Should see: "[OK] Connected to MongoDB successfully!"
   ```

5. **Clear browser cache and login again:**
   ```
   F12 → Application → Clear Site Data
   Refresh page and login again
   ```

---

### ❌ Issue 3: Faculty Dashboard Crashes or Shows Error

**Symptoms:**
- Page loading, then crashes
- Red error message in console
- "Internal server error" or "API error"

**Fixes:**

1. **Check browser console (F12):**
   ```
   Open F12 → Console tab
   Look for red errors with details
   Note the error message
   ```

2. **Check API response status:**
   ```
   Open F12 → Network tab
   Click API request
   Check Status code:
   - 200: OK
   - 400: Bad request
   - 401: Unauthorized (login again)
   - 404: Endpoint not found
   - 500: Server error (check backend logs)
   ```

3. **Check backend logs:**
   ```bash
   pm2 logs proconnectBackend --lines 100
   # Look for stack traces or error messages
   ```

---

### ❌ Issue 4: "CORS Error" or Cross-Origin Request Blocked

**Symptoms:**
- Console shows: "Access to XMLHttpRequest has been blocked by CORS"
- API requests fail silently
- Works on localhost but not on server

**Root Cause:** CORS configuration too restrictive

**Fix:**

Update `ProConnect-Backend/app.py` to allow your server domain:

```python
# Find this section:
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            "http://your-college-domain.com",        # Add this
            "https://your-college-domain.com",       # Add this
            "http://your-college-server-ip",         # Add this if using IP
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

Then restart:
```bash
pm2 restart proconnectBackend
```

---

### ❌ Issue 5: Faculty Can See Some Data But Filters Don't Work

**Symptoms:**
- Dashboard loads with data
- But search/filter buttons do nothing
- Or filters crash the page

**Root Cause:** Usually API endpoint missing or wrong filter parameter

**Fix:**

1. **Check browser network tab (F12):**
   - Click filter button
   - Watch Network tab
   - Does a request go out?
   - What status code does it return?

2. **Check which endpoint is being called:**
   ```bash
   pm2 logs proconnectBackend --lines 30
   # Should see: ">> POST /api/students/filter"
   # Or similar endpoint
   ```

3. **If endpoint doesn't exist:**
   ```bash
   # Check what endpoints are available:
   grep -r "@.*bp.route" ProConnect-Backend/routes/
   ```

4. **Restart and try again:**
   ```bash
   pm2 restart proconnectBackend
   ```

---

### ❌ Issue 6: Faculty Dashboard Redirects to Login After Logout

**Symptoms:**
- Everything works
- But faculty dashboard redirects to login page
- Keeps asking to login even after successful login

**Root Cause:** Token not being stored or retrieved correctly

**Fix:**

1. **Check localStorage in browser (F12 → Application → LocalStorage):**
   - Should have: `token` and `refreshToken`
   - If missing, login is failing

2. **Check API response on login:**
   ```
   F12 → Network tab → Find login request
   → Response tab → Should show "token" and "refreshToken"
   ```

3. **Check if backend is returning tokens:**
   ```bash
   curl -X POST http://localhost:3036/api/auth/faculty-login \
     -H "Content-Type: application/json" \
     -d '{"email":"faculty@psgitech.ac.in","password":"password123"}'
   
   # Response should include: {"token": "...", "refreshToken": "..."}
   ```

---

## Complete Diagnostic Script

Run this to check everything at once:

```bash
#!/bin/bash
echo "=== ProConnect Server Diagnostics ==="
echo ""

echo "1. Frontend running?"
curl -s http://localhost:3035/ > /dev/null && echo "✓ Yes" || echo "✗ No"

echo "2. Backend running?"
curl -s http://localhost:3036/api/health | grep -q "healthy" && echo "✓ Yes" || echo "✗ No"

echo "3. MongoDB connected?"
pm2 logs proconnectBackend --lines 5 --nostream | grep -q "Connected to MongoDB" && echo "✓ Yes" || echo "✗ Check logs"

echo "4. PM2 Status:"
pm2 status

echo "5. Recent Backend Errors:"
pm2 logs proconnectBackend --lines 20 --nostream | grep -E "error|ERROR|failed|Failed"

echo "6. .env file exists?"
[ -f "ProConnect-Backend/.env" ] && echo "✓ Yes" || echo "✗ No - CREATE IT!"

echo "7. dist/ folder exists?"
[ -d "dist" ] && echo "✓ Yes" || echo "✗ No - Run: npm run build"

echo ""
echo "=== If all pass, dashboard should work ==="
```

Save as `diagnose.sh` and run:
```bash
chmod +x diagnose.sh
./diagnose.sh
```

---

## Specific Faculty Routes & Endpoints

These are the API endpoints your faculty dashboard uses:

```
POST   /api/auth/faculty-login              → Faculty login
GET    /api/faculty/profile                 → Get faculty info
GET    /api/students                        → Get all students (with company data)
POST   /api/students/filter                 → Filter students by criteria
GET    /api/students/{id}                   → Get single student details
POST   /api/faculty/export                  → Export student data to CSV
GET    /api/auth/health                     → Server health check
POST   /api/auth/refresh-token              → Refresh JWT token
```

If any of these return 404, the endpoint doesn't exist or isn't registered in the backend.

---

## Nuclear Option: Complete Reset

If nothing works, try complete reset:

```bash
# 1. Kill all processes
pm2 delete proconnectFrontend
pm2 delete proconnectBackend

# 2. Clean builds
rm -rf dist
rm -rf ProConnect-Backend/.venv

# 3. Rebuild
npm install
npm run build

cd ProConnect-Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# 4. Verify .env
cat ProConnect-Backend/.env
# Should have: MONGODB_URI, JWT_SECRET, etc.

# 5. Restart processes
pm2 start server.js --name proconnectFrontend
cd ProConnect-Backend
source .venv/bin/activate
pm2 start .venv/bin/gunicorn --name proconnectBackend \
  --cwd $(pwd) -- -w 4 -b 127.0.0.1:3036 app:app
cd ..

# 6. Check logs
pm2 logs proconnectFrontend --lines 20
pm2 logs proconnectBackend --lines 20
```

---

## Get Help With Specific Error

If you get a specific error message:

1. **Post the error message** from `pm2 logs`
2. **Post the Browser Console error** (F12)
3. **Post the Network tab response** (F12)
4. Run `diagnose.sh` above and share output

This will help pinpoint the exact issue.

---

## One-Line Tests

```bash
# Is frontend responding?
curl http://localhost:3035/ | head -c 100

# Is backend responding?
curl http://localhost:3036/api/health

# Can frontend reach backend through Nginx?
curl http://localhost:3035/proconnectBackend/api/health

# Is MongoDB working?
mongosh --eval "db.adminCommand('ping')"

# Are tokens being created?
curl -X POST http://localhost:3036/api/auth/faculty-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@psgitech.ac.in","password":"test"}' | grep token

# Check PM2 health
pm2 status && pm2 logs --lines 5
```

---

## Summary

**Faculty dashboard works when:**
1. ✅ Frontend is built (`dist/` exists)
2. ✅ Frontend process is running (`pm2 status`)
3. ✅ Backend process is running (`pm2 status`)
4. ✅ MongoDB is connected (check `pm2 logs`)
5. ✅ `.env` file exists with correct values
6. ✅ Nginx proxies both `/proconnect/` and `/proconnectBackend/`
7. ✅ CORS allows your domain
8. ✅ Faculty account exists in database

Check each one in order, and you'll find the issue!
