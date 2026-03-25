"""
WebSocket consumer for Emoty pattern generation.

Provides a persistent WebSocket connection for low-latency pattern generation.
Clients send emoji sequences and receive concentric pattern grids instantly,
avoiding per-request HTTP/TLS overhead.

Protocol:
  Client sends:  {"emojis": "🐋🐳🏵️"}
  Server sends:  {"emojis": "🐋🐳🏵️", "grid": ["row1", ...], "size": 5}
  On error:      {"error": "message"}
"""

import json
import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .pattern_generator import PatternGenerator

logger = logging.getLogger(__name__)


class PatternConsumer(AsyncJsonWebsocketConsumer):
    """
    Async WebSocket consumer for real-time emoji pattern generation.

    Accepts any connection (no auth required, mirrors the REST endpoint).
    Each incoming JSON message with an "emojis" field triggers pattern
    generation and an immediate JSON response.
    """

    async def connect(self):
        await self.accept()
        logger.debug("Pattern WebSocket connected: %s", self.channel_name)

    async def disconnect(self, close_code):
        logger.debug(
            "Pattern WebSocket disconnected: %s (code=%s)",
            self.channel_name,
            close_code,
        )

    async def receive_json(self, content, **kwargs):
        """Handle incoming pattern generation requests."""
        emojis_raw = content.get("emojis")

        if not emojis_raw or not isinstance(emojis_raw, str):
            await self.send_json({"error": "Missing or invalid 'emojis' field"})
            return

        try:
            # Validate and parse the emoji sequence
            sequence = PatternGenerator.validate_emoji_sequence(emojis_raw)

            # Generate the concentric pattern grid
            grid = PatternGenerator.generate_concentric_pattern(sequence)

            # Format each row as a concatenated emoji string (matches REST API)
            grid_strings = [
                PatternGenerator.format_grid_as_text([row]) for row in grid
            ]

            await self.send_json(
                {
                    "emojis": emojis_raw,
                    "grid": grid_strings,
                    "size": len(grid),
                }
            )

        except ValueError as exc:
            await self.send_json({"error": str(exc)})

        except Exception as exc:
            logger.exception("Unexpected error in pattern WebSocket")
            await self.send_json({"error": "Internal server error"})
