"""
Base persona class for linguistics package.

Provides the foundation for all expert personas with common functionality
including prompt management, response processing, and service integration.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
import logging

from ..memory import MemoryService
from ..rag import RAGService


logger = logging.getLogger(__name__)


class BasePersona(ABC):
    """Base class for all expert personas in the linguistics system."""
    
    def __init__(
        self,
        name: str,
        description: str,
        routing_keywords: List[str],
        memory_service: Optional[MemoryService] = None,
        rag_service: Optional[RAGService] = None,
    ):
        """
        Initialize the base persona.
        
        Args:
            name: The persona's name
            description: Brief description of the persona's expertise
            routing_keywords: Keywords that trigger routing to this persona
            memory_service: Optional memory service for context management
            rag_service: Optional RAG service for knowledge retrieval
        """
        self.name = name
        self.description = description
        self.routing_keywords = [kw.lower() for kw in routing_keywords]
        self.memory_service = memory_service
        self.rag_service = rag_service
        
    @abstractmethod
    def get_system_prompt(self) -> str:
        """
        Get the system prompt for this persona.
        
        Returns:
            The system prompt string
        """
        pass
    
    @abstractmethod
    def get_expertise_areas(self) -> List[str]:
        """
        Get the areas of expertise for this persona.
        
        Returns:
            List of expertise area strings
        """
        pass
    
    def should_handle_intent(self, user_input: str, confidence_threshold: float = 0.7) -> bool:
        """
        Determine if this persona should handle the given user input.
        
        Args:
            user_input: The user's input text
            confidence_threshold: Minimum confidence score to handle the input
            
        Returns:
            True if this persona should handle the input
        """
        user_input_lower = user_input.lower()
        
        # Simple keyword matching - can be enhanced with semantic similarity
        keyword_matches = sum(1 for keyword in self.routing_keywords if keyword in user_input_lower)
        confidence = keyword_matches / len(self.routing_keywords) if self.routing_keywords else 0
        
        return confidence >= confidence_threshold
    
    def preprocess_input(self, user_input: str, context: Dict[str, Any]) -> str:
        """
        Preprocess user input before sending to the AI model.
        
        Args:
            user_input: Raw user input
            context: Additional context including conversation history
            
        Returns:
            Preprocessed input string
        """
        # Default implementation - can be overridden by subclasses
        return user_input
    
    def postprocess_response(self, response: str, context: Dict[str, Any]) -> str:
        """
        Postprocess the AI model's response.
        
        Args:
            response: Raw response from the AI model
            context: Additional context including original input
            
        Returns:
            Postprocessed response string
        """
        # Default implementation - can be overridden by subclasses
        return response
    
    async def get_relevant_context(self, user_input: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Gather relevant context from memory and RAG services.
        
        Args:
            user_input: The user's input
            conversation_id: Optional conversation identifier
            
        Returns:
            Dictionary containing relevant context
        """
        context = {}
        
        # Get conversation history from memory service if available
        if self.memory_service and conversation_id:
            try:
                memory_context = await self.memory_service.get_conversation_context(conversation_id)
                context["memory"] = memory_context
            except Exception as e:
                logger.warning(f"Failed to get memory context: {e}")
        
        # Get relevant documents from RAG service if available
        if self.rag_service:
            try:
                rag_context = await self.rag_service.retrieve_relevant_content(
                    query=user_input,
                    expertise_areas=self.get_expertise_areas(),
                    max_results=3
                )
                context["rag"] = rag_context
            except Exception as e:
                logger.warning(f"Failed to get RAG context: {e}")
        
        return context
    
    def get_persona_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about this persona.
        
        Returns:
            Dictionary containing persona metadata
        """
        return {
            "name": self.name,
            "description": self.description,
            "routing_keywords": self.routing_keywords,
            "expertise_areas": self.get_expertise_areas(),
            "system_prompt": self.get_system_prompt(),
        }