import os
import redis
from django.conf import settings
from django.db import connection
from django.core.cache import cache
from plexus.models import Thought, Input, Action

def get_system_stats():
    """
    Gather stats for DB, Redis, and AI.
    """
    return {
        "db": _get_db_stats(),
        "redis": _get_redis_stats(),
        "usage": _get_usage_stats(),
    }

def _get_db_stats():
    db_name = settings.DATABASES["default"]["NAME"]
    stats = {"name": os.path.basename(db_name), "size_kb": 0, "status": "Online"}
    
    try:
        if os.path.exists(db_name):
            stats["size_kb"] = round(os.path.getsize(db_name) / 1024, 2)
        
        # Simple query to check connectivity
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        stats["status"] = f"Error: {str(e)[:30]}"
    
    return stats

def _get_redis_stats():
    """
    Check Valkey/Redis connection.
    """
    url = getattr(settings, "REDIS_URL", None)

    stats = {"name": "Valkey", "status": "Offline", "memory_human": "N/A", "keys": 0, "error": None, "url": url}

    if not url:
        stats["status"] = "Not Configured"
        return {"primary": stats}

    try:
        client = redis.from_url(url, socket_connect_timeout=2)
        info = client.info()
        stats["status"] = "Online"
        stats["memory_human"] = info.get("used_memory_human", "0B")
        stats["keys"] = client.dbsize()
    except Exception as e:
        stats["status"] = "Offline"
        stats["error"] = str(e)

    return {"primary": stats}

def _get_usage_stats():
    """
    Get application-level usage stats.
    """
    return {
        "total_inputs": Input.objects.count(),
        "total_thoughts": Thought.objects.count(),
        "total_actions": Action.objects.count(),
        "model_distribution": _get_model_distribution(),
    }

def _get_model_distribution():
    from django.db.models import Count
    dist = Thought.objects.values("ai_model").annotate(count=Count("id")).order_by("-count")
    
    # Aggregate into provider buckets
    providers = {"gemini": 0, "openai": 0, "anthropic": 0, "other": 0}
    for item in dist:
        model = (item["ai_model"] or "").lower()
        if "gemini" in model:
            providers["gemini"] += item["count"]
        elif "gpt" in model:
            providers["openai"] += item["count"]
        elif "claude" in model:
            providers["anthropic"] += item["count"]
        else:
            providers["other"] += item["count"]
            
    return providers
