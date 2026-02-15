from rest_framework.throttling import SimpleRateThrottle


class APIKeyRateThrottle(SimpleRateThrottle):
    """Dynamic rate throttle based on API key tier or IP for anonymous users."""

    scope = 'anon'

    def get_cache_key(self, request, view):
        api_key = getattr(request, 'api_key', None)
        if api_key:
            return f'throttle_apikey_{api_key.pk}'
        # Fall back to IP-based throttling
        ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}

    def get_rate(self):
        request = self.request if hasattr(self, 'request') else None
        if request:
            api_key = getattr(request, 'api_key', None)
            if api_key:
                return f'{api_key.rate_limit}/min'
        return '30/min'

    def allow_request(self, request, view):
        # Store request so get_rate() can access it
        self.request = request
        # Recalculate rate for this request
        self.rate = self.get_rate()
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)
