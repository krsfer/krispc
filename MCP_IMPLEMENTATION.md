# Model Context Protocol (MCP) Implementation for krispc

This document explains how to use the MCP server to expose krispc and pdf2cal services to AI assistants.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that enables AI assistants and applications to connect to external data sources and tools. With MCP, AI tools like Claude Desktop, ChatGPT, and others can:

1. **Discover** your services automatically
2. **Call** functions to get repair pricing, process PDFs, etc.
3. **Access** data sources like service catalogs and supported brands

## Services Exposed

### 1. krispc Repair Services

**Resources (Data Sources):**
- `krispc://services/list` - Complete repair service catalog
- `krispc://brands/list` - Supported phone/computer brands
- `krispc://locations/list` - Service coverage areas

**Tools (Callable Functions):**
- `get_repair_pricing` - Get cost estimates for repairs (screen, battery, etc.)
- `list_repair_services` - Browse all available services
- `get_service_locations` - Find where services are available

### 2. pdf2cal Caregiver Services

**Tools:**
- `process_caregiver_pdf` - Extract events from caregiver schedule PDFs

## Installation

### 1. Install MCP Python SDK

```bash
cd /Users/chris/dev/src/py/krispcBase
pipenv install mcp
```

### 2. Configure AI Assistant (Claude Desktop Example)

Edit your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the krispc server:

```json
{
  "mcpServers": {
    "krispc": {
      "command": "python",
      "args": [
        "/Users/chris/dev/src/py/krispcBase/mcp_server.py"
      ],
      "env": {
        "DJANGO_SETTINGS_MODULE": "_main.settings"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Restart Claude Desktop to load the MCP server. The server will now be available to Claude.

## Usage Examples

Once configured, you can ask Claude (or other AI assistants) questions like:

### Example 1: Get Repair Pricing

**User**: "How much does it cost to replace an iPhone 14 screen?"

**Claude** will use the `get_repair_pricing` tool:
```
Tool: get_repair_pricing
Arguments: {
  "service_type": "phone_repair",
  "repair_detail": "screen",
  "brand": "iPhone",
  "model": "iPhone 14"
}
```

### Example 2: List Available Services

**User**: "What computer repair services does krispc offer?"

**Claude** will use the `list_repair_services` tool:
```
Tool: list_repair_services
Arguments: {
  "category": "computer"
}
```

### Example 3: Process Caregiver PDF

**User**: "I have a caregiver schedule PDF at /path/to/schedule.pdf, can you extract the events?"

**Claude** will use the `process_caregiver_pdf` tool:
```
Tool: process_caregiver_pdf
Arguments: {
  "pdf_path": "/path/to/schedule.pdf",
  "extract_calendar_name": true
}
```

## Testing the MCP Server

### Manual Testing

Run the server directly to test:

```bash
cd /Users/chris/dev/src/py/krispcBase
python mcp_server.py
```

The server runs in stdio mode, waiting for JSON-RPC messages from MCP clients.

### Testing with MCP Inspector

Use the official MCP Inspector to test your server:

```bash
npx @modelcontextprotocol/inspector python mcp_server.py
```

This opens a web UI where you can:
- View available resources and tools
- Test tool calls interactively
- See responses in real-time

## Architecture

```
┌─────────────────┐
│  AI Assistant   │
│ (Claude, etc.)  │
└────────┬────────┘
         │ MCP Protocol (stdio)
         │
┌────────▼────────┐
│  mcp_server.py  │
│                 │
│  - Resources    │
│  - Tools        │
└────────┬────────┘
         │
         │
    ┌────▼─────┐        ┌──────────────┐
    │  krispc  │        │   pdf2cal    │
    │          │        │              │
    │ - API    │        │ - PDF Parser │
    │ - Models │        │ - Calendar   │
    └──────────┘        └──────────────┘
```

## Available Resources

Resources are read-only data sources that the AI can access:

| URI | Description |
|-----|-------------|
| `krispc://services/list` | All repair services with descriptions and pricing |
| `krispc://brands/list` | Supported brands (Apple, Samsung, etc.) |
| `krispc://locations/list` | Cities where service is available |

## Available Tools

Tools are functions the AI can call:

### `get_repair_pricing`

Get pricing information for specific repairs.

**Arguments:**
- `service_type` (required): Type of repair (phone_repair, computer_repair, etc.)
- `repair_detail` (optional): Specific component (screen, battery, etc.)
- `brand` (optional): Device brand
- `model` (optional): Device model

**Returns:** JSON with pricing information

### `list_repair_services`

List all available services, optionally filtered by category.

**Arguments:**
- `category` (optional): Filter by category (phone, computer, data, etc.)

**Returns:** JSON array of services

### `get_service_locations`

Get list of cities where krispc provides services.

**Arguments:** None

**Returns:** JSON array of locations

### `process_caregiver_pdf`

Process a PDF with caregiver schedules and extract events.

**Arguments:**
- `pdf_path` (required): Path to PDF file
- `extract_calendar_name` (optional): Extract suggested calendar name from filename

**Returns:** JSON with extracted appointments

## Security Considerations

1. **Authentication**: The MCP server currently doesn't require authentication for read-only operations (pricing, services list). PDF processing requires file system access.

2. **File Access**: The `process_caregiver_pdf` tool can access files on the local system. Only use with trusted AI assistants.

3. **Rate Limiting**: Consider adding rate limiting if exposing the server over network.

## Extending the Server

To add new tools or resources:

1. **Add a new tool:**

```python
@mcp_server.list_tools()
async def list_tools() -> List[Tool]:
    return [
        # ... existing tools
        Tool(
            name="your_new_tool",
            description="Tool description",
            inputSchema={
                "type": "object",
                "properties": {
                    "param1": {
                        "type": "string",
                        "description": "Parameter description"
                    }
                },
                "required": ["param1"]
            }
        )
    ]

@mcp_server.call_tool()
async def call_tool(name: str, arguments: Any) -> List[TextContent]:
    if name == "your_new_tool":
        return await your_new_tool_impl(arguments)
    # ... existing tools
```

2. **Add a new resource:**

```python
@mcp_server.list_resources()
async def list_resources() -> List[Resource]:
    return [
        # ... existing resources
        Resource(
            uri="krispc://your/resource",
            name="Resource Name",
            mimeType="application/json",
            description="Resource description"
        )
    ]

@mcp_server.read_resource()
async def read_resource(uri: str) -> str:
    if uri == "krispc://your/resource":
        return json.dumps(your_data)
    # ... existing resources
```

## Troubleshooting

### Server won't start

**Check Python environment:**
```bash
cd /Users/chris/dev/src/py/krispcBase
pipenv shell
python mcp_server.py --log-level DEBUG
```

**Check Django settings:**
```bash
export DJANGO_SETTINGS_MODULE=_main.settings
python manage.py check
```

### Claude Desktop doesn't see the server

1. Check the config file path is correct
2. Restart Claude Desktop completely
3. Check Claude Desktop logs (Help → View Logs)
4. Verify server runs without errors

### Tool calls fail

1. Check server logs with `--log-level DEBUG`
2. Verify Django database is accessible
3. Test tools using MCP Inspector

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/model-context-protocol)

## Next Steps

1. **Deploy as a service**: Run the MCP server as a systemd service or background process
2. **Add authentication**: Implement OAuth or API keys for sensitive operations
3. **Add more tools**: Expose additional krispc and pdf2cal functionality
4. **Create a web interface**: Build a web UI for managing the MCP server
5. **Share with community**: Package as a reusable MCP server for repair shops

---

**Questions or issues?** Check the server logs with `--log-level DEBUG` for detailed information.
