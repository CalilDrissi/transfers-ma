#!/usr/bin/env bash
# Deploy to staging — run from your local machine or from the server.
# Usage: ./deploy-staging.sh
set -euo pipefail

STAGING_DIR=/opt/transfers.ma-staging
VENV=$STAGING_DIR/venv
SETTINGS=config.settings.staging

echo "==> Pulling latest main..."
cd $STAGING_DIR
git pull origin main

echo "==> Installing dependencies..."
$VENV/bin/pip install -q -r requirements.txt

echo "==> Running migrations..."
DJANGO_SETTINGS_MODULE=$SETTINGS $VENV/bin/python manage.py migrate --noinput

echo "==> Collecting static files..."
DJANGO_SETTINGS_MODULE=$SETTINGS $VENV/bin/python manage.py collectstatic --noinput

echo "==> Restarting services..."
systemctl restart transfers-staging.service
systemctl restart celery-staging.service 2>/dev/null || true

echo "==> Done. Staging live at https://staging.api.transfers.ma"
