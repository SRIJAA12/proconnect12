#!/bin/bash
# ProConnect Server Deployment Commands
# ======================================
# Run these commands on your college server in order

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - CHANGE THESE
DOMAIN="your-college-domain.com"
MONGODB_URI="mongodb://localhost:27017/proconnect"
SENDER_EMAIL="your-email@gmail.com"
SENDER_PASSWORD="your-app-password"
JWT_SECRET="generate-random-secret-change-this"
SECRET_KEY="generate-random-key-change-this"

echo -e "${YELLOW}ProConnect Server Deployment${NC}"
echo "=============================="
echo ""

# Step 1: Navigate to project
echo -e "${YELLOW}Step 1: Navigate to project directory${NC}"
cd /path/to/ProConnect_final-main
echo -e "${GREEN}✓ In project directory${NC}"
echo ""

# Step 2: Frontend dependencies
echo -e "${YELLOW}Step 2: Install frontend dependencies${NC}"
npm install
echo -e "${GREEN}✓ Node dependencies installed${NC}"
echo ""

# Step 3: Frontend build
echo -e "${YELLOW}Step 3: Build frontend${NC}"
npm run build
if [ -d "dist" ]; then
    echo -e "${GREEN}✓ Frontend built to dist/ folder${NC}"
else
    echo -e "${RED}✗ Build failed - dist/ folder not created${NC}"
    exit 1
fi
echo ""

# Step 4: Backend .env file
echo -e "${YELLOW}Step 4: Create backend .env file${NC}"
cat > ProConnect-Backend/.env << EOF
# Flask Configuration
SECRET_KEY=${SECRET_KEY}
FLASK_ENV=production
FLASK_DEBUG=False
JWT_EXPIRATION_HOURS=24

# JWT Configuration
JWT_SECRET=${JWT_SECRET}

# MongoDB Configuration
MONGODB_URI=${MONGODB_URI}
DB_NAME=proconnect

# Server Configuration
HOST=0.0.0.0
PORT=3036

# Email Configuration
SENDER_EMAIL=${SENDER_EMAIL}
SENDER_PASSWORD=${SENDER_PASSWORD}
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EOF
echo -e "${GREEN}✓ .env file created${NC}"
echo "   Edit with correct values: nano ProConnect-Backend/.env"
echo ""

# Step 5: Python virtual environment
echo -e "${YELLOW}Step 5: Set up Python virtual environment${NC}"
cd ProConnect-Backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..
echo -e "${GREEN}✓ Python environment ready${NC}"
echo ""

# Step 6: Install PM2
echo -e "${YELLOW}Step 6: Install PM2 (Process Manager)${NC}"
sudo npm install -g pm2
pm2 startup
pm2 save
echo -e "${GREEN}✓ PM2 installed${NC}"
echo ""

# Step 7: Start frontend
echo -e "${YELLOW}Step 7: Start frontend with PM2${NC}"
pm2 start server.js --name proconnectFrontend
echo -e "${GREEN}✓ Frontend started${NC}"
echo ""

# Step 8: Start backend
echo -e "${YELLOW}Step 8: Start backend with PM2${NC}"
cd ProConnect-Backend
source .venv/bin/activate
pm2 start .venv/bin/gunicorn --name proconnectBackend \
    --cwd "$(pwd)" -- -w 4 -b 127.0.0.1:3036 app:app
deactivate
cd ..
echo -e "${GREEN}✓ Backend started${NC}"
echo ""

# Step 9: Verify processes
echo -e "${YELLOW}Step 9: Verify processes are running${NC}"
pm2 status
echo ""

# Step 10: Test endpoints
echo -e "${YELLOW}Step 10: Test endpoints${NC}"
echo "Testing frontend on localhost:3035..."
curl -s http://localhost:3035/ > /dev/null && echo -e "${GREEN}✓ Frontend responding${NC}" || echo -e "${RED}✗ Frontend not responding${NC}"

echo "Testing backend health endpoint..."
curl -s http://localhost:3036/api/health | grep -q "healthy" && echo -e "${GREEN}✓ Backend responding${NC}" || echo -e "${RED}✗ Backend not responding${NC}"
echo ""

# Step 11: Configure Nginx
echo -e "${YELLOW}Step 11: Configure Nginx${NC}"
echo "Create/update nginx config at /etc/nginx/sites-available/default:"
echo ""
cat << 'NGINX'
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location /proconnect/ {
        proxy_pass http://127.0.0.1:3035/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend
    location /proconnectBackend/ {
        proxy_pass http://127.0.0.1:3036/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Root redirect
    location / {
        return 301 /proconnect/;
    }
}
NGINX
echo ""
echo -e "${YELLOW}After editing nginx config, run:${NC}"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
echo ""

# Step 12: Summary
echo -e "${YELLOW}Deployment Summary${NC}"
echo "==================="
echo "Frontend URL: http://${DOMAIN}/proconnect/faculty/login"
echo "Backend Health: http://${DOMAIN}/proconnectBackend/api/health"
echo ""
echo "View logs:"
echo "  pm2 logs proconnectFrontend --lines 50"
echo "  pm2 logs proconnectBackend --lines 50"
echo ""
echo -e "${GREEN}Deployment commands complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update DOMAIN, MONGODB_URI, and email credentials above"
echo "2. Update Nginx config with your domain"
echo "3. Test in browser: http://your-domain/proconnect/faculty/login"
