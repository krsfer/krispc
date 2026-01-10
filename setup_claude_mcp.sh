#!/bin/bash
# Quick setup script for KrisPC MCP Server in Claude Desktop

set -e

echo "🚀 KrisPC MCP Server - Claude Desktop Setup"
echo "============================================"
echo

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    OS="Windows"
    CONFIG_DIR="$APPDATA/Claude"
else
    OS="Linux"
    CONFIG_DIR="$HOME/.config/Claude"
fi

echo "📍 Detected OS: $OS"
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
echo "📁 Config file: $CONFIG_FILE"
echo

# Get absolute path to this script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MCP_SERVER_PATH="$SCRIPT_DIR/mcp_server.py"

echo "🔍 MCP Server location: $MCP_SERVER_PATH"

# Check if mcp_server.py exists
if [ ! -f "$MCP_SERVER_PATH" ]; then
    echo "❌ Error: mcp_server.py not found at $MCP_SERVER_PATH"
    exit 1
fi

echo "✅ MCP Server found"
echo

# Check if Claude config directory exists
if [ ! -d "$CONFIG_DIR" ]; then
    echo "⚠️  Claude Desktop config directory not found at: $CONFIG_DIR"
    echo "    Please install Claude Desktop first: https://claude.ai/download"
    exit 1
fi

echo "✅ Claude Desktop directory found
"
echo

# Create configuration JSON
cat > /tmp/krispc_mcp_config.json <<EOF
{
  "mcpServers": {
    "krispc": {
      "command": "python",
      "args": [
        "$MCP_SERVER_PATH"
      ],
      "env": {
        "DJANGO_SETTINGS_MODULE": "_main.settings",
        "PYTHONPATH": "$SCRIPT_DIR"
      }
    }
  }
}
EOF

echo "📝 Generated MCP configuration:"
cat /tmp/krispc_mcp_config.json
echo

# Check if config file already exists
if [ -f "$CONFIG_FILE" ]; then
    echo "⚠️  Claude Desktop config file already exists"
    echo "    Location: $CONFIG_FILE"
    echo
    echo "    You have two options:"
    echo "    1. Backup and replace (recommended for first-time setup)"
    echo "    2. Manual merge (if you have other MCP servers)"
    echo
    read -p "    Choose option (1 or 2): " choice
    
    if [ "$choice" == "1" ]; then
        # Backup existing config
        BACKUP_FILE="$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$CONFIG_FILE" "$BACKUP_FILE"
        echo "    ✅ Backed up existing config to: $BACKUP_FILE"
        
        # Replace with new config
        cp /tmp/krispc_mcp_config.json "$CONFIG_FILE"
        echo "    ✅ Installed new configuration"
    else
        echo
        echo "    📋 Manual merge instructions:"
        echo "    1. Edit: $CONFIG_FILE"
        echo "    2. Add this to the 'mcpServers' object:"
        echo
        cat /tmp/krispc_mcp_config.json | grep -A 10 '"krispc"'
        echo
        echo "    3. Save the file"
    fi
else
    # Create new config file
    cp /tmp/krispc_mcp_config.json "$CONFIG_FILE"
    echo "✅ Created new Claude Desktop configuration"
fi

echo
echo "============================================"
echo "✅ Setup Complete!"
echo "============================================"
echo
echo "📋 Next steps:"
echo "   1. Restart Claude Desktop"
echo "   2. Test with these queries:"
echo "      - 'List all KrisPC repair services'"
echo "      - 'Where does KrisPC provide services?'"
echo "      - 'What does a phone repair cost?'"
echo
echo "📖 Documentation:"
echo "   - MCP Server Guide: $SCRIPT_DIR/MCP_SERVER_GUIDE.md"
echo "   - Test server: python $SCRIPT_DIR/test_mcp_server.py"
echo
echo "🐛 Troubleshooting:"
echo "   - Check Claude logs: $CONFIG_DIR/logs/"
echo "   - Verify config: cat $CONFIG_FILE"
echo "   - Test server: python $SCRIPT_DIR/test_mcp_server.py"
echo

# Clean up
rm /tmp/krispc_mcp_config.json
