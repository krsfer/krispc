# KrisPC MCP Server - Installation & Usage Guide

## Overview

The **KrisPC MCP Server** exposes KrisPC's IT services data to AI assistants through the Model Context Protocol (MCP). This allows AI tools like Claude Desktop, ChatGPT, and other MCP-compatible clients to:

- Query repair services and pricing
- Check service locations
- Search supported brands
- Process caregiver schedule PDFs (pdf2cal integration)

---

## 🚀 Your Live API

Your API is already deployed and accessible at:

- **Base URL**: https://krispc.fly.dev/api/krispc/
- **Swagger UI**: https://krispc.fly.dev/api/krispc/schema/swagger-ui/
- **ReDoc**: https://krispc.fly.dev/api/krispc/schema/redoc/
- **OpenAPI Schema**: https://krispc.fly.dev/api/krispc/schema/

---

## 📦 Installation

### Prerequisites

- Python 3.10+
- pipenv (or pip)
- MCP-compatible client (e.g., Claude Desktop)

### Install Dependencies

```bash
# Install MCP SDK
pipenv install mcp

# Or with pip
pip install mcp
```

### Verify Installation

```bash
# Test the MCP server
python mcp_server.py
```

The server should start without errors (it waits for input via stdio).

---

## 🔧 Configuration

### For Claude Desktop

Add the MCP server to Claude Desktop's configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "krispc": {
      "command": "python",
      "args": ["/absolute/path/to/your/project/mcp_server.py"],
      "env": {
        "DJANGO_SETTINGS_MODULE": "_main.settings",
        "PYTHONPATH": "/absolute/path/to/your/project"
      }
    }
  }
}
```

**Replace** `/absolute/path/to/your/project` with your actual project path, for example:
```json
"/Users/chris/dev/src/py/krispcBase/mcp_server.py"
```

### For Other MCP Clients

Consult your MCP client's documentation for how to add custom servers. Most follow a similar pattern:

1. Specify the command to run (`python mcp_server.py`)
2. Set environment variables (Django settings)
3. Restart the client

---

## 🧪 Testing the MCP Server

### Test 1: List Resources

Resources are data sources that can be read by AI assistants.

```python
# In a Python shell
import asyncio
from mcp_server import list_resources

async def test():
    resources = await list_resources()
    for r in resources:
        print(f"- {r.name}: {r.description}")

asyncio.run(test())
```

**Expected Output:**
```
- Repair Services: Complete list of phone and computer repair services...
- Supported Brands: List of phone and computer brands...
- Service Locations: Cities where krispc provides repair services
```

### Test 2: List Tools

Tools are functions that AI assistants can call with parameters.

```python
from mcp_server import list_tools

async def test():
    tools = await list_tools()
    for t in tools:
        print(f"- {t.name}: {t.description}")

asyncio.run(test())
```

**Expected Output:**
```
- get_repair_pricing: Get pricing information for phone or computer repairs...
- list_repair_services: List all available repair services...
- get_service_locations: Get the list of cities/locations...
- process_caregiver_pdf: Process a PDF file containing caregiver schedules...
```

### Test 3: Call a Tool

```python
from mcp_server import call_tool

async def test():
    # Test getting service locations
    result = await call_tool("get_service_locations", {})
    print(result[0].text)

asyncio.run(test())
```

---

## 📚 Available MCP Resources

### 1. **Repair Services** (`krispc://services/list`)
Complete list of IT services offered by KrisPC.

**Example Content:**
```json
[
  {
    "Prd_Name": "Réparation téléphone",
    "Prd_Desc": "Réparation de tous types de smartphones",
    "Prd_Icon": "bi-phone",
    "Prd_More": "Écran, batterie, port de charge..."
  }
]
```

### 2. **Supported Brands** (`krispc://brands/list`)
Brands serviced by KrisPC.

**Example Content:**
```json
[
  {
    "Marque_Title": "Apple",
    "Marque_Icon": "fab fa-apple"
  },
  {
    "Marque_Title": "Samsung",
    "Marque_Icon": "bi-samsung"
  }
]
```

### 3. **Service Locations** (`krispc://locations/list`)
Cities where KrisPC provides services.

**Example Content:**
```json
["Paris", "Lyon", "Marseille", "Toulouse"]
```

---

## 🛠️ Available MCP Tools

### 1. **get_repair_pricing**

Get pricing for specific repairs.

**Parameters:**
- `service_type` (required): Type of service (e.g., "phone_repair", "computer_repair")
- `repair_detail` (optional): Specific component (e.g., "screen", "battery")
- `brand` (optional): Device brand (e.g., "iPhone", "Samsung")
- `model` (optional): Device model (e.g., "iPhone 14 Pro")

**Example Usage in Claude:**
```
"How much does it cost to replace an iPhone 14 screen?"
```

### 2. **list_repair_services**

List all available services, optionally filtered by category.

**Parameters:**
- `category` (optional): Filter keyword (e.g., "phone", "computer")

**Example Usage:**
```
"What repair services does KrisPC offer for computers?"
```

### 3. **get_service_locations**

Get cities where KrisPC provides services.

**Parameters:** None

**Example Usage:**
```
"Where does KrisPC provide repair services?"
```

### 4. **process_caregiver_pdf**

Process a caregiver schedule PDF and extract calendar events.

**Parameters:**
- `pdf_path` (required): Path to PDF file
- `extract_calendar_name` (optional, default: true): Extract calendar name from filename

**Example Usage:**
```
"Process the PDF at /path/to/schedule.pdf and extract caregiver appointments"
```

---

## 🔍 Testing with Claude Desktop

After adding the server configuration and restarting Claude Desktop:

1. **Test Resource Access:**
   ```
   "Can you read the krispc repair services resource?"
   ```

2. **Test Tool Calls:**
   ```
   "List all repair services that KrisPC offers"
   ```

3. **Test Search:**
   ```
   "Show me KrisPC services related to data recovery"
   ```

4. **Test Location Check:**
   ```
   "Does KrisPC provide service in Lyon?"
   ```

---

## 🐛 Troubleshooting

### Issue: Server doesn't start

**Check:**
```bash
# Verify Django setup works
python manage.py check

# Test imports
python -c "import mcp.server; print('MCP installed')"
```

### Issue: Claude Desktop doesn't see the server

**Check:**
1. Configuration file path is correct
2. Absolute paths are used (not relative)
3. Claude Desktop was restarted after config change
4. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

### Issue: Tools fail with "module not found"

**Fix:**
```json
{
  "mcpServers": {
    "krispc": {
      "command": "python",
      "args": ["/absolute/path/to/mcp_server.py"],
      "env": {
        "DJANGO_SETTINGS_MODULE": "_main.settings",
        "PYTHONPATH": "/absolute/path/to/project/root"
      }
    }
  }
}
```

### Issue: PDF processing fails

**Check:**
- PDF file exists at the specified path
- PDF is in the expected format (caregiver schedule)
- p2c module is properly installed

---

## 📦 Publishing Your MCP Server

### Option 1: PyPI Package (Recommended)

Create a standalone package that users can install:

```bash
pip install krispc-mcp
```

See detailed instructions in `PUBLISHING.md` under "Option 2: Creating an MCP Server".

### Option 2: GitHub Repository

Share your MCP server via GitHub:

1. Create a repository: `krispc-mcp-server`
2. Include installation instructions
3. Users clone and configure

**Example README:**
```markdown
# KrisPC MCP Server

Install:
```bash
git clone https://github.com/yourusername/krispc-mcp-server.git
cd krispc-mcp-server
pip install -r requirements.txt
```

Configure Claude Desktop with the path to `mcp_server.py`.
```

### Option 3: Docker Container

Package as a Docker container for easy deployment:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "mcp_server.py"]
```

---

## 🌐 Using with Your Live API

Your MCP server currently uses Django models directly. To use your live API instead:

### Create API-Based MCP Server

Create`mcp_server_api.py`:

```python
"""
MCP Server that connects to live KrisPC API
"""
import requests
from mcp.server import Server
import mcp.types as types
import mcp.server.stdio

API_BASE = "https://krispc.fly.dev/api/krispc"
server = Server("krispc-api")

@server.read_resource()
async def read_resource(uri: str) -> str:
    if uri == "krispc://services/list":
        r = requests.get(f"{API_BASE}/products/")
        return r.text
    # ... etc
```

This approach:
- ✅ Works without Django setup
- ✅ Can be distributed as standalone package
- ✅ Uses your live, deployed API
- ✅ Easier for users to install

---

## 📊 Metrics & Monitoring

Track MCP server usage:

- Log tool calls
- Monitor resource access
- Track error rates

```python
# Add to mcp_server.py
import logging

logger = logging.getLogger(__name__)

@mcp_server.call_tool()
async def call_tool(name: str, arguments: Any):
    logger.info(f"Tool called: {name} with args: {arguments}")
    # ... rest of implementation
```

---

## 🎯 Next Steps

1. **Test Locally**
   - Configure Claude Desktop
   - Test each tool and resource
   - Verify error handling

2. **Create Standalone Package** (Optional)
   - Package for PyPI
   - Add installation docs
   - Distribute to users

3. **Monitor Usage**
   - Add logging
   - Track popular tools
   - Gather feedback

4. **Enhance Features**
   - Add more tools
   - Improve search capabilities
   - Add authentication for sensitive operations

---

## 📞 Support

- **API Documentation**: https://krispc.fly.dev/api/krispc/schema/swagger-ui/
- **GitHub Issues**: [Your repo URL]
- **Contact**: [Your contact info]

---

**Last Updated:** 2026-01-11  
**MCP Server Version:** 1.0.0  
**API Version:** Live at krispc.fly.dev
