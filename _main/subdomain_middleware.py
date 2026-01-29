import re
from django.http import HttpResponsePermanentRedirect

class SubdomainRoutingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.app_domains = {
            'hub': 'hub',
            'krispc': 'com', # App 'krispc' -> Subdomain 'com'
            'p2c': 'p2c',
            'plexus': 'plexus',
            'emo': 'emo'
        }

    def __call__(self, request):
        host = request.get_host().split(':')[0]
        port = request.get_host().split(':')[1] if ':' in request.get_host() else None
        
        parts = host.split('.')
        
        # Determine Base Domain (e.g. krispc.fr or localhost)
        # If localhost, parts=['hub', 'localhost'] -> base='localhost'
        # If krispc.fr, parts=['hub', 'krispc', 'fr'] -> base='krispc.fr'
        if 'localhost' in host:
             base_domain = "localhost"
        else:
             # Join all parts except the first one (subdomain)
             base_domain = ".".join(parts[1:])

        # Determine current subdomain
        if len(parts) >= 3 or (len(parts) == 2 and 'localhost' in host):
            current_subdomain = parts[0]
        else:
            current_subdomain = 'www' # or root fallback

        # 1. Switch URLConf
        if current_subdomain == 'hub':
            request.urlconf = '_main.subdomains.hub'
        elif current_subdomain == 'com':
            request.urlconf = '_main.subdomains.com'
        elif current_subdomain == 'p2c':
            request.urlconf = '_main.subdomains.p2c'
        elif current_subdomain == 'plexus':
            request.urlconf = '_main.subdomains.plexus'
        elif current_subdomain == 'emo':
            request.urlconf = '_main.subdomains.emo'
        
        # 2. Cross-Domain Redirect Logic
        # Detect if we are accessing a "Shadow App" path (e.g., /p2c/ on Hub subdomain)
        # Regex matches: /hub/, /en/hub/, /fr/p2c/, etc.
        path = request.path_info
        match = re.match(r'^/(?:[a-z]{2}/)?(hub|krispc|p2c|plexus)/', path)
        
        if match:
            target_app = match.group(1)
            target_subdomain = self.app_domains.get(target_app)
            
            # If we are targeting a different subdomain than the current one
            if target_subdomain and target_subdomain != current_subdomain:
                
                # Construct new host
                if port:
                    new_host = f"{target_subdomain}.{base_domain}:{port}"
                else:
                    new_host = f"{target_subdomain}.{base_domain}"
                
                # Strip the app prefix from the path to match the target's root-mounted URLConf
                # e.g. /fr/hub/dashboard -> /fr/dashboard
                new_path = path.replace(f"/{target_app}/", "/", 1)
                
                new_url = f"{request.scheme}://{new_host}{new_path}"
                if request.GET:
                    new_url += f"?{request.GET.urlencode()}"
                    
                return HttpResponsePermanentRedirect(new_url)

        return self.get_response(request)