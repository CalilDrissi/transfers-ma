from .base import *
from decouple import config

DEBUG = False

SITE_URL = 'https://staging.api.transfers.ma'

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='staging.api.transfers.ma',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='transfers_staging'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        'CONN_MAX_AGE': 60,
    }
}

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'SAMEORIGIN'
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

CSRF_TRUSTED_ORIGINS = [
    'https://staging.api.transfers.ma',
]

CORS_ALLOW_ALL_ORIGINS = False

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django-staging.log',
        },
    },
    'root': {'handlers': ['console', 'file'], 'level': 'INFO'},
}
