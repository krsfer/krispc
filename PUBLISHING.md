# Publishing Guide - API & MCP Functionalities

## Overview

This guide covers your **already deployed REST API** and how to publish your **MCP (Model Context Protocol) server** for AI assistants.

**Current Status:**
- ✅ **REST API**: Live at https://krispc.fly.dev/api/krispc/
- ✅ **API Documentation**: Swagger UI, ReDoc, and OpenAPI schema available
- ✅ **MCP Server**: Implemented and tested (3/3 tests passing)
- ⏳ **MCP Distribution**: Ready to publish (see options below)

---

## 🌐 Your Live REST API (Already Published!)

### Current Deployment

Your API is **already deployed and accessible** at:

- **Base URL**: https://krispc.fly.dev/api/krispc/
- **Swagger UI** (Interactive): https://krispc.fly.dev/api/krispc/schema/swagger-ui/
- **ReDoc** (Documentation): https://krispc.fly.dev/api/krispc/schema/redoc/
- **OpenAPI Schema** (JSON): https://krispc.fly.dev/api/krispc/schema/

### Available API Endpoints

Your API exposes these endpoints:

#### **A. Deploy to Fly.io (Recommended)**

```bash
# You have fly.toml configured
fly deploy

# API will be available at: https://krispc.fly.dev/api/
```

Your API endpoints will be accessible at:
- `https://krispc.fly.dev/api/krispc/services/`
- `https://krispc.fly.dev/api/krispc/contacts/`
- `https://krispc.fly.dev/api/krispc/marques/`
- `https://krispc.fly.dev/api/krispc/villes/`
- `https://krispc.fly.dev/api/krispc/colophon/`

#### **B. Self-Host (VPS/Cloud)**

Follow your comprehensive `DEPLOYMENT.md` guide to deploy to:
- DigitalOcean
- AWS EC2
- Linode
- Any VPS with Nginx/Gunicorn

### 1.2 Document Your API

Your API is already documented with OpenAPI/Swagger schema!

#### **Add API Documentation UI**

Install and configure DRF Spectacular (already partially integrated):

```bash
# Add to Pipfile
pipenv install drf-spectacular
```

Update `_main/urls.py`:

```python
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Your API endpoints
    path('api/', include('krispc.api_urls')),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
```

After deployment, users can access:
- **OpenAPI Schema**: `https://your-domain.com/api/schema/`
- **Interactive Swagger UI**: `https://your-domain.com/api/docs/`
- **ReDoc UI**: `https://your-domain.com/api/redoc/`

### 1.3 Share Your API

Create an API landing page or update README with:

```markdown
## KrisPC API

Public REST API for accessing KrisPC services and data.

### Base URL
`https://api.krispc.com/api/krispc/`

### Endpoints

#### Services
`GET /services/` - List all services

#### Brands
`GET /marques/` - List supported brands

#### Coverage
`GET /villes/` - List cities covered

#### Technologies
`GET /colophon/` - List technologies used

#### Contact
`POST /contacts/` - Submit contact form

### Documentation
- Swagger UI: https://api.krispc.com/api/docs/
- ReDoc: https://api.krispc.com/api/redoc/
- OpenAPI Schema: https://api.krispc.com/api/schema/

### Rate Limits
- Read endpoints: 100 requests/hour
- Contact endpoint: 10 requests/hour

### Example Usage

**JavaScript/Fetch:**
\`\`\`javascript
fetch('https://api.krispc.com/api/krispc/services/')
  .then(res => res.json())
  .then(data => console.log(data));
\`\`\`

**Python:**
\`\`\`python
import requests
response = requests.get('https://api.krispc.com/api/krispc/services/')
data = response.json()
\`\`\`

**cURL:**
\`\`\`bash
curl https://api.krispc.com/api/krispc/services/
\`\`\`
```

---

## 🤖 Option 2: Creating an MCP Server

MCP (Model Context Protocol) allows AI assistants to access your data. Here's how to create an MCP server for your application.

### 2.1 Install MCP Python SDK

```bash
pipenv install mcp
```

### 2.2 Create MCP Server

Create `krispc/mcp_server.py`:

```python
"""
MCP Server for KrisPC API
Exposes KrisPC data to AI assistants via Model Context Protocol
"""

from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.server.stdio
import mcp.types as types
from . import lst_products, colophon, marques, lst_villes
import json

# Create MCP server instance
server = Server("krispc-mcp")

@server.list_resources()
async def handle_list_resources() -> list[types.Resource]:
    """
    List all available resources from KrisPC API
    """
    return [
        types.Resource(
            uri="krispc://services",
            name="KrisPC Services",
            description="List of IT services offered by KrisPC",
            mimeType="application/json",
        ),
        types.Resource(
            uri="krispc://brands",
            name="Supported Brands",
            description="List of computer brands serviced by KrisPC",
            mimeType="application/json",
        ),
        types.Resource(
            uri="krispc://cities",
            name="Service Coverage",
            description="List of cities where KrisPC provides services",
            mimeType="application/json",
        ),
        types.Resource(
            uri="krispc://technologies",
            name="Technology Stack",
            description="Technologies and tools used by KrisPC",
            mimeType="application/json",
        ),
    ]

@server.read_resource()
async def handle_read_resource(uri: str) -> str:
    """
    Read and return resource content
    """
    if uri == "krispc://services":
        return json.dumps(lst_products.data(), indent=2)
    elif uri == "krispc://brands":
        return json.dumps(marques.data(), indent=2)
    elif uri == "krispc://cities":
        return json.dumps(lst_villes.data(), indent=2)
    elif uri == "krispc://technologies":
        return json.dumps(colophon.data(), indent=2)
    else:
        raise ValueError(f"Unknown resource: {uri}")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """
    List available tools/functions
    """
    return [
        types.Tool(
            name="search_services",
            description="Search KrisPC services by keyword",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search term to find services",
                    }
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="check_coverage",
            description="Check if KrisPC provides service in a specific city",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "City name to check",
                    }
                },
                "required": ["city"],
            },
        ),
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """
    Execute tool functions
    """
    if name == "search_services":
        query = arguments.get("query", "").lower()
        services = lst_products.data()
        results = [
            s for s in services
            if query in s.get("Prd_Name", "").lower()
            or query in s.get("Prd_Desc", "").lower()
        ]
        return [
            types.TextContent(
                type="text",
                text=json.dumps(results, indent=2),
            )
        ]
    
    elif name == "check_coverage":
        city = arguments.get("city", "").lower()
        cities = lst_villes.data()
        available = any(city in c.lower() for c in cities)
        return [
            types.TextContent(
                type="text",
                text=f"Service {'available' if available else 'not available'} in {city}",
            )
        ]
    
    else:
        raise ValueError(f"Unknown tool: {name}")

async def main():
    """Run the MCP server"""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="krispc-mcp",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

### 2.3 Create MCP Server Entry Point

Create `run_mcp_server.py` in project root:

```python
#!/usr/bin/env python
"""
Entry point for KrisPC MCP Server
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', '_main.settings')
django.setup()

# Run MCP server
from krispc.mcp_server import main
import asyncio

if __name__ == "__main__":
    asyncio.run(main())
```

Make it executable:

```bash
chmod +x run_mcp_server.py
```

### 2.4 Configure MCP Server for Claude Desktop

Create `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "krispc": {
      "command": "python",
      "args": ["/path/to/your/project/run_mcp_server.py"],
      "env": {
        "DJANGO_SETTINGS_MODULE": "_main.settings"
      }
    }
  }
}
```

Users would add this to their Claude Desktop configuration at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 2.5 Publish MCP Server to PyPI

To make your MCP server easily installable:

#### **Create package structure:**

```
krispc-mcp/
├── README.md
├── LICENSE
├── pyproject.toml
├── setup.py
└── krispc_mcp/
    ├── __init__.py
    └── server.py
```

#### **Create `pyproject.toml`:**

```toml
[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "krispc-mcp"
version = "1.0.0"
description = "MCP server for KrisPC IT services"
readme = "README.md"
requires-python = ">=3.10"
license = {text = "MIT"}
authors = [
    {name = "Your Name", email = "your@email.com"}
]
dependencies = [
    "mcp>=0.1.0",
]

[project.scripts]
krispc-mcp = "krispc_mcp.server:main"

[project.urls]
Homepage = "https://github.com/yourusername/krispc-mcp"
Documentation = "https://github.com/yourusername/krispc-mcp#readme"
```

#### **Build and publish:**

```bash
# Install build tools
pip install build twine

# Build package
python -m build

# Upload to PyPI
twine upload dist/*
```

Then users can install with:

```bash
pip install krispc-mcp
```

And configure Claude Desktop:

```json
{
  "mcpServers": {
    "krispc": {
      "command": "krispc-mcp"
    }
  }
}
```

---

## 📦 Option 3: Publishing as Python Package (API Client)

Create a Python client library for your API.

### 3.1 Create Client Library

Create `krispc_client/client.py`:

```python
"""
Official Python client for KrisPC API
"""

import requests
from typing import List, Dict, Optional

class KrisPCClient:
    """Client for accessing KrisPC API"""
    
    def __init__(self, base_url: str = "https://api.krispc.com/api/krispc/"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'KrisPC-Python-Client/1.0.0'
        })
    
    def get_services(self) -> List[Dict]:
        """Get all services"""
        response = self.session.get(f"{self.base_url}/services/")
        response.raise_for_status()
        return response.json()
    
    def get_brands(self) -> List[Dict]:
        """Get supported brands"""
        response = self.session.get(f"{self.base_url}/marques/")
        response.raise_for_status()
        return response.json()
    
    def get_cities(self) -> List[str]:
        """Get service coverage cities"""
        response = self.session.get(f"{self.base_url}/villes/")
        response.raise_for_status()
        return response.json()
    
    def get_technologies(self) -> List[Dict]:
        """Get technology stack"""
        response = self.session.get(f"{self.base_url}/colophon/")
        response.raise_for_status()
        return response.json()
    
    def submit_contact(
        self,
        firstname: str,
        surname: str,
        email: str,
        message: str
    ) -> Dict:
        """Submit contact form"""
        data = {
            'firstname': firstname,
            'surname': surname,
            'from_email': email,
            'message': message
        }
        response = self.session.post(
            f"{self.base_url}/contacts/",
            json=data
        )
        response.raise_for_status()
        return response.json()
```

### 3.2 Publish to PyPI

Users can then use your API easily:

```python
from krispc_client import KrisPCClient

client = KrisPCClient()
products = client.get_products()
print(products)
```

---

## 🌍 Option 4: Publishing API to RapidAPI/API Marketplaces

Make your API available on API marketplaces:

### RapidAPI Integration

1. **Sign up** at https://rapidapi.com/provider
2. **Add your API** with OpenAPI schema
3. **Set pricing tiers** (free, basic, pro)
4. **Monetize** your API

### Postman Public API Network

1. **Create collection** in Postman
2. **Add all endpoints** with examples
3. **Publish to network**
4. Users can discover and test your API

---

## 📋 Summary of Publishing Options

| Option | Best For | Setup Time | Effort |
|--------|----------|------------|--------|
| **Deploy REST API** | General web access | Quick | Low |
| **Create MCP Server** | AI assistant integration | Medium | Medium |
| **PyPI Package (Client)** | Python developers | Medium | Medium |
| **PyPI Package (MCP)** | MCP users | Medium | Medium |
| **API Marketplace** | Monetization | High | High |

---

## 🚀 Quick Start Recommendations

### For API Publishing (Immediate):
1. Deploy to Fly.io (5 minutes)
2. Add Swagger UI documentation (30 minutes)
3. Update README with API docs (15 minutes)
4. Share the API URL

### For MCP Integration (Best for AI):
1. Install MCP SDK: `pipenv install mcp`
2. Create `krispc/mcp_server.py` (1 hour)
3. Create `run_mcp_server.py` entry point (15 minutes)
4. Test with Claude Desktop (30 minutes)
5. Publish to PyPI (optional, 1 hour)

### For Maximum Reach:
1. Deploy REST API (web access)
2. Create MCP server (AI assistants)
3. Create Python client (developers)
4. Document everything
5. Share on GitHub

---

## 📚 Next Steps

**Choose your path:**

1. **Just want to share your API?**  
   → Deploy to Fly.io and add Swagger UI

2. **Want AI assistants to use your data?**  
   → Create MCP server

3. **Want developers to use your API easily?**  
   → Create Python client package

4. **Want to monetize?**  
   → List on RapidAPI

**Need help?** Let me know which option you'd like to implement, and I can help you set it up!

---

**Last Updated:** 2026-01-10  
**Version:** 1.0  
**Author:** Development Team
