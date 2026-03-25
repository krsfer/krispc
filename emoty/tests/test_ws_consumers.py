"""
Tests for the Emoty pattern generation WebSocket consumer.
"""
import pytest
from channels.testing import WebsocketCommunicator
from emoty.ws_consumers import PatternConsumer


@pytest.mark.asyncio
async def test_generate_pattern_basic():
    """Test basic concentric pattern generation via WebSocket."""
    communicator = WebsocketCommunicator(PatternConsumer.as_asgi(), "/ws/emoty/pattern/")
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({"emojis": "🐋🐳"})
    response = await communicator.receive_json_from(timeout=5)

    assert response["emojis"] == "🐋🐳"
    assert response["size"] == 3
    assert len(response["grid"]) == 3

    await communicator.disconnect()


@pytest.mark.asyncio
async def test_generate_pattern_three_emojis():
    """Test 3-emoji concentric pattern."""
    communicator = WebsocketCommunicator(PatternConsumer.as_asgi(), "/ws/emoty/pattern/")
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({"emojis": "🐋🐳🏵️"})
    response = await communicator.receive_json_from(timeout=5)

    assert response["size"] == 5
    assert len(response["grid"]) == 5
    # Center row should contain the center emoji
    center_row = response["grid"][2]
    assert "🐋" in center_row

    await communicator.disconnect()


@pytest.mark.asyncio
async def test_missing_emojis_field():
    """Test error response when emojis field is missing."""
    communicator = WebsocketCommunicator(PatternConsumer.as_asgi(), "/ws/emoty/pattern/")
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({"foo": "bar"})
    response = await communicator.receive_json_from(timeout=5)

    assert "error" in response

    await communicator.disconnect()


@pytest.mark.asyncio
async def test_empty_emojis():
    """Test error response for empty emoji string."""
    communicator = WebsocketCommunicator(PatternConsumer.as_asgi(), "/ws/emoty/pattern/")
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({"emojis": ""})
    response = await communicator.receive_json_from(timeout=5)

    assert "error" in response

    await communicator.disconnect()


@pytest.mark.asyncio
async def test_multiple_requests_same_connection():
    """Test sending multiple requests over a single connection."""
    communicator = WebsocketCommunicator(PatternConsumer.as_asgi(), "/ws/emoty/pattern/")
    connected, _ = await communicator.connect()
    assert connected

    # First request
    await communicator.send_json_to({"emojis": "😀😎"})
    response1 = await communicator.receive_json_from(timeout=5)
    assert response1["size"] == 3

    # Second request on same connection
    await communicator.send_json_to({"emojis": "🌸🌺🌻"})
    response2 = await communicator.receive_json_from(timeout=5)
    assert response2["size"] == 5

    await communicator.disconnect()


@pytest.mark.asyncio
async def test_single_emoji():
    """Test pattern with a single emoji (1x1 grid)."""
    communicator = WebsocketCommunicator(PatternConsumer.as_asgi(), "/ws/emoty/pattern/")
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({"emojis": "🐋"})
    response = await communicator.receive_json_from(timeout=5)

    assert response["size"] == 1
    assert len(response["grid"]) == 1

    await communicator.disconnect()
