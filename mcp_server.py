"""
Model Context Protocol (MCP) Server for KrisPC & Plexus services.

This server exposes services to AI assistants that support MCP.
AI tools like Claude, ChatGPT, etc. can discover and use these services.

Exposed Services:
- KrisPC: Repair pricing, services list, locations
- PDF2Cal: Caregiver PDF processing
- Plexus (SecondBrain): Capture inputs, search thoughts, manage actions
"""

import asyncio
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional

# Add the project directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', '_main.settings')
import django
django.setup()

from mcp.server import Server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)
from mcp.server.stdio import stdio_server

# Import KrisPC data
from krispc import lst_products, marques, lst_villes

# Import Plexus models
from plexus.models import Input, Thought, Action
from django.db.models import Q

logger = logging.getLogger(__name__)

# Create MCP server
mcp_server = Server("krispc-plexus-services")


#
# RESOURCES
#

@mcp_server.list_resources()
async def list_resources() -> List[Resource]:
    """List all available resources."""
    return [
        # KrisPC Resources
        Resource(
            uri="krispc://services/list",
            name="Repair Services",
            mimeType="application/json",
            description="Complete list of repair services",
        ),
        Resource(
            uri="krispc://brands/list",
            name="Supported Brands",
            mimeType="application/json",
            description="List of supported brands",
        ),
        Resource(
            uri="krispc://locations/list",
            name="Service Locations",
            mimeType="application/json",
            description="Cities where service is available",
        ),
        # Plexus Resources
        Resource(
            uri="plexus://thoughts/recent",
            name="Recent Thoughts",
            mimeType="application/json",
            description="The 10 most recent processed thoughts from SecondBrain",
        ),
        Resource(
            uri="plexus://actions/pending",
            name="Pending Actions",
            mimeType="application/json",
            description="All currently pending actions/tasks",
        ),
    ]

@mcp_server.read_resource()
async def read_resource(uri: str) -> str:
    """Read a specific resource."""
    # KrisPC Resources
    if uri == "krispc://services/list":
        return json.dumps(lst_products.data(), ensure_ascii=False, indent=2)
    elif uri == "krispc://brands/list":
        return json.dumps(marques.data(), ensure_ascii=False, indent=2)
    elif uri == "krispc://locations/list":
        return json.dumps(lst_villes.data(), ensure_ascii=False, indent=2)
    
    # Plexus Resources
    elif uri == "plexus://thoughts/recent":
        thoughts = Thought.objects.select_related("input").order_by("-input__timestamp")[:10]
        data = [
            {
                "id": t.id,
                "content": t.content,
                "type": t.type,
                "confidence": t.confidence_score,
                "created_at": t.input.timestamp.isoformat(),
            }
            for t in thoughts
        ]
        return json.dumps(data, ensure_ascii=False, indent=2)
    
    elif uri == "plexus://actions/pending":
        actions = Action.objects.filter(status="pending").select_related("thought").order_by("-thought__input__timestamp")
        data = [
            {
                "id": a.id,
                "description": a.description,
                "status": a.status,
                "thought_context": a.thought.content,
            }
            for a in actions
        ]
        return json.dumps(data, ensure_ascii=False, indent=2)
    
    else:
        raise ValueError(f"Unknown resource URI: {uri}")


#
# TOOLS
#

@mcp_server.list_tools()
async def list_tools() -> List[Tool]:
    """List all available tools."""
    return [
        # --- KrisPC Tools ---
        Tool(
            name="get_repair_pricing",
            description="Get pricing information for phone or computer repairs.",
            inputSchema={
                "type": "object",
                "properties": {
                    "service_type": {"type": "string", "description": "Type of repair service"},
                    "repair_detail": {"type": "string", "description": "Specific repair detail (e.g., 'screen')"},
                    "brand": {"type": "string", "description": "Device brand"},
                    "model": {"type": "string", "description": "Device model"},
                },
                "required": ["service_type"],
            },
        ),
        Tool(
            name="list_repair_services",
            description="List all available repair services.",
            inputSchema={
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Filter by category"},
                },
            },
        ),
        Tool(
            name="get_service_locations",
            description="Get the list of cities where services are available.",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="process_caregiver_pdf",
            description="Process a PDF file containing caregiver schedules.",
            inputSchema={
                "type": "object",
                "properties": {
                    "pdf_path": {"type": "string", "description": "Local file path to PDF"},
                    "extract_calendar_name": {"type": "boolean", "default": True},
                },
                "required": ["pdf_path"],
            },
        ),
        
        # --- Plexus Tools ---
        Tool(
            name="create_note",
            description="Save a new raw note or input into SecondBrain for processing.",
            inputSchema={
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "The content of the note/input"},
                    "source": {"type": "string", "description": "Source of the input", "default": "ai_assistant"},
                },
                "required": ["content"],
            },
        ),
        Tool(
            name="search_thoughts",
            description="Search through existing thoughts and memories.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search term"},
                    "limit": {"type": "integer", "description": "Max results", "default": 5},
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="list_actions",
            description="List action items, optionally filtering by status.",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["pending", "done", "dismissed"], "default": "pending"},
                },
            },
        ),
        Tool(
            name="toggle_action",
            description="Mark an action as done (or toggle its status).",
            inputSchema={
                "type": "object",
                "properties": {
                    "action_id": {"type": "integer", "description": "ID of the action"},
                    "status": {"type": "string", "enum": ["done", "pending", "dismissed"]},
                },
                "required": ["action_id"],
            },
        ),
    ]


@mcp_server.call_tool()
async def call_tool(name: str, arguments: Any) -> List[TextContent]:
    """Handle tool execution."""
    
    # KrisPC
    if name == "get_repair_pricing":
        return await get_repair_pricing_tool(arguments)
    elif name == "list_repair_services":
        return await list_repair_services_tool(arguments)
    elif name == "get_service_locations":
        return await get_service_locations_tool(arguments)
    elif name == "process_caregiver_pdf":
        return await process_caregiver_pdf_tool(arguments)
    
    # Plexus
    elif name == "create_note":
        return await create_note_tool(arguments)
    elif name == "search_thoughts":
        return await search_thoughts_tool(arguments)
    elif name == "list_actions":
        return await list_actions_tool(arguments)
    elif name == "toggle_action":
        return await toggle_action_tool(arguments)
    
    else:
        raise ValueError(f"Unknown tool: {name}")


#
# TOOL IMPLEMENTATIONS (KRISPC)
#

async def get_repair_pricing_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    service_type = arguments.get("service_type")
    repair_detail = arguments.get("repair_detail")
    brand = arguments.get("brand")
    model = arguments.get("model")
    
    services = lst_products.data()
    matching_service = None
    for service in services:
        if service_type.lower() in service.get("Prd_Name", "").lower() or \
           service_type.lower() in service.get("Prd_Desc", "").lower():
            matching_service = service
            break
    
    if not matching_service:
        return [TextContent(type="text", text=json.dumps({"message": "Service not found"}, indent=2))]

    result = {
        "service": matching_service.get("Prd_Name"),
        "description": matching_service.get("Prd_Desc"),
        "pricing": matching_service.get("Prd_More"),
        "brand": brand,
        "model": model
    }
    return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]

async def list_repair_services_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    category = arguments.get("category")
    services = lst_products.data()
    if category:
        services = [s for s in services if category.lower() in str(s).lower()]
    return [TextContent(type="text", text=json.dumps([s.get("Prd_Name") for s in services], ensure_ascii=False, indent=2))]

async def get_service_locations_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    return [TextContent(type="text", text=json.dumps(lst_villes.data(), ensure_ascii=False, indent=2))]

async def process_caregiver_pdf_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    from p2c.pdf_processing.parser_factory import PDFParserFactory
    pdf_path = arguments.get("pdf_path")
    if not os.path.exists(pdf_path):
        return [TextContent(type="text", text=json.dumps({"error": "File not found"}, indent=2))]
    try:
        parser = PDFParserFactory.create_parser(pdf_path)
        appointments = parser.extract_schedule_entries(pdf_path)
        return [TextContent(type="text", text=json.dumps({"appointments": appointments}, indent=2))]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps({"error": str(e)}, indent=2))]

#
# TOOL IMPLEMENTATIONS (PLEXUS)
#

async def create_note_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    content = arguments.get("content")
    source = arguments.get("source", "ai_assistant")
    
    def _create():
        return Input.objects.create(content=content, source=source)
    
    input_obj = await asyncio.to_thread(_create)
    return [TextContent(type="text", text=json.dumps({"status": "success", "id": input_obj.id}, indent=2))]

async def search_thoughts_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    query = arguments.get("query")
    limit = arguments.get("limit", 5)
    
    def _search():
        thoughts = Thought.objects.filter(
            Q(content__icontains=query) | Q(input__content__icontains=query)
        ).select_related("input")[:limit]
        return [{"id": t.id, "content": t.content, "confidence": t.confidence_score} for t in thoughts]

    results = await asyncio.to_thread(_search)
    return [TextContent(type="text", text=json.dumps(results, indent=2))]

async def list_actions_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    status = arguments.get("status", "pending")
    def _list():
        actions = Action.objects.filter(status=status)
        return [{"id": a.id, "description": a.description} for a in actions]
    results = await asyncio.to_thread(_list)
    return [TextContent(type="text", text=json.dumps(results, indent=2))]

async def toggle_action_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    action_id = arguments.get("action_id")
    status = arguments.get("status")
    def _toggle():
        try:
            action = Action.objects.get(pk=action_id)
            if status: action.status = status
            else: action.status = "done" if action.status == "pending" else "pending"
            action.save()
            return {"id": action.id, "status": action.status}
        except Action.DoesNotExist:
            return {"error": "Not found"}
    result = await asyncio.to_thread(_toggle)
    return [TextContent(type="text", text=json.dumps(result, indent=2))]

#
# MAIN
#

async def main():
    logger.info("Starting KrisPC & Plexus MCP server...")
    async with stdio_server() as (read_stream, write_stream):
        await mcp_server.run(
            read_stream,
            write_stream,
            mcp_server.create_initialization_options(),
        )

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level))
    asyncio.run(main())