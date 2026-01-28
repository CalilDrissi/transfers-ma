FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    gettext \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy project
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/staticfiles /app/media

# Collect static files (skip for now, run at container startup)
# RUN python manage.py collectstatic --noinput --settings=config.settings.production || true

# Cloud Run uses PORT environment variable
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 60 config.wsgi:application
