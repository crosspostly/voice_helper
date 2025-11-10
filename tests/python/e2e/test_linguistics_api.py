"""
End-to-end tests for the Linguistics Orchestrator API.

Tests the complete API lifecycle including session management,
utterance processing, progress tracking, and error handling.
"""

import json
import pytest
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from main_linguistics import app
from linguistics.config import config


class TestLinguisticsAPI:
    """Test suite for the Linguistics Orchestrator API."""
    
    @pytest.fixture
    def client(self):
        """Create a test client."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_config(self):
        """Mock configuration for testing."""
        with patch.object(config, 'GEMINI_API_KEY', 'test-api-key'):
            with patch.object(config, 'validate_config', return_value=[]):
                with patch.object(config, 'ensure_directories'):
                    yield
    
    def test_root_endpoint(self, client):
        """Test the root endpoint returns service information."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["service"] == "Linguistics Orchestrator API"
        assert data["version"] == "0.1.0"
        assert data["status"] == "running"
        assert "endpoints" in data
        assert "health" in data["endpoints"]
    
    def test_health_check_endpoint(self, client, mock_config):
        """Test the health check endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "timestamp" in data
        assert "components" in data
        assert isinstance(data["components"], dict)
    
    def test_list_personas_endpoint(self, client, mock_config):
        """Test the personas listing endpoint."""
        response = client.get("/personas")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "personas" in data
        assert "count" in data
        assert isinstance(data["personas"], list)
        assert data["count"] >= 0
        
        # Check persona structure if any are returned
        if data["personas"]:
            persona = data["personas"][0]
            assert "id" in persona
            assert "name" in persona
            assert "description" in persona
            assert "traits" in persona
            assert "response_style" in persona
            assert "capabilities" in persona
    
    @patch('main_linguistics.coordinator', None)
    @patch('main_linguistics.get_coordinator')
    def test_start_session_success(self, mock_get_coordinator, client, mock_config):
        """Test successful session start."""
        # Mock coordinator response
        mock_coordinator = AsyncMock()
        mock_coordinator.start_session.return_value = {
            "success": True,
            "session_id": "test-session-123",
            "user_id": "test-user-456",
            "persona": {
                "id": "assistant",
                "name": "Helpful Assistant",
                "description": "A friendly AI assistant"
            },
            "started_at": datetime.now(timezone.utc).isoformat(),
            "message": "Session started with Helpful Assistant persona"
        }
        mock_get_coordinator.return_value = mock_coordinator
        
        # Make request
        request_data = {
            "user_id": "test-user-456",
            "session_id": "test-session-123",
            "persona_id": "assistant",
            "context": {"domain": "general"}
        }
        
        response = client.post("/session/start", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["session_id"] == "test-session-123"
        assert data["user_id"] == "test-user-456"
        assert "persona" in data
        assert "started_at" in data
        
        # Verify coordinator was called correctly
        mock_coordinator.start_session.assert_called_once_with(
            user_id="test-user-456",
            session_id="test-session-123",
            persona_id="assistant",
            context={"domain": "general"}
        )
    
    @patch('main_linguistics.coordinator', None)
    @patch('main_linguistics.get_coordinator')
    def test_start_session_failure(self, mock_get_coordinator, client, mock_config):
        """Test session start failure."""
        # Mock coordinator failure response
        mock_coordinator = AsyncMock()
        mock_coordinator.start_session.return_value = {
            "success": False,
            "error": "Database connection failed",
            "message": "Failed to start session"
        }
        mock_get_coordinator.return_value = mock_coordinator
        
        request_data = {
            "user_id": "test-user-456",
            "session_id": "test-session-123"
        }
        
        response = client.post("/session/start", json=request_data)
        
        assert response.status_code == 400
        data = response.json()
        
        assert "error" in data
        assert data["error"] == "Database connection failed"
    
    def test_start_session_missing_fields(self, client, mock_config):
        """Test session start with missing required fields."""
        request_data = {
            "user_id": "test-user-456"
            # Missing session_id
        }
        
        response = client.post("/session/start", json=request_data)
        
        assert response.status_code == 422  # Validation error
    
    @patch('main_linguistics.coordinator', None)
    @patch('main_linguistics.get_coordinator')
    def test_process_utterance_success(self, mock_get_coordinator, client, mock_config):
        """Test successful utterance processing."""
        # Mock coordinator response
        mock_coordinator = AsyncMock()
        mock_coordinator.process_utterance.return_value = {
            "success": True,
            "session_id": "test-session-123",
            "user_id": "test-user-456",
            "persona": {
                "id": "assistant",
                "name": "Helpful Assistant"
            },
            "response": {
                "summary": "Hello! How can I help you today?",
                "detailed_text": "I'm here to assist you with any questions or tasks you might have.",
                "next_actions": ["Ask a question", "Request assistance"],
                "metadata": {"persona_id": "assistant"}
            },
            "audio_data": None,
            "context_used": False,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        mock_get_coordinator.return_value = mock_coordinator
        
        request_data = {
            "user_id": "test-user-456",
            "session_id": "test-session-123",
            "utterance": "Hello, can you help me?",
            "context": {"language": "en"}
        }
        
        response = client.post("/utterance", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["session_id"] == "test-session-123"
        assert data["user_id"] == "test-user-456"
        assert "response" in data
        assert "summary" in data["response"]
        assert "detailed_text" in data["response"]
        assert "next_actions" in data["response"]
        assert isinstance(data["response"]["next_actions"], list)
        
        # Verify coordinator was called correctly
        mock_coordinator.process_utterance.assert_called_once_with(
            user_id="test-user-456",
            session_id="test-session-123",
            utterance="Hello, can you help me?",
            context={"language": "en"}
        )
    
    @patch('main_linguistics.get_coordinator')
    @patch('main_linguistics.coordinator', None)
    def test_process_utterance_empty_utterance(self, client, mock_config):
        """Test utterance processing with empty utterance."""
        request_data = {
            "user_id": "test-user-456",
            "session_id": "test-session-123",
            "utterance": "   "  # Empty/whitespace only
        }
        
        response = client.post("/utterance", json=request_data)
        
        assert response.status_code == 400
        data = response.json()
        
        assert "error" in data
        assert "empty" in data["error"].lower()
    
    @patch('main_linguistics.coordinator', None)
    @patch('main_linguistics.get_coordinator')
    def test_get_progress_user_level(self, mock_get_coordinator, client, mock_config):
        """Test getting user-level progress."""
        # Mock coordinator response
        mock_coordinator = AsyncMock()
        mock_coordinator.get_progress_snapshot.return_value = {
            "user_id": "test-user-456",
            "total_sessions": 5,
            "progress_entries": 23,
            "last_activity": datetime.now(timezone.utc).isoformat(),
            "recent_progress": [
                {
                    "session_id": "session-1",
                    "skill_practiced": "conversation",
                    "completion_score": 0.8
                }
            ]
        }
        mock_get_coordinator.return_value = mock_coordinator
        
        request_data = {
            "user_id": "test-user-456"
            # No session_id for user-level progress
        }
        
        response = client.post("/progress", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == "test-user-456"
        assert data["total_sessions"] == 5
        assert data["progress_entries"] == 23
        assert "last_activity" in data
        assert "recent_progress" in data
        
        # Verify coordinator was called correctly
        mock_coordinator.get_progress_snapshot.assert_called_once_with(
            user_id="test-user-456",
            session_id=None
        )
    
    @patch('main_linguistics.coordinator', None)
    @patch('main_linguistics.get_coordinator')
    def test_get_progress_session_level(self, mock_get_coordinator, client, mock_config):
        """Test getting session-level progress."""
        # Mock coordinator response
        mock_coordinator = AsyncMock()
        mock_coordinator.get_progress_snapshot.return_value = {
            "user_id": "test-user-456",
            "session_id": "test-session-123",
            "conversation_count": 8,
            "last_activity": datetime.now(timezone.utc).isoformat(),
            "has_context": True,
            "session_active": True
        }
        mock_get_coordinator.return_value = mock_coordinator
        
        request_data = {
            "user_id": "test-user-456",
            "session_id": "test-session-123"
        }
        
        response = client.post("/progress", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == "test-user-456"
        assert data["session_id"] == "test-session-123"
        assert data["conversation_count"] == 8
        assert data["has_context"] is True
        assert data["session_active"] is True
        
        # Verify coordinator was called correctly
        mock_coordinator.get_progress_snapshot.assert_called_once_with(
            user_id="test-user-456",
            session_id="test-session-123"
        )
    
    @patch('main_linguistics.coordinator', None)
    def test_service_unavailable_error(self, client):
        """Test graceful degradation when service is not initialized."""
        with patch('main_linguistics.coordinator', None):
            request_data = {
                "user_id": "test-user-456",
                "session_id": "test-session-123"
            }
            
            response = client.post("/session/start", json=request_data)
            
            assert response.status_code == 503
            data = response.json()
            
            assert "error" in data
            assert "not initialized" in data["error"].lower()
    
    @patch('main_linguistics.coordinator', None)
    @patch('main_linguistics.get_coordinator')
    def test_missing_api_key_error(self, mock_get_coordinator, client):
        """Test error when API key is missing."""
        with patch.object(config, 'validate_config', return_value=["GEMINI_API_KEY is required"]):
            response = client.get("/health")
            
            # Should still return 200 but with degraded status
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] in ["degraded", "unhealthy"]
            assert "config" in data["components"]
            assert data["components"]["config"]["status"] == "unhealthy"
    
    @patch('main_linguistics.coordinator', None)
    @patch('main_linguistics.get_coordinator')
    def test_chroma_offline_error(self, mock_get_coordinator, client, mock_config):
        """Test error when ChromaDB is offline."""
        mock_coordinator = AsyncMock()
        mock_coordinator.health_check.return_value = {
                "overall": "degraded",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "components": {
                    "database": {
                        "status": "unhealthy",
                        "details": "Connection to ChromaDB failed"
                    }
                }
            }
            mock_get_coordinator.return_value = mock_coordinator
            
            response = client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "degraded"
            assert data["components"]["database"]["status"] == "unhealthy"
    
    @patch('main_linguistics.coordinator', None)
    @patch('main_linguistics.get_coordinator')
    def test_empty_progress_response(self, mock_get_coordinator, client, mock_config):
        """Test progress response when no progress data exists."""
        mock_coordinator = AsyncMock()
        mock_coordinator.get_progress_snapshot.return_value = {
                "user_id": "test-user-456",
                "session_id": "test-session-123",
                "conversation_count": 0,
                "last_activity": None,
                "has_context": False,
                "session_active": False
            }
            mock_get_coordinator.return_value = mock_coordinator
            
            request_data = {
                "user_id": "test-user-456",
                "session_id": "test-session-123"
            }
            
            response = client.post("/progress", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["conversation_count"] == 0
            assert data["has_context"] is False
            assert data["session_active"] is False
            assert data["last_activity"] is None
    
    @patch('main_linguistics.get_coordinator')
    def test_session_lifecycle_complete_flow(self, mock_get_coordinator, client, mock_config):
        """Test complete session lifecycle: start -> utterance -> progress."""
        mock_coordinator = AsyncMock()
        mock_get_coordinator.return_value = mock_coordinator
        
        # Setup mock responses
        mock_coordinator.start_session.return_value = {
            "success": True,
            "session_id": "test-session-123",
            "user_id": "test-user-456",
            "persona": {"id": "assistant", "name": "Helpful Assistant"},
            "started_at": datetime.now(timezone.utc).isoformat(),
            "message": "Session started"
        }
        
        mock_coordinator.process_utterance.return_value = {
            "success": True,
            "session_id": "test-session-123",
            "user_id": "test-user-456",
            "persona": {"id": "assistant", "name": "Helpful Assistant"},
            "response": {
                "summary": "Hello!",
                "detailed_text": "How can I help you?",
                "next_actions": ["Continue conversation"],
                "metadata": {}
            },
            "audio_data": None,
            "context_used": False,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        mock_coordinator.get_progress_snapshot.return_value = {
            "user_id": "test-user-456",
            "session_id": "test-session-123",
            "conversation_count": 1,
            "last_activity": datetime.now(timezone.utc).isoformat(),
            "has_context": True,
            "session_active": True
        }
        
        # Step 1: Start session
        session_request = {
            "user_id": "test-user-456",
            "session_id": "test-session-123"
        }
        
        session_response = client.post("/session/start", json=session_request)
        assert session_response.status_code == 200
        
        # Step 2: Process utterance
        utterance_request = {
            "user_id": "test-user-456",
            "session_id": "test-session-123",
            "utterance": "Hello, how are you?"
        }
        
        utterance_response = client.post("/utterance", json=utterance_request)
        assert utterance_response.status_code == 200
        
        # Step 3: Get progress
        progress_request = {
            "user_id": "test-user-456",
            "session_id": "test-session-123"
        }
        
        progress_response = client.post("/progress", json=progress_request)
        assert progress_response.status_code == 200
        
        # Verify all calls were made
        assert mock_coordinator.start_session.call_count == 1
        assert mock_coordinator.process_utterance.call_count == 1
        assert mock_coordinator.get_progress_snapshot.call_count == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])