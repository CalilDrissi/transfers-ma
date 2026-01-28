from .base import *
from decouple import config

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Use SQLite for local development without Docker
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Debug Toolbar
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
INTERNAL_IPS = ['127.0.0.1', 'localhost']

# Email - use console backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# CORS - allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Disable WhiteNoise in development
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Use simple in-memory cache instead of Redis
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Use database sessions instead of cache-based
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
