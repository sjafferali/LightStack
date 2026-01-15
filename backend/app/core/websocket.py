"""
WebSocket connection manager for real-time alert updates.

This module provides a singleton connection manager that handles:
- WebSocket client connections and disconnections
- Broadcasting events to all connected clients
- Message serialization and delivery
"""

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import WebSocket
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class WebSocketMessage(BaseModel):
    """Base structure for all WebSocket messages."""

    type: str
    data: dict[str, Any]
    timestamp: str


class ConnectionManager:
    """
    Manages WebSocket connections and broadcasts events to clients.

    This is a singleton that should be used throughout the application
    to broadcast alert state changes to all connected Home Assistant instances.
    """

    def __init__(self) -> None:
        self._active_connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    @property
    def connection_count(self) -> int:
        """Return the number of active connections."""
        return len(self._active_connections)

    async def connect(self, websocket: WebSocket) -> None:
        """
        Accept a new WebSocket connection.

        Args:
            websocket: The WebSocket connection to accept
        """
        await websocket.accept()
        async with self._lock:
            self._active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total connections: {self.connection_count}")

    async def disconnect(self, websocket: WebSocket) -> None:
        """
        Remove a WebSocket connection.

        Args:
            websocket: The WebSocket connection to remove
        """
        async with self._lock:
            if websocket in self._active_connections:
                self._active_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total connections: {self.connection_count}")

    async def _send_to_client(self, websocket: WebSocket, message: dict[str, Any]) -> bool:
        """
        Send a message to a single client.

        Args:
            websocket: The target WebSocket connection
            message: The message to send

        Returns:
            True if sent successfully, False if the connection failed
        """
        try:
            await websocket.send_json(message)
            return True
        except Exception as e:
            logger.warning(f"Failed to send message to client: {e}")
            return False

    async def broadcast(self, event_type: str, data: dict[str, Any]) -> int:
        """
        Broadcast an event to all connected clients.

        Args:
            event_type: The type of event (e.g., 'alert_triggered', 'current_alert_changed')
            data: The event data payload

        Returns:
            Number of clients the message was successfully sent to
        """
        if not self._active_connections:
            return 0

        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(UTC).isoformat(),
        }

        # Create tasks for all sends
        async with self._lock:
            connections = self._active_connections.copy()

        failed_connections: list[WebSocket] = []
        success_count = 0

        for websocket in connections:
            if await self._send_to_client(websocket, message):
                success_count += 1
            else:
                failed_connections.append(websocket)

        # Clean up failed connections
        if failed_connections:
            async with self._lock:
                for ws in failed_connections:
                    if ws in self._active_connections:
                        self._active_connections.remove(ws)

        logger.debug(f"Broadcast '{event_type}' to {success_count}/{len(connections)} clients")
        return success_count

    async def send_to_one(
        self, websocket: WebSocket, event_type: str, data: dict[str, Any]
    ) -> bool:
        """
        Send an event to a specific client.

        Args:
            websocket: The target WebSocket connection
            event_type: The type of event
            data: The event data payload

        Returns:
            True if sent successfully, False otherwise
        """
        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        return await self._send_to_client(websocket, message)


# Global singleton instance
manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """Get the global WebSocket connection manager instance."""
    return manager
