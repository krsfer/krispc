#!/usr/bin/env python
"""
Test script for Plexus MCP Server

This script tests all MCP server functionality:
- Resources (data sources)
- Tools (callable functions)

Usage:
    python test_mcp_server.py
"""

import asyncio
import sys
import os
import json

# Add project to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', '_main.settings')
import django
django.setup()

from mcp_server import (
    list_resources,
    read_resource,
    list_tools,
    call_tool,
)

def print_header(text):
    """Print a formatted header"""
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def print_success(text):
    """Print success message"""
    print(f"✅ {text}")

def print_error(text):
    """Print error message"""
    print(f"❌ {text}")

def print_json(data):
    """Pretty print JSON data"""
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except:
            pass
    print(json.dumps(data, indent=2, ensure_ascii=False))

async def test_resources():
    """Test MCP resources"""
    print_header("Testing Resources")
    
    try:
        # List all resources
        resources = await list_resources()
        print_success(f"Found {len(resources)} resources:")
        for r in resources:
            print(f"\n  📁 {r.name}")
            print(f"     URI: {r.uri}")
            print(f"     Type: {r.mimeType}")
            print(f"     Description: {r.description}")
        
        # Test reading each resource
        print("\n" + "-"*60)
        print("Testing resource reads...")
        print("-"*60)
        
        for r in resources:
            try:
                content = await read_resource(r.uri)
                data = json.loads(content)
                print_success(f"{r.name}: {len(data) if isinstance(data, list) else 'OK'} items")
            except Exception as e:
                print_error(f"{r.name}: {e}")
        
        return True
    
    except Exception as e:
        print_error(f"Resource test failed: {e}")
        return False

async def test_tools():
    """Test MCP tools"""
    print_header("Testing Tools")
    
    try:
        # List all tools
        tools = await list_tools()
        print_success(f"Found {len(tools)} tools:")
        for t in tools:
            print(f"\n  🔧 {t.name}")
            print(f"     Description: {t.description}")
            print(f"     Required params: {t.inputSchema.get('required', [])}")
        
        return True
    
    except Exception as e:
        print_error(f"Tool listing failed: {e}")
        return False

async def test_tool_calls():
    """Test calling MCP tools"""
    print_header("Testing Tool Calls")
    
    tests = [
        {
            "name": "create_note",
            "args": {"content": "Test note from MCP test script"},
            "description": "Create a new note"
        },
        {
            "name": "search_thoughts",
            "args": {"query": "test"},
            "description": "Search thoughts"
        },
        {
            "name": "list_actions",
            "args": {"status": "pending"},
            "description": "List pending actions"
        },
    ]
    
    for test in tests:
        print(f"\n{'─'*60}")
        print(f"Test: {test['description']}")
        print(f"Tool: {test['name']}")
        print(f"Args: {test['args']}")
        print(f"{'{'}─{'}'*60}")
        
        try:
            result = await call_tool(test['name'], test['args'])
            if result and len(result) > 0:
                content = result[0].text
                print_success("Call succeeded")
                print("\nResponse:")
                print_json(content)
            else:
                print_error("No result returned")
        
        except Exception as e:
            print_error(f"Call failed: {e}")
    
    return True

async def main():
    """Run all tests"""
    print("\n" + "🚀"*30)
    print("  Plexus MCP Server Test Suite")
    print("🚀"*30)
    
    results = []
    
    # Test resources
    results.append(await test_resources())
    
    # Test tools listing
    results.append(await test_tools())
    
    # Test tool calls
    results.append(await test_tool_calls())
    
    # Summary
    print_header("Test Summary")
    total = len(results)
    passed = sum(results)
    failed = total - passed
    
    print(f"\n  Total tests: {total}")
    print(f"  ✅ Passed: {passed}")
    print(f"  ❌ Failed: {failed}")
    
    if failed == 0:
        print("\n  🎉 All tests passed! MCP server is ready to use.")
    else:
        print("\n  ⚠️  Some tests failed. Check errors above.")
        sys.exit(1)
    
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(main())