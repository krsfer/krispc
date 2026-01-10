# krispc MCP Server

🔧 **Model Context Protocol server for krispc repair services and pdf2cal**

Make krispc services discoverable and usable by AI assistants like Claude, ChatGPT, and others through the Model Context Protocol (MCP).

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/chris/dev/src/py/krispcBase
pipenv install
```

### 2. Test the MCP Server

```bash
pipenv run python mcp_server.py --log-level DEBUG
```

The server will run in stdio mode, waiting for MCP client connections.

### 3. Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

Or use pipenv:

```json
{
  "mcpServers": {
    "krispc": {
      "command": "pipenv",
      "args": ["run", "python", "mcp_server.py"],
      "cwd": "/Users/chris/dev/src/py/krispcBase"
    }
  }
}
```

### 4. Restart Claude Desktop

Completely quit and restart Claude Desktop to load the MCP server.

## Features

### Resources (Read-Only Data)

- **Service Catalog** (`krispc://services/list`) - All repair services with descriptions and pricing
- **Supported Brands** (`krispc://brands/list`) - Phone and computer brands serviced
- **Service Locations** (`krispc://locations/list`) - Cities where service is available

### Tools (Callable Functions)

- **`get_repair_pricing`** - Get cost estimates for repairs (screen, battery, etc.)
  - Supports phone repair, computer repair, data recovery, and more
  - Brand and model-specific pricing when available

- **`list_repair_services`** - Browse all available services
  - Optional category filtering (phone, computer, data, etc.)

- **`get_service_locations`** - Check if service is available in your area

- **`process_caregiver_pdf`** - Extract events from caregiver schedule PDFs
  - Parses monthly schedules with dates, times, caregiver names
  - Suggests calendar name from filename

## Usage Examples

Once configured in Claude Desktop, you can ask:

**Repair Pricing:**
> "How much does it cost to replace an iPhone 14 screen?"

> "What are the prices for computer repairs at krispc?"

**Service Discovery:**
> "What repair services does krispc offer?"

> "Can I get my Samsung Galaxy repaired at krispc?"

**Location Check:**
> "Does krispc provide service in Nice?"

**PDF Processing:**
> "I have a caregiver schedule PDF at /path/to/schedule.pdf, extract the events"

## Testing with MCP Inspector

Use the official MCP Inspector to test your server interactively:

```bash
npx @modelcontextprotocol/inspector python mcp_server.py
```

This opens a web UI where you can:
- View available resources and tools
- Test tool calls with custom arguments
- See responses in real-time

## Architecture

```
┌─────────────────────┐
│   AI Assistant      │
│  (Claude, etc.)     │
└──────────┬──────────┘
           │ MCP Protocol (stdio)
           │
┌──────────▼──────────┐
│   mcp_server.py     │
│                     │
│  Resources:         │
│  - services/list    │
│  - brands/list      │
│  - locations/list   │
│                     │
│  Tools:             │
│  - get_pricing      │
│  - process_pdf      │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
┌────▼───┐  ┌───▼────┐
│ krispc │  │ pdf2cal│
│  API   │  │ Parser │
└────────┘  └────────┘
```

## Files

- **`mcp_server.py`** - Main MCP server implementation
- **`mcp_config.json`** - Example Claude Desktop configuration
- **`MCP_IMPLEMENTATION.md`** - Detailed implementation guide
- **`PUBLISHING.md`** - Guide for sharing your MCP server

## Security

- **Read-only resources**: No authentication required for accessing service catalogs
- **PDF processing**: Requires file system access - use only with trusted AI assistants
- **Future**: Add API key authentication for hosted deployments

## Troubleshooting

### Server won't start

```bash
# Check Django setup
cd /Users/chris/dev/src/py/krispcBase
pipenv shell
python manage.py check

# Test server with debug logging
python mcp_server.py --log-level DEBUG
```

### Claude Desktop doesn't see the server

1. Verify config file location:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Check file permissions

2. Check absolute paths in config

3. Restart Claude Desktop completely (Quit → Reopen)

4. Check Claude Desktop logs (Help → View Logs)

### Tool calls fail

1. Enable debug logging: `--log-level DEBUG`
2. Check that Django can import all modules
3. Verify database is accessible

## Next Steps

- **Deploy as service**: Run as systemd service or background process
- **Add authentication**: OAuth or API keys for sensitive operations
- **Extend tools**: Add more krispc and pdf2cal functionality
- **Package for PyPI**: Make easily installable with `pip install krispc-mcp`

## Documentation

- [MCP Implementation Guide](./MCP_IMPLEMENTATION.md) - Detailed setup and usage
- [Publishing Guide](./PUBLISHING.md) - How to share your MCP server
- [Official MCP Docs](https://modelcontextprotocol.io/) - MCP specification

## License

Same as parent project (krispcBase)

---

**Questions?** Check `MCP_IMPLEMENTATION.md` for comprehensive documentation.
