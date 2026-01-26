import asyncio
import websockets
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

class WebSocketProxyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # The path from the client is something like /emo/_next/webpack-hmr
        # We want to proxy to ws://localhost:3000/emo/_next/webpack-hmr
        self.target_url = f"ws://localhost:3000{self.scope['path']}"
        if self.scope.get('query_string'):
            self.target_url += f"?{self.scope['query_string'].decode()}"
        
        await self.accept()
        
        try:
            self.proxy_ws = await websockets.connect(self.target_url)
            # Start a task to read from the proxy and send to the client
            self.proxy_task = asyncio.create_task(self.proxy_to_client())
        except Exception as e:
            logger.error(f"Failed to connect to proxy WebSocket {self.target_url}: {e}")
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'proxy_ws'):
            await self.proxy_ws.close()
        if hasattr(self, 'proxy_task'):
            self.proxy_task.cancel()

    async def receive(self, text_data=None, bytes_data=None):
        if hasattr(self, 'proxy_ws'):
            if text_data:
                await self.proxy_ws.send(text_data)
            elif bytes_data:
                await self.proxy_ws.send(bytes_data)

    async def proxy_to_client(self):
        try:
            async for message in self.proxy_ws:
                if isinstance(message, str):
                    await self.send(text_data=message)
                else:
                    await self.send(bytes_data=message)
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            logger.error(f"Error in proxy_to_client: {e}")
        finally:
            await self.close()
