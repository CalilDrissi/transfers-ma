from .base import *
from decouple import config

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='transfers_db'),
        'USER': config('DB_USER', default='transfers_user'),
        'PASSWORD': config('DB_PASSWORD', default='transfers_password'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
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
