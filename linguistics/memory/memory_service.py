"""
Memory service for linguistics package.

Provides memory management capabilities for storing, retrieving,
and managing conversation history and contextual information.
"""

from typing import Dict, List, Optional, Any
import logging


logger = logging.getLogger(__name__)


class MemoryService:
    """Service for managing conversation memory and context."""
    
    def __init__(self, storage_path: Optional[str] = None):
        """
        Initialize the memory service.
        
        Args:
            storage_path: Optional path for persistent storage
        """
        self.storage_path = storage_path
        self.conversations: Dict[str, Dict[str, Any]] = {}
        
    async def get_conversation_context(self, conversation_id: str) -> Dict[str, Any]:
        """
        Get conversation context for a given conversation ID.
        
        Args:
            conversation_id: Unique identifier for the conversation
            
        Returns:
            Dictionary containing conversation context
        """
        if conversation_id not in self.conversations:
            return {}
        
        return self.conversations[conversation_id].get("context", {})
    
    async def store_conversation_context(
        self, 
        conversation_id: str, 
        context: Dict[str, Any]
    ) -> None:
        """
        Store conversation context for a given conversation ID.
        
        Args:
            conversation_id: Unique identifier for the conversation
            context: Context data to store
        """
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = {}
        
        self.conversations[conversation_id]["context"] = context
    
    async def get_conversation_history(
        self, 
        conversation_id: str, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get conversation history for a given conversation ID.
        
        Args:
            conversation_id: Unique identifier for the conversation
            limit: Maximum number of messages to retrieve
            
        Returns:
            List of conversation messages
        """
        if conversation_id not in self.conversations:
            return []
        
        history = self.conversations[conversation_id].get("history", [])
        return history[-limit:] if limit > 0 else history
    
    async def add_conversation_message(
        self, 
        conversation_id: str, 
        message: Dict[str, Any]
    ) -> None:
        """
        Add a message to the conversation history.
        
        Args:
            conversation_id: Unique identifier for the conversation
            message: Message data to add
        """
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = {"history": [], "context": {}}
        
        self.conversations[conversation_id]["history"].append(message)
    
    async def clear_conversation(self, conversation_id: str) -> None:
        """
        Clear conversation data for a given conversation ID.
        
        Args:
            conversation_id: Unique identifier for the conversation
        """
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
    
    async def search_conversations(
        self, 
        query: str, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search through stored conversations.
        
        Args:
            query: Search query
            limit: Maximum number of results to return
            
        Returns:
            List of matching conversation segments
        """
        results = []
        query_lower = query.lower()
        
        for conversation_id, conversation_data in self.conversations.items():
            history = conversation_data.get("history", [])
            
            for message in history:
                if "content" in message and query_lower in message["content"].lower():
                    results.append({
                        "conversation_id": conversation_id,
                        "message": message
                    })
                    
                    if len(results) >= limit:
                        return results
        
        return results