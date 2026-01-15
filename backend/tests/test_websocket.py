"""
Tests for WebSocket functionality.
"""

import pytest
from app.core.websocket import ConnectionManager
from app.main import app
from app.schemas.websocket import ServerEventType
from starlette.testclient import TestClient


class TestConnectionManager:
    """Tests for the WebSocket connection manager."""

    @pytest.fixture
    def manager(self) -> ConnectionManager:
        """Create a fresh connection manager for testing."""
        return ConnectionManager()

    def test_initial_state(self, manager: ConnectionManager):
        """Test connection manager starts with no connections."""
        assert manager.connection_count == 0

    @pytest.mark.asyncio
    async def test_broadcast_no_connections(self, manager: ConnectionManager):
        """Test broadcasting with no connections returns 0."""
        count = await manager.broadcast("test_event", {"key": "value"})
        assert count == 0


def collect_messages_until_type(
    websocket, target_type: str, max_messages: int = 10
) -> tuple[list[dict], dict | None]:
    """
    Collect messages until we find one of the target type.
    Returns (all_messages, target_message).
    """
    messages = []
    target = None
    for _ in range(max_messages):
        try:
            msg = websocket.receive_json()
            messages.append(msg)
            if msg.get("type") == target_type:
                target = msg
                break
        except Exception:
            break
    return messages, target


def find_message_by_type(messages: list[dict], msg_type: str) -> dict | None:
    """Find a message by its type in a list of messages."""
    for msg in messages:
        if msg.get("type") == msg_type:
            return msg
    return None


class TestWebSocketEndpoint:
    """Tests for the WebSocket endpoint using TestClient."""

    def test_websocket_connection(self):
        """Test WebSocket connection establishment."""
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws") as websocket:
                # Should receive connection_established event
                data = websocket.receive_json()
                assert data["type"] == ServerEventType.CONNECTION_ESTABLISHED.value
                assert "state" in data["data"]
                assert "server_version" in data["data"]
                assert "timestamp" in data

    def test_websocket_initial_state(self):
        """Test initial state sent on connection."""
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws") as websocket:
                data = websocket.receive_json()
                state = data["data"]["state"]
                assert "is_all_clear" in state
                assert "current_alert" in state
                assert "active_count" in state
                assert "active_alerts" in state

    def test_websocket_ping_command(self):
        """Test PING command returns pong."""
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws") as websocket:
                # Skip connection_established
                websocket.receive_json()

                # Send PING command
                websocket.send_json(
                    {
                        "type": "ping",
                        "id": "test-ping-1",
                    }
                )

                # Receive response
                data = websocket.receive_json()
                assert data["type"] == ServerEventType.COMMAND_RESULT.value
                assert data["data"]["command_id"] == "test-ping-1"
                assert data["data"]["command_type"] == "ping"
                assert data["data"]["success"] is True
                assert data["data"]["result"]["pong"] is True

    def test_websocket_get_state_command(self):
        """Test GET_STATE command returns current state."""
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws") as websocket:
                # Skip connection_established
                websocket.receive_json()

                # Send GET_STATE command
                websocket.send_json(
                    {
                        "type": "get_state",
                        "id": "test-state-1",
                    }
                )

                # Receive response
                data = websocket.receive_json()
                assert data["type"] == ServerEventType.COMMAND_RESULT.value
                assert data["data"]["command_id"] == "test-state-1"
                assert data["data"]["success"] is True
                assert "is_all_clear" in data["data"]["result"]

    def test_websocket_trigger_alert(self):
        """Test TRIGGER_ALERT command."""
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws") as websocket:
                # Skip connection_established
                websocket.receive_json()

                # Trigger an alert
                websocket.send_json(
                    {
                        "type": "trigger_alert",
                        "id": "test-trigger-1",
                        "data": {
                            "alert_key": "ws-test-alert",
                            "priority": 2,
                            "note": "Test trigger via WebSocket",
                        },
                    }
                )

                # Collect messages until we get the command_result
                # We expect: alert_triggered, possibly current_alert_changed, command_result
                messages, result = collect_messages_until_type(
                    websocket, ServerEventType.COMMAND_RESULT.value
                )

                # Verify we got the command result
                assert (
                    result is not None
                ), f"Expected command_result, got: {[m['type'] for m in messages]}"
                assert result["data"]["command_id"] == "test-trigger-1"
                assert result["data"]["success"] is True

                # Verify alert_triggered was received
                triggered = find_message_by_type(messages, ServerEventType.ALERT_TRIGGERED.value)
                assert (
                    triggered is not None
                ), f"Expected alert_triggered, got: {[m['type'] for m in messages]}"
                assert triggered["data"]["alert"]["alert_key"] == "ws-test-alert"
                assert triggered["data"]["alert"]["is_active"] is True

    def test_websocket_clear_alert(self):
        """Test CLEAR_ALERT command."""
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws") as websocket:
                # Skip connection_established
                websocket.receive_json()

                # First trigger an alert
                websocket.send_json(
                    {
                        "type": "trigger_alert",
                        "id": "test-trigger-2",
                        "data": {"alert_key": "ws-test-clear"},
                    }
                )
                # Wait for the trigger command to complete
                collect_messages_until_type(websocket, ServerEventType.COMMAND_RESULT.value)

                # Now clear it
                websocket.send_json(
                    {
                        "type": "clear_alert",
                        "id": "test-clear-1",
                        "data": {
                            "alert_key": "ws-test-clear",
                            "note": "Test clear via WebSocket",
                        },
                    }
                )

                # Collect messages until command_result
                messages, result = collect_messages_until_type(
                    websocket, ServerEventType.COMMAND_RESULT.value
                )

                # Verify command result
                assert result is not None
                assert result["data"]["command_id"] == "test-clear-1"
                assert result["data"]["success"] is True

                # Verify alert_cleared was received
                cleared = find_message_by_type(messages, ServerEventType.ALERT_CLEARED.value)
                assert (
                    cleared is not None
                ), f"Expected alert_cleared, got: {[m['type'] for m in messages]}"
                assert cleared["data"]["alert"]["alert_key"] == "ws-test-clear"
                assert cleared["data"]["alert"]["is_active"] is False

    def test_websocket_clear_nonexistent_alert(self):
        """Test CLEAR_ALERT for nonexistent alert returns error."""
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws") as websocket:
                # Skip connection_established
                websocket.receive_json()

                # Try to clear nonexistent alert
                websocket.send_json(
                    {
                        "type": "clear_alert",
                        "id": "test-clear-404",
                        "data": {"alert_key": "nonexistent-alert-12345"},
                    }
                )

                # Receive error
                data = websocket.receive_json()
                assert data["type"] == ServerEventType.ERROR.value
                assert data["data"]["code"] == "ALERT_NOT_FOUND"
                assert data["data"]["command_id"] == "test-clear-404"

    def test_websocket_trigger_missing_alert_key(self):
        """Test TRIGGER_ALERT without alert_key returns error."""
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws") as websocket:
                # Skip connection_established
                websocket.receive_json()

                # Trigger without alert_key
                websocket.send_json(
                    {
                        "type": "trigger_alert",
                        "id": "test-trigger-no-key",
                        "data": {},
                    }
                )

                # Receive error
                data = websocket.receive_json()
                assert data["type"] == ServerEventType.ERROR.value
                assert data["data"]["code"] == "MISSING_ALERT_KEY"

    def test_websocket_unknown_command(self):
        """Test unknown command returns error."""
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws") as websocket:
                # Skip connection_established
                websocket.receive_json()

                # Send unknown command
                websocket.send_json(
                    {
                        "type": "UNKNOWN_COMMAND_XYZ",
                        "id": "test-unknown",
                    }
                )

                # Receive error
                data = websocket.receive_json()
                assert data["type"] == ServerEventType.ERROR.value
                assert data["data"]["code"] == "UNKNOWN_COMMAND"

    def test_websocket_clear_all_alerts(self):
        """Test CLEAR_ALL_ALERTS command."""
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws") as websocket:
                # Skip connection_established
                websocket.receive_json()

                # Trigger one alert first
                websocket.send_json(
                    {
                        "type": "trigger_alert",
                        "data": {"alert_key": "ws-bulk-test"},
                    }
                )
                # Wait for trigger to complete
                collect_messages_until_type(websocket, ServerEventType.COMMAND_RESULT.value)

                # Clear all
                websocket.send_json(
                    {
                        "type": "clear_all_alerts",
                        "id": "test-clear-all",
                        "data": {"note": "Test bulk clear"},
                    }
                )

                # Collect messages until command_result
                messages, result = collect_messages_until_type(
                    websocket, ServerEventType.COMMAND_RESULT.value
                )

                # Verify command result
                assert result is not None
                assert result["data"]["command_id"] == "test-clear-all"
                assert result["data"]["success"] is True

                # Verify all_alerts_cleared was received
                cleared = find_message_by_type(messages, ServerEventType.ALL_ALERTS_CLEARED.value)
                assert (
                    cleared is not None
                ), f"Expected all_alerts_cleared, got: {[m['type'] for m in messages]}"
                assert cleared["data"]["cleared_count"] >= 1


class TestRESTAPIBroadcasts:
    """Test that REST API calls broadcast to WebSocket clients."""

    def test_rest_trigger_broadcasts_to_websocket(self):
        """Test that triggering via REST API broadcasts to WebSocket."""
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws") as websocket:
                # Skip connection_established
                websocket.receive_json()

                # Trigger via REST API
                response = client.post(
                    "/api/v1/alerts/rest-broadcast-test/trigger",
                    json={"priority": 1, "note": "From REST API"},
                )
                assert response.status_code == 200

                # WebSocket should receive alert_triggered broadcast
                data = websocket.receive_json()
                assert data["type"] == ServerEventType.ALERT_TRIGGERED.value
                assert data["data"]["alert"]["alert_key"] == "rest-broadcast-test"

    def test_rest_clear_broadcasts_to_websocket(self):
        """Test that clearing via REST API broadcasts to WebSocket."""
        with TestClient(app) as client:
            # First trigger an alert
            client.post("/api/v1/alerts/rest-clear-test/trigger")

            with client.websocket_connect("/api/v1/ws") as websocket:
                # Skip connection_established
                websocket.receive_json()

                # Clear via REST API
                response = client.post(
                    "/api/v1/alerts/rest-clear-test/clear",
                    json={"note": "Cleared from REST API"},
                )
                assert response.status_code == 200

                # WebSocket should receive alert_cleared broadcast
                data = websocket.receive_json()
                assert data["type"] == ServerEventType.ALERT_CLEARED.value
                assert data["data"]["alert"]["alert_key"] == "rest-clear-test"
