from django.http import HttpResponse
from django.test import RequestFactory, override_settings

from _main.subdomain_middleware import SubdomainRoutingMiddleware


@override_settings(ALLOWED_HOSTS=["*"])
def test_routes_sas_subdomain_to_sas_urlconf():
    factory = RequestFactory()
    middleware = SubdomainRoutingMiddleware(lambda request: HttpResponse("ok"))

    request = factory.get("/", HTTP_HOST="sas.krispc.fr")
    response = middleware(request)

    assert response.status_code == 200
    assert request.urlconf == "_main.subdomains.sas"


@override_settings(ALLOWED_HOSTS=["*"])
def test_cross_domain_redirect_supports_sas_shadow_path():
    factory = RequestFactory()
    middleware = SubdomainRoutingMiddleware(lambda request: HttpResponse("ok"))

    request = factory.get("/sas/", HTTP_HOST="hub.krispc.fr")
    response = middleware(request)

    assert response.status_code == 301
    assert response["Location"] == "http://sas.krispc.fr/"
