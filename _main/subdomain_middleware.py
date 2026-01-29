class SubdomainRoutingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host().split(':')[0]
        # Assuming domain structure like subdomain.domain.tld or just domain.tld
        parts = host.split('.')
        
        # Simple extraction strategy: 
        # If parts > 2 (e.g., hub.krispc.fr), take the first part.
        # If localhost, it might be hub.localhost -> parts[0]
        
        if len(parts) >= 3 or (len(parts) == 2 and 'localhost' in host):
            subdomain = parts[0]
        else:
            subdomain = None

        if subdomain:
            if subdomain == 'hub':
                request.urlconf = '_main.subdomains.hub'
            elif subdomain == 'com':
                request.urlconf = '_main.subdomains.com'
            elif subdomain == 'p2c':
                request.urlconf = '_main.subdomains.p2c'
            elif subdomain == 'plexus':
                request.urlconf = '_main.subdomains.plexus'
            elif subdomain == 'emo':
                request.urlconf = '_main.subdomains.emo'
            # 'www' falls through to default ROOT_URLCONF
        
        return self.get_response(request)
