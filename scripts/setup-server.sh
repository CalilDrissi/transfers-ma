#!/bin/bash
set -e

APP_DIR="/opt/transfers"
DOMAIN="backoffice.transfers.ma"
EMAIL="admin@transfers.ma"

echo "=== Initial Server Setup ==="

# Create app directory
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Clone repository (if not exists)
if [ ! -d "$APP_DIR/.git" ]; then
    echo "Cloning repository..."
    git clone git@github.com:CalilDrissi/transfers-ma.git $APP_DIR
fi

cd $APP_DIR

# Create .env file if not exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
DB_NAME=transfers_db
DB_USER=transfers_user
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
SECRET_KEY=$(openssl rand -base64 50 | tr -d '/+=' | head -c 50)
EOF
    echo ".env file created. Please update with your settings."
fi

# Create certbot directories
mkdir -p certbot/conf certbot/www

# Use initial nginx config (without SSL)
cp nginx/conf.d/app.conf.initial nginx/conf.d/app.conf

# Start services
echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d db redis
sleep 10

docker compose -f docker-compose.prod.yml up -d web celery celery-beat nginx

# Run migrations
echo "Running migrations..."
docker compose -f docker-compose.prod.yml exec -T web python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
docker compose -f docker-compose.prod.yml exec -T web python manage.py collectstatic --noinput

echo ""
echo "=== Initial setup complete ==="
echo ""
echo "Next steps:"
echo "1. Point DNS A record for $DOMAIN to this server's IP"
echo "2. Wait for DNS propagation"
echo "3. Run: sudo certbot certonly --webroot -w /opt/transfers/certbot/www -d $DOMAIN --email $EMAIL --agree-tos --non-interactive"
echo "4. Copy nginx/conf.d/app.conf (SSL version) back and restart nginx"
echo "5. docker compose -f docker-compose.prod.yml restart nginx"
