"""
Conversation memory management for linguistics package.

Provides functionality to store, retrieve, and manage conversation history
and contextual information for coherent multi-turn dialogues.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ..database import get_database, UserConversationMetadata
from ..config import config

logger = logging.getLogger(__name__)


class ConversationMemory:
    """Manages conversation memory and context for user sessions."""
    
    def __init__(self, user_id: str):
        """Initialize conversation memory for a specific user."""
        self.user_id = user_id
        self.db = get_database()
        self._session_cache: Dict[str, List[Dict[str, Any]]] = {}
    
    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Add a message to the conversation memory."""
        try:
            message = {
                "role": role,
                "content": content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "metadata": metadata or {}
            }
            
            # Add to session cache
            if session_id not in self._session_cache:
                self._session_cache[session_id] = []
            self._session_cache[session_id].append(message)
            
            # Store in database
            message_metadata = UserConversationMetadata(
                user_id=self.user_id,
                session_id=session_id,
                role=role,
                message_type="text",
                language="en",
                tokens_estimate=len(content.split())
            )
            
            # Generate unique ID for the message
            import uuid
            message_id = str(uuid.uuid4())
            
            # Use the database upsert method
            self.db.upsert(
                collection_name="user_conversations",
                ids=[message_id],
                documents=[content],
                metadatas=[{
                    **message_metadata.model_dump(),
                    "session_id": session_id,
                    "message_id": message_id
                }]
            )
            
            logger.debug(f"Added {role} message to session {session_id}")
            
        except Exception as e:
            logger.error(f"Failed to add message to memory: {e}")
            raise
    
    async def get_conversation_history(
        self,
        session_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve conversation history for a session."""
        try:
            # Check cache first
            if session_id in self._session_cache:
                history = self._session_cache[session_id]
                return history[-limit:] if limit else history
            
            # Retrieve from database
            results = self.db.get(
                collection_name="user_conversations",
                where={"user_id": self.user_id, "session_id": session_id},
                limit=limit or 50
            )
            
            history = []
            # Handle the results structure from ChromaDB
            documents = results.get("documents", [])
            metadatas = results.get("metadatas", [])
            
            for i, doc in enumerate(documents):
                metadata = metadatas[i] if i < len(metadatas) else {}
                history.append({
                    "role": metadata.get("role", "unknown"),
                    "content": doc,
                    "timestamp": metadata.get("created_at", ""),
                    "metadata": metadata
                })
            
            # Cache the results
            self._session_cache[session_id] = history
            
            return history
            
        except Exception as e:
            logger.error(f"Failed to retrieve conversation history: {e}")
            return []
    
    async def clear_session(self, session_id: str) -> None:
        """Clear conversation history for a specific session."""
        try:
            # Clear from cache
            if session_id in self._session_cache:
                del self._session_cache[session_id]
            
            # Clear from database - get all messages for this session and delete them
            results = self.db.get(
                collection_name="user_conversations",
                where={"user_id": self.user_id, "session_id": session_id}
            )
            
            # Extract IDs and delete
            if results.get("ids"):
                self.db.delete(
                    collection_name="user_conversations",
                    ids=results["ids"]
                )
            
            logger.info(f"Cleared conversation history for session {session_id}")
            
        except Exception as e:
            logger.error(f"Failed to clear session {session_id}: {e}")
            raise
    
    def get_context_summary(
        self,
        session_id: str,
        max_messages: int = 10
    ) -> Dict[str, Any]:
        """Get a summary of conversation context for the session."""
        try:
            history = self._session_cache.get(session_id, [])
            recent_history = history[-max_messages:] if len(history) > max_messages else history
            
            return {
                "session_id": session_id,
                "total_messages": len(history),
                "recent_messages": recent_history,
                "last_message": recent_history[-1] if recent_history else None,
                "has_context": len(recent_history) > 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get context summary: {e}")
            return {
                "session_id": session_id,
                "total_messages": 0,
                "recent_messages": [],
                "last_message": None,
                "has_context": False
            }


# Global memory instances cache
_memory_instances: Dict[str, ConversationMemory] = {}


def get_conversation_memory(user_id: str) -> ConversationMemory:
    """Get or create a conversation memory instance for a user."""
    if user_id not in _memory_instances:
        _memory_instances[user_id] = ConversationMemory(user_id)
    return _memory_instances[user_id]


def reset_conversation_memory(user_id: Optional[str] = None) -> None:
    """Reset conversation memory instances."""
    if user_id:
        _memory_instances.pop(user_id, None)
    else:
        _memory_instances.clear()