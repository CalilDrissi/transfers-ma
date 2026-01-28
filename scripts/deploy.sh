#!/bin/bash
set -e

APP_DIR="/opt/transfers"
cd $APP_DIR

echo "Pulling latest changes..."
git pull origin main

echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

echo "Running migrations..."
docker compose -f docker-compose.prod.yml exec -T web python manage.py migrate --noinput

echo "Collecting static files..."
docker compose -f docker-compose.prod.yml exec -T web python manage.py collectstatic --noinput

echo "Cleaning up old images..."
docker image prune -f

echo "Deployment complete!"
