#!/bin/bash
set -e

echo "=== TeleFlow Enterprise Frontend & Nginx Setup ==="

# 1. Install Nginx only (Node.js is already installed via NodeSource)
apt update && apt install -y nginx

# 2. Build React Frontend
echo "Building React frontend..."
cd /var/www/Telegram_server/frontend

if command -v npm &> /dev/null; then
    echo "Using host npm..."
    npm install && npm run build
else
    echo "Using docker node to build..."
    docker run --rm -v /var/www/Telegram_server/frontend:/app -w /app node:20-alpine sh -c "npm install && npm run build"
fi

# 3. Configure Nginx
cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/Telegram_server/frontend/dist;
    index index.html;

    # Frontend SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy to Laravel (Port 8000)
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 100M;
}
EOF

# 4. Restart Nginx
systemctl restart nginx

echo ""
echo "=========================================================="
echo "🎉 Setup Complete! TeleFlow is live on Port 80!"
echo "Open your browser at: http://$(curl -s ifconfig.me || hostname -I | awk '{print $1}')"
echo "Login Email: admin@telegram.local"
echo "Login Password: Password123!"
echo "=========================================================="
