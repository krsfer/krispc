"""
Model Context Protocol (MCP) Server for krispc services.

This server exposes krispc and pdf2cal services to AI assistants that support MCP.
AI tools like Claude, ChatGPT, etc. can discover and use these services through MCP.

Exposed Services:
- get_repair_pricing: Get phone/computer repair costs
- list_repair_services: List all available repair services
- process_caregiver_pdf: Process PDF with caregiver events (requires authentication)

Usage:
    python mcp_server.py --port 8765
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

# Import Django models and services
from krispc import lst_products, marques, lst_villes

logger = logging.getLogger(__name__)

# Create MCP server
mcp_server = Server("krispc-services")


#
# RESOURCES - Discoverable data sources
#

@mcp_server.list_resources()
async def list_resources() -> List[Resource]:
    """List all available resources (data sources) exposed by this MCP server."""
    return [
        Resource(
            uri="krispc://services/list",
            name="Repair Services",
            mimeType="application/json",
            description="Complete list of phone and computer repair services offered by krispc",
        ),
        Resource(
            uri="krispc://brands/list",
            name="Supported Brands",
            mimeType="application/json",
            description="List of phone and computer brands supported by krispc",
        ),
        Resource(
            uri="krispc://locations/list",
            name="Service Locations",
            mimeType="application/json",
            description="Cities where krispc provides repair services",
        ),
    ]


@mcp_server.read_resource()
async def read_resource(uri: str) -> str:
    """Read a specific resource by URI."""
    if uri == "krispc://services/list":
        services = lst_products.data()
        return json.dumps(services, ensure_ascii=False, indent=2)
    
    elif uri == "krispc://brands/list":
        brands = marques.data()
        return json.dumps(brands, ensure_ascii=False, indent=2)
    
    elif uri == "krispc://locations/list":
        locations = lst_villes.data()
        return json.dumps(locations, ensure_ascii=False, indent=2)
    
    else:
        raise ValueError(f"Unknown resource URI: {uri}")


#
# TOOLS - Callable functions that AI assistants can invoke
#

@mcp_server.list_tools()
async def list_tools() -> List[Tool]:
    """List all available tools (callable functions) exposed by this MCP server."""
    return [
        Tool(
            name="get_repair_pricing",
            description=(
                "Get pricing information for phone or computer repairs. "
                "Provides detailed cost estimates for specific repair types like "
                "screen replacement, battery replacement, water damage repair, etc. "
                "Supports various brands including iPhone, Samsung, Huawei, and more."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "service_type": {
                        "type": "string",
                        "description": (
                            "Type of repair service. Examples: 'phone_repair', 'computer_repair', "
                            "'data_recovery', 'printer_repair', 'software_assistance', 'virus_removal', "
                            "'security_consultation', 'network_repair', 'training'"
                        ),
                    },
                    "repair_detail": {
                        "type": "string",
                        "description": (
                            "Specific repair detail. For phones: 'screen', 'battery', 'charging_port', "
                            "'speaker', 'camera', 'back_glass', etc. For computers: similar hardware components."
                        ),
                        "default": None,
                    },
                    "brand": {
                        "type": "string",
                        "description": "Device brand (e.g., 'iPhone', 'Samsung', 'Huawei', 'HP', 'Dell')",
                        "default": None,
                    },
                    "model": {
                        "type": "string",
                        "description": "Specific device model (e.g., 'iPhone 14 Pro', 'Galaxy S23')",
                        "default": None,
                    },
                },
                "required": ["service_type"],
            },
        ),
        Tool(
            name="list_repair_services",
            description=(
                "List all available repair services offered by krispc. "
                "Returns a complete catalog of services including phone repair, "
                "computer repair, data recovery, and more with descriptions."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Optional filter by category (e.g., 'phone', 'computer', 'data')",
                        "default": None,
                    },
                },
            },
        ),
        Tool(
            name="get_service_locations",
            description=(
                "Get the list of cities/locations where krispc provides repair services. "
                "Useful for determining if service is available in a user's area."
            ),
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="process_caregiver_pdf",
            description=(
                "Process a PDF file containing caregiver schedules and extract events. "
                "This is used by pdf2cal to convert caregiver schedule PDFs into structured event data "
                "that can be synced to Google Calendar. The PDF should contain a monthly schedule "
                "with dates, times, and caregiver names."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "pdf_path": {
                        "type": "string",
                        "description": "Local file path to the PDF file to process",
                    },
                    "extract_calendar_name": {
                        "type": "boolean",
                        "description": "Whether to extract suggested calendar name from filename",
                        "default": True,
                    },
                },
                "required": ["pdf_path"],
            },
        ),
    ]


@mcp_server.call_tool()
async def call_tool(name: str, arguments: Any) -> List[TextContent]:
    """Handle tool execution requests from AI assistants."""
    
    if name == "get_repair_pricing":
        return await get_repair_pricing_tool(arguments)
    
    elif name == "list_repair_services":
        return await list_repair_services_tool(arguments)
    
    elif name == "get_service_locations":
        return await get_service_locations_tool(arguments)
    
    elif name == "process_caregiver_pdf":
        return await process_caregiver_pdf_tool(arguments)
    
    else:
        raise ValueError(f"Unknown tool: {name}")


#
# TOOL IMPLEMENTATIONS
#

async def get_repair_pricing_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    """Get pricing information for a specific repair service."""
    service_type = arguments.get("service_type")
    repair_detail = arguments.get("repair_detail")
    brand = arguments.get("brand")
    model = arguments.get("model")
    
    # Get all services
    services = lst_products.data()
    
    # Find matching service
    matching_service = None
    for service in services:
        service_name = service.get("Prd_Name", "").lower()
        service_desc = service.get("Prd_Desc", "").lower()
        
        # Simple matching logic - can be enhanced
        if service_type.lower() in service_name or service_type.lower() in service_desc:
            matching_service = service
            break
    
    if not matching_service:
        # Return general pricing info
        result = {
            "service_type": service_type,
            "message": "Service type not found. Here are all available services:",
            "available_services": [
                {
                    "name": s.get("Prd_Name"),
                    "description": s.get("Prd_Desc"),
                    "pricing_info": s.get("Prd_More"),
                }
                for s in services
            ],
        }
    else:
        result = {
            "service_type": service_type,
            "service_name": matching_service.get("Prd_Name"),
            "description": matching_service.get("Prd_Desc"),
            "pricing_info": matching_service.get("Prd_More"),
            "icon": matching_service.get("Prd_Icon"),
        }
        
        if repair_detail:
            result["repair_detail"] = repair_detail
        if brand:
            result["brand"] = brand
        if model:
            result["model"] = model
    
    return [
        TextContent(
            type="text",
            text=json.dumps(result, ensure_ascii=False, indent=2),
        )
    ]


async def list_repair_services_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    """List all available repair services."""
    category = arguments.get("category")
    
    services = lst_products.data()
    
    if category:
        # Filter by category
        filtered_services = [
            s for s in services
            if category.lower() in s.get("Prd_Name", "").lower()
            or category.lower() in s.get("Prd_Desc", "").lower()
        ]
    else:
        filtered_services = services
    
    result = {
        "total_services": len(filtered_services),
        "category_filter": category,
        "services": [
            {
                "name": s.get("Prd_Name"),
                "description": s.get("Prd_Desc"),
                "icon": s.get("Prd_Icon"),
                "pricing_info": s.get("Prd_More"),
            }
            for s in filtered_services
        ],
    }
    
    return [
        TextContent(
            type="text",
            text=json.dumps(result, ensure_ascii=False, indent=2),
        )
    ]


async def get_service_locations_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    """Get service locations."""
    locations = lst_villes.data()
    
    result = {
        "total_locations": len(locations),
        "locations": locations,
        "note": "krispc provides repair services in these cities",
    }
    
    return [
        TextContent(
            type="text",
            text=json.dumps(result, ensure_ascii=False, indent=2),
        )
    ]


async def process_caregiver_pdf_tool(arguments: Dict[str, Any]) -> List[TextContent]:
    """Process a caregiver schedule PDF and extract events."""
    from p2c.pdf_processing.parser_factory import PDFParserFactory
    from p2c.json_views import extract_name_from_filename
    
    pdf_path = arguments.get("pdf_path")
    extract_calendar_name = arguments.get("extract_calendar_name", True)
    
    if not os.path.exists(pdf_path):
        return [
            TextContent(
                type="text",
                text=json.dumps({
                    "error": f"PDF file not found: {pdf_path}",
                    "status": "error",
                }, indent=2),
            )
        ]
    
    try:
        # Use the same parser as the web application
        parser = PDFParserFactory.create_parser(pdf_path)
        appointments = parser.extract_schedule_entries(pdf_path)
        
        # Extract calendar name from filename if requested
        calendar_name = None
        if extract_calendar_name:
            filename = os.path.basename(pdf_path)
            calendar_name = extract_name_from_filename(filename)
        
        # Format the results
        result = {
            "status": "success",
            "pdf_path": pdf_path,
            "appointments_count": len(appointments or []),
            "suggested_calendar_name": calendar_name,
            "appointments": appointments or [],
            "note": (
                "These appointments can be synced to Google Calendar using the pdf2cal service. "
                "Authentication is required for calendar sync."
            ),
        }
        
        return [
            TextContent(
                type="text",
                text=json.dumps(result, ensure_ascii=False, indent=2),
            )
        ]
        
    except Exception as e:
        logger.error(f"Error processing PDF: {e}", exc_info=True)
        return [
            TextContent(
                type="text",
                text=json.dumps({
                    "error": str(e),
                    "status": "error",
                    "pdf_path": pdf_path,
                }, indent=2),
            )
        ]


#
# MAIN ENTRY POINT
#

async def main():
    """Run the MCP server."""
    logger.info("Starting krispc MCP server...")
    
    # Run the server using stdio transport
    async with stdio_server() as (read_stream, write_stream):
        await mcp_server.run(
            read_stream,
            write_stream,
            mcp_server.create_initialization_options(),
        )


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="krispc MCP Server")
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="Set the logging level",
    )
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    
    # Run the server
    asyncio.run(main())
