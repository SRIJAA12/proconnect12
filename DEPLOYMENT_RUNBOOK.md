# ProConnect Deployment Runbook

This document explains how to deploy ProConnect on a fresh Linux server starting from zero. It includes the required software, exact commands, nginx setup, backend/frontend startup, and the project changes made in this workspace.

## 1. What this project needs

ProConnect has two parts:

- Frontend: React + Vite app served under `/proconnect/`
- Backend: Flask API served under `/proconnectBackend/`

The app expects these services and dependencies:

- Node.js and npm
- Python 3, `venv`, and pip
- MongoDB, or a MongoDB Atlas connection string
- Nginx as the reverse proxy
- PM2 to keep the Node and backend processes alive

## 2. Project-specific routes

These are the URLs this project is designed to use behind nginx:

- `https://your-domain/proconnect` -> student login
- `https://your-domain/proconnect/student/login` -> student login
- `https://your-domain/proconnect/faculty/login` -> faculty login
- `https://your-domain/proconnectBackend/api/...` -> backend API routes

## 3. Fresh server setup

The commands below assume Ubuntu or Debian. If your server uses a different Linux distribution, the package manager commands may change.

### 3.1 Update the server

```bash
sudo apt update
sudo apt -y upgrade
```

### 3.2 Install base tools

```bash
sudo apt install -y git curl wget unzip build-essential
```

### 3.3 Install Node.js 20 and npm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 3.4 Install Python tools

```bash
sudo apt install -y python3 python3-venv python3-pip
python3 --version
```

### 3.5 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3.6 Install PM2

```bash
sudo npm install -g pm2
pm2 -v
```

### 3.7 Install MongoDB

You can use either local MongoDB or MongoDB Atlas.

#### Option A: Local MongoDB on the server

Use this only if you want the database running on the same machine.

```bash
sudo apt install -y gnupg
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod
sudo systemctl status mongod
```

#### Option B: MongoDB Atlas

If you use Atlas, skip the local install and set `MONGODB_URI` in the backend `.env` to your Atlas connection string.

## 4. Get the project onto the server

```bash
cd /path/where/you/want/the/project
git clone <your-repo-url> ProConnect_final-main
cd ProConnect_final-main
```

If you are not using git on the new server, copy the project folder there by any method you prefer.

## 5. Install frontend dependencies

The root folder is the frontend app.

```bash
npm install
```

## 6. Install backend dependencies

The backend lives in `ProConnect-Backend`.

```bash
cd ProConnect-Backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..
```

## 7. Create backend environment file

Create `ProConnect-Backend/.env` and fill in the values for your server.

Required variables:

- `MONGODB_URI`
- `DB_NAME`
- `JWT_SECRET`
- `SECRET_KEY`
- `HOST`
- `PORT`
- `SENDER_EMAIL`
- `SENDER_PASSWORD`
- `SMTP_SERVER`
- `SMTP_PORT`

Example content:

```env
SECRET_KEY=change-this-secret
JWT_SECRET=change-this-jwt-secret
MONGODB_URI=mongodb://localhost:27017/proconnect
DB_NAME=proconnect
HOST=0.0.0.0
PORT=3036
SENDER_EMAIL=your-gmail-address@example.com
SENDER_PASSWORD=your-gmail-app-password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

If you use MongoDB Atlas, replace `MONGODB_URI` with the Atlas connection string.

## 8. Build the frontend

The frontend must be built before nginx or the Node server can serve it.

```bash
npm run build
```

This produces the `dist/` directory.

## 9. Configure nginx

The important part is to proxy the frontend and backend under the `/proconnect/` prefix.

Example nginx locations:

```nginx
location /proconnect/ {
    proxy_pass http://localhost:3035/;
}

location /proconnectBackend/ {
    proxy_pass http://localhost:3036/;
}
```

Full nginx config in this workspace already uses the same idea. After editing nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 10. Start the frontend process

The root `server.js` serves the built `dist/` folder and must stay alive.

```bash
pm2 start server.js --name proconnectFrontend --cwd /path/to/ProConnect_final-main
pm2 save
pm2 status
```

## 11. Start the backend process

The backend should run on port `3036` because nginx proxies `/proconnectBackend/` there.

Recommended production command with Gunicorn:

```bash
cd /path/to/ProConnect_final-main/ProConnect-Backend
source .venv/bin/activate
pm2 start .venv/bin/gunicorn --name proconnectBackend --cwd /path/to/ProConnect_final-main/ProConnect-Backend -- -w 4 -b 127.0.0.1:3036 app:app
pm2 save
pm2 status
```

If you prefer to use Flask directly for testing, you can run:

```bash
cd /path/to/ProConnect_final-main/ProConnect-Backend
source .venv/bin/activate
PORT=3036 HOST=0.0.0.0 python app.py
```

Gunicorn is better for production.

## 12. Reload and verify

```bash
pm2 restart proconnectFrontend --update-env
pm2 restart proconnectBackend --update-env
sudo nginx -t
sudo systemctl reload nginx
pm2 status
```

Check these URLs after deployment:

- `https://your-domain/proconnect`
- `https://your-domain/proconnect/student/login`
- `https://your-domain/proconnect/faculty/login`
- `https://your-domain/proconnectBackend/api/health`

## 13. Files changed in this workspace

These are the project changes that were made here:

- [server.js](server.js) was updated so unknown routes return `dist/index.html` using a regex fallback. This fixes deep links like `/proconnect/student/login` and `/proconnect/faculty/login`.
- [ProConnect-Backend/config.py](ProConnect-Backend/config.py) was updated to load environment variables from `ProConnect-Backend/.env` first, then fall back to the current working directory.
- [ProConnect-Backend/.env](ProConnect-Backend/.env) was created to hold backend environment variables, including SMTP credentials and MongoDB connection settings.
- [public/_redirects](public/_redirects) was created for SPA fallback hosting platforms such as Netlify.

## 14. Commands that were run here while fixing the project

These commands were used in this workspace during the fix:

```bash
pm2 list
pm2 logs proconnectFrontend --lines 40 --nostream
node --check server.js
pm2 restart proconnectFrontend --update-env
pm2 restart proconnectBackend --update-env
```

I also ran a short Python environment check inside `ProConnect-Backend` to confirm the SMTP variables were loaded from `.env`.

## 15. Notes and gotchas

- The frontend base path is already set to `/proconnect/` in `vite.config.ts`.
- The frontend API base URL is `/proconnectBackend/api`, so nginx must proxy that prefix to the backend process.
- The backend mail sender reads `SENDER_EMAIL` and `SENDER_PASSWORD`. Without those values, forgot-password will return `Email credentials are not configured`.
- If the server uses a different domain, update nginx `server_name` and SSL certificate paths.
- If you deploy behind Netlify instead of nginx, keep `public/_redirects` in the build output.
