import requests
from django.http import HttpResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def proxy_to_emoty(request, path=''):
    # Handle optional path group from regex
    if path is None:
        path = ''
        
    # Construct target URL carefully to avoid redirect loops
    # If path already starts with 'emo/', assume it's fully qualified (e.g. asset request on subdomain)
    if path == 'emo' or path.startswith('emo/'):
        target_url = f'http://localhost:3000/{path}'
    elif path:
        target_url = f'http://localhost:3000/emo/{path}'
    else:
        target_url = 'http://localhost:3000/emo'
        
    if request.META.get('QUERY_STRING'):
        target_url += f'?{request.META.get('QUERY_STRING')}'
    
    headers = {}
    for key, value in request.headers.items():
        if key.lower() not in ['host', 'content-length']:
            headers[key] = value
            
    # Add forwarding headers for NextAuth
    headers['X-Forwarded-Host'] = request.get_host()
    headers['X-Forwarded-Proto'] = request.scheme
    
    try:
        response = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request.body,
            cookies=request.COOKIES,
            stream=True,
            allow_redirects=False 
        )
        
        django_response = StreamingHttpResponse(
            response.iter_content(chunk_size=4096),
            status=response.status_code,
            content_type=response.headers.get('Content-Type')
        )
        
        # Hop-by-hop headers to exclude
        hop_by_hop = [
            'connection', 'keep-alive', 'proxy-authenticate', 
            'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 
            'upgrade', 'content-encoding', 'content-length'
        ]
        
        for key, value in response.headers.items():
            if key.lower() not in hop_by_hop:
                django_response[key] = value
                
        return django_response
        
    except requests.exceptions.ConnectionError:
        return HttpResponse("Emoty service is not running. Please start it on port 3000.", status=503)
