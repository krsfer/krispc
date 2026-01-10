# MCP Implementation - Quick Start Guide

**Status:** ✅ Ready to Use  
**Date:** 2026-01-11  
**Test Results:** All tests passing ✅

---

## What You Have Now

Your krispc Django application now has a **Model Context Protocol (MCP) server** that exposes your services to AI assistants.

### Available Services

**Resources (Data Sources):**
- Service catalog (9 repair services)
- Supported brands list
- Service locations (Nice, Grasse, Antibes, Cannes)

**Tools (Functions):**
- Get repair pricing estimates
- List repair services (with filtering)
- Check service availability by location  
- Process caregiver PDFs (extract events)

---

## Quick Start (5 Minutes)

### Step 1: Verify Installation

The MCP server is installed and tested:

```bash
cd /Users/chris/dev/src/py/krispcBase
pipenv run python test_mcp_server.py
```

Expected output: ✅ All tests passed!

### Step 2: Configure Claude Desktop

**macOS:**

1. Open Finder and press `Cmd+Shift+G`
2. Go to: `~/Library/Application Support/Claude/`
3. Create or edit `claude_desktop_config.json`:

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

**Alternative (without pipenv):**

```json
{
  "mcpServers": {
    "krispc": {
      "command": "python",
      "args": ["/Users/chris/dev/src/py/krispcBase/mcp_server.py"],
      "env": {
        "DJANGO_SETTINGS_MODULE": "_main.settings"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

1. **Quit** Claude Desktop completely (Cmd+Q)
2. **Reopen** Claude Desktop
3. Look for MCP server indicator (check settings/preferences)

### Step 4: Test It!

Ask Claude any of these questions:

#### Service Discovery
> "What repair services does krispc offer?"

> "Can you list all the computer repair services available at krispc?"

#### Pricing Information
> "How much does it cost to replace an iPhone screen at krispc?"

> "What are the prices for computer repairs?"

#### Location Check
> "Does krispc provide service in Nice?"

> "Where can I get phone repairs from krispc?"

#### PDF Processing (pdf2cal)
> "I have a caregiver schedule PDF at `/Users/chris/Downloads/planning.pdf`. Can you extract the events?"

---

## Expected Behavior

### Example 1: Asking About Services

**You:**
> "What services does krispc offer?"

**Claude (using MCP):**
> Based on the krispc catalog, they offer 9 services:
> 
> 1. **Smartphone & Tablet Repair** - Screen repair, battery replacement, app installation (from 30€/hr)
> 2. **Desktop PC Maintenance** - Hardware upgrades, OS installation (from 40€)
> 3. **Laptop Maintenance** - Battery replacement, memory upgrades, faster storage (35€/hr)
> 4. **Printer Support** - Paper jams, connection errors (30€/hr)
> 5. **Computer Training** - Learn to use digital tools (40€/hr)
> 6. **Malware Removal** - Virus and spyware cleaning (60€ per device)
> 7. **Internet Security** - Parental controls, technical assistance (25-30€)
> 8. **Network Configuration** - WiFi setup, security settings (40€)
> 9. **Remote Assistance** - Remote troubleshooting and maintenance (45€/hr)

### Example 2: Checking Coverage

**You:**
> "I'm in Cannes. Does krispc cover my area?"

**Claude (using MCP):**
> Yes! krispc provides services in Cannes. They also cover:
> - Nice
> - Grasse
> - Antibes

---

## Troubleshooting

### Claude Desktop doesn't see the server

1. **Check config file location:**
   ```bash
   ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Verify paths are absolute:**
   - Change all paths to full absolute paths
   - Example: `/Users/chris/dev/src/py/krispcBase/mcp_server.py`

3. **Check Claude Desktop logs:**
   - Click Help → View Logs
   - Look for MCP connection errors

4. **Restart Claude completely:**
   - Quit (Cmd+Q), don't just close windows
   - Reopen from Applications

### "Command not found" errors

If using pipenv, make sure it's in PATH:

```bash
which pipenv
# Should show: /usr/local/bin/pipenv or similar
```

If not found, use the Python path approach instead:

```json
{
  "mcpServers": {
    "krispc": {
      "command": "/Users/chris/.local/share/virtualenvs/krispcBase-XXXXX/bin/python",
      "args": ["/Users/chris/dev/src/py/krispcBase/mcp_server.py"]
    }
  }
}
```

Find your virtualenv Python:
```bash
cd /Users/chris/dev/src/py/krispcBase
pipenv --py
```

### Server starts but tools don't work

1. **Enable debug logging:**
   ```bash
   pipenv run python mcp_server.py --log-level DEBUG
   ```

2. **Check database:**
   ```bash
   python manage.py check
   ```

3. **Test manually:**
   ```bash
   pipenv run python test_mcp_server.py
   ```

---

## Files Reference

| File | Purpose |
|------|---------|
| `mcp_server.py` | Main MCP server (483 lines) |
| `mcp_config.json` | Example Claude Desktop config |
| `test_mcp_server.py` | Automated test suite |
| `MCP_IMPLEMENTATION.md` | Detailed implementation docs |
| `MCP_README.md` | Feature overview |
| `MCP_SUMMARY.md` | Complete implementation summary |
| `PUBLISHING.md` | How to share your MCP server |

---

## Next Actions

### Immediate (Today)

- [x] MCP server implemented
- [x] Tests passing
- [ ] Configure Claude Desktop
- [ ] Test with real queries
- [ ] Share results/feedback

### Short Term (This Week)

- [ ] Test PDF processing with real files
- [ ] Improve tool response formatting
- [ ] Add more examples to docs
- [ ] Demo video/screenshots

### Long Term (This Month)

- [ ] Package for PyPI: `pip install krispc-mcp`
- [ ] Deploy as web service (HTTP/SSE)
- [ ] Add authentication for sensitive operations
- [ ] Submit to MCP server registry

---

## Support & Documentation

- **Quick Start:** This file
- **Full Implementation:** `MCP_IMPLEMENTATION.md` (350+ lines)
- **Summary:** `MCP_SUMMARY.md`
- **Testing:** `test_mcp_server.py`

**Need help?** Run the test script and check the logs:

```bash
pipenv run python test_mcp_server.py
pipenv run python mcp_server.py --log-level DEBUG
```

---

## Success Criteria

✅ Test script passes  
✅ Claude Desktop recognizes server  
✅ Can ask about services and get responses  
✅ Can check locations  
✅ Can process PDFs (if files available)

---

**Ready to go!** Configure Claude Desktop and start asking questions about krispc services. 🚀
