from django.conf import settings
from django.urls import NoReverseMatch, reverse


def normalize_base_url(base_url: str) -> str:
    return base_url.rstrip("/")


def localhost_base_url(request, subdomain: str) -> str | None:
    if request is None:
        return None

    host = request.get_host()
    if not host:
        return None

    host_no_port = host
    port = None
    if ":" in host and not host.startswith("["):
        host_no_port, port = host.rsplit(":", 1)

    if host_no_port == "localhost" or host_no_port.endswith(".localhost"):
        scheme = "https" if request.is_secure() else "http"
        base_host = f"{subdomain}.localhost"
        if port:
            return f"{scheme}://{base_host}:{port}"
        return f"{scheme}://{base_host}"

    return None


def resolve_base_url(request, base_url: str, subdomain: str) -> str:
    localhost_url = localhost_base_url(request, subdomain)
    if localhost_url:
        return localhost_url
    return normalize_base_url(base_url)


def hub_urls(request):
    hub_base_url = resolve_base_url(request, settings.HUB_BASE_URL, "hub")
    krispc_base_url = resolve_base_url(request, settings.KRISPC_BASE_URL, "com")
    p2c_base_url = resolve_base_url(request, settings.P2C_BASE_URL, "p2c")
    plexus_base_url = resolve_base_url(request, settings.PLEXUS_BASE_URL, "plexus")
    emo_base_url = resolve_base_url(request, settings.EMO_BASE_URL, "emo")

    app_name = getattr(getattr(request, "resolver_match", None), "app_name", None)
    app_home_map = {
        "hub": "hub:index",
        "krispc": "krispc:index",
        "p2c": "p2c:home",
        "plexus": "plexus:index",
    }

    current_app_home_url = reverse("hub:index")
    if app_name in app_home_map:
        try:
            current_app_home_url = reverse(app_home_map[app_name])
        except NoReverseMatch:
            current_app_home_url = reverse("hub:index")

    return {
        "hub_base_url": hub_base_url,
        "krispc_base_url": krispc_base_url,
        "p2c_base_url": p2c_base_url,
        "plexus_base_url": plexus_base_url,
        "emo_base_url": emo_base_url,
        "current_app_home_url": current_app_home_url,
    }
