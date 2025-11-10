"""
Response Generator for RAG pipeline.

Provides ResponseGenerator class that assembles prompts from persona
instructions, retrieved context, and conversation history, then invokes
Gemini to generate responses with graceful fallbacks.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Union

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from ..config import config
from .retriever import RetrievalResult

logger = logging.getLogger(__name__)


class GenerationResult:
    """Represents the result of response generation."""
    
    def __init__(
        self,
        content: str,
        sources: List[Dict[str, Any]],
        model_used: str,
        fallback_used: bool = False,
        generation_time: float = 0.0,
        token_count: Optional[int] = None,
        error: Optional[str] = None
    ):
        self.content = content
        self.sources = sources
        self.model_used = model_used
        self.fallback_used = fallback_used
        self.generation_time = generation_time
        self.token_count = token_count
        self.error = error
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "content": self.content,
            "sources": self.sources,
            "model_used": self.model_used,
            "fallback_used": self.fallback_used,
            "generation_time": self.generation_time,
            "token_count": self.token_count,
            "error": self.error
        }


class ResponseGenerator:
    """
    Generates responses using Gemini with RAG context.
    
    Assembles prompts from persona instructions, retrieved context,
    and conversation history, with graceful fallbacks when model calls fail.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.7,
        timeout: float = 30.0,
        enable_fallbacks: bool = True
    ):
        """
        Initialize ResponseGenerator.
        
        Args:
            api_key: Gemini API key (uses config if None)
            model_name: Gemini model name (uses config if None)
            max_tokens: Maximum tokens in response
            temperature: Generation temperature (0.0-1.0)
            timeout: Request timeout in seconds
            enable_fallbacks: Whether to use fallback responses
        """
        self.api_key = api_key or config.GEMINI_API_KEY
        self.model_name = model_name or config.GEMINI_MODEL_NAME
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.timeout = timeout
        self.enable_fallbacks = enable_fallbacks
        
        # Configure Gemini
        if self.api_key:
            genai.configure(api_key=self.api_key)
        
        # Initialize model
        self.model = None
        self._initialize_model()
        
        # Fallback templates
        self.fallback_templates = {
            "error": "I apologize, but I'm having trouble generating a response right now. Please try again later.",
            "timeout": "I'm taking longer than expected to respond. Please try your question again.",
            "no_context": "I don't have specific information about that topic in my knowledge base. Could you try asking in a different way?",
            "general": "I'm here to help with language learning. Could you please clarify your question?"
        }
    
    def _initialize_model(self) -> None:
        """Initialize the Gemini model with safety settings."""
        try:
            generation_config = {
                "temperature": self.temperature,
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": self.max_tokens,
            }
            
            safety_settings = {
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
            
            self.model = genai.GenerativeModel(
                model_name=self.model_name,
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            logger.info(f"Initialized Gemini model: {self.model_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model: {e}")
            self.model = None
    
    def generate_response(
        self,
        query: str,
        context: Optional[List[RetrievalResult]] = None,
        persona_instructions: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        max_context_items: int = 5
    ) -> GenerationResult:
        """
        Generate a response using RAG context.
        
        Args:
            query: User's query/question
            context: Retrieved context documents
            persona_instructions: Persona-specific instructions
            conversation_history: Previous conversation messages
            max_context_items: Maximum number of context items to include
            
        Returns:
            GenerationResult with response and metadata
        """
        start_time = time.time()
        
        try:
            # Build prompt
            prompt = self._build_prompt(
                query=query,
                context=context,
                persona_instructions=persona_instructions,
                conversation_history=conversation_history,
                max_context_items=max_context_items
            )
            
            # Generate response
            if self.model:
                response = self._generate_with_gemini(prompt)
                generation_time = time.time() - start_time
                
                sources = self._extract_sources(context) if context else []
                
                return GenerationResult(
                    content=response,
                    sources=sources,
                    model_used=self.model_name,
                    fallback_used=False,
                    generation_time=generation_time
                )
            else:
                # Model not available
                if self.enable_fallbacks:
                    fallback_response = self._get_fallback_response("error")
                    generation_time = time.time() - start_time
                    
                    return GenerationResult(
                        content=fallback_response,
                        sources=[],
                        model_used="fallback",
                        fallback_used=True,
                        generation_time=generation_time,
                        error="Model not initialized"
                    )
                else:
                    generation_time = time.time() - start_time
                    
                    return GenerationResult(
                        content="",
                        sources=[],
                        model_used=self.model_name,
                        fallback_used=False,
                        generation_time=generation_time,
                        error="Model not initialized and fallbacks disabled"
                    )
        
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            generation_time = time.time() - start_time
            
            if self.enable_fallbacks:
                fallback_response = self._get_fallback_response("error")
                return GenerationResult(
                    content=fallback_response,
                    sources=[],
                    model_used="fallback",
                    fallback_used=True,
                    generation_time=generation_time,
                    error=str(e)
                )
            else:
                return GenerationResult(
                    content="",
                    sources=[],
                    model_used=self.model_name,
                    fallback_used=False,
                    generation_time=generation_time,
                    error=str(e)
                )
    
    def _generate_with_gemini(self, prompt: str) -> str:
        """
        Generate response using Gemini model.
        
        Args:
            prompt: Complete prompt to send to Gemini
            
        Returns:
            Generated response text
            
        Raises:
            Exception: If generation fails
        """
        try:
            # Start chat session
            chat = self.model.start_chat(history=[])
            
            # Send message with timeout
            response = chat.send_message(
                prompt,
                stream=False
            )
            
            # Extract and return text
            if response.text:
                return response.text.strip()
            else:
                raise ValueError("Empty response from Gemini")
        
        except Exception as e:
            # Handle specific error types
            if "timeout" in str(e).lower():
                raise TimeoutError(f"Gemini request timeout: {e}")
            elif "quota" in str(e).lower() or "rate" in str(e).lower():
                raise Exception(f"Rate limit exceeded: {e}")
            else:
                raise Exception(f"Gemini generation failed: {e}")
    
    def _build_prompt(
        self,
        query: str,
        context: Optional[List[RetrievalResult]],
        persona_instructions: Optional[str],
        conversation_history: Optional[List[Dict[str, str]]],
        max_context_items: int
    ) -> str:
        """
        Build complete prompt from all components.
        
        Args:
            query: User's query
            context: Retrieved context documents
            persona_instructions: Persona-specific instructions
            conversation_history: Previous conversation
            max_context_items: Maximum context items to include
            
        Returns:
            Complete prompt string
        """
        prompt_parts = []
        
        # Add persona instructions
        if persona_instructions:
            prompt_parts.append(f"PERSONA INSTRUCTIONS:\n{persona_instructions}\n")
        
        # Add context
        if context:
            context_text = self._format_context(context[:max_context_items])
            prompt_parts.append(f"CONTEXT INFORMATION:\n{context_text}\n")
        
        # Add conversation history
        if conversation_history:
            history_text = self._format_conversation_history(conversation_history[-5:])  # Last 5 messages
            prompt_parts.append(f"CONVERSATION HISTORY:\n{history_text}\n")
        
        # Add current query
        prompt_parts.append(f"USER QUESTION:\n{query}\n")
        
        # Add response instructions
        prompt_parts.append("""RESPONSE GUIDELINES:
1. Provide a helpful, accurate response based on the context information
2. If the context doesn't contain relevant information, acknowledge this
3. Be conversational and natural in your response
4. Reference specific sources when appropriate
5. Keep responses concise but comprehensive
6. Follow the persona instructions provided above

Please provide your response:""")
        
        return "\n".join(prompt_parts)
    
    def _format_context(self, context: List[RetrievalResult]) -> str:
        """
        Format context documents for the prompt.
        
        Args:
            context: List of RetrievalResult objects
            
        Returns:
            Formatted context string
        """
        if not context:
            return "No specific context information available."
        
        context_parts = []
        for i, result in enumerate(context, 1):
            metadata = result.metadata
            source_info = []
            
            # Add source metadata
            if metadata.get("content_type"):
                source_info.append(f"Type: {metadata['content_type']}")
            if metadata.get("difficulty_level"):
                source_info.append(f"Level: {metadata['difficulty_level']}")
            if metadata.get("topic"):
                source_info.append(f"Topic: {metadata['topic']}")
            if metadata.get("subtopic"):
                source_info.append(f"Subtopic: {metadata['subtopic']}")
            
            source_line = f"Source {i} [{', '.join(source_info)}]:"
            context_parts.append(source_line)
            context_parts.append(result.content)
        
        return "\n".join(context_parts)
    
    def _format_conversation_history(self, history: List[Dict[str, str]]) -> str:
        """
        Format conversation history for the prompt.
        
        Args:
            history: List of conversation messages
            
        Returns:
            Formatted history string
        """
        if not history:
            return "No previous conversation."
        
        history_parts = []
        for message in history:
            role = message.get("role", "unknown").upper()
            content = message.get("content", "")
            history_parts.append(f"{role}: {content}")
        
        return "\n".join(history_parts)
    
    def _extract_sources(self, context: List[RetrievalResult]) -> List[Dict[str, Any]]:
        """
        Extract source information from context.
        
        Args:
            context: List of RetrievalResult objects
            
        Returns:
            List of source dictionaries
        """
        sources = []
        for result in context:
            source = {
                "id": result.id,
                "metadata": result.metadata,
                "similarity_score": result.similarity_score,
                "normalized_score": result.normalized_score
            }
            sources.append(source)
        
        return sources
    
    def _get_fallback_response(self, fallback_type: str) -> str:
        """
        Get fallback response based on type.
        
        Args:
            fallback_type: Type of fallback needed
            
        Returns:
            Fallback response string
        """
        return self.fallback_templates.get(
            fallback_type, 
            self.fallback_templates["general"]
        )
    
    def set_fallback_template(self, fallback_type: str, template: str) -> None:
        """
        Set a custom fallback template.
        
        Args:
            fallback_type: Type of fallback
            template: Template string
        """
        self.fallback_templates[fallback_type] = template
    
    def test_connection(self) -> bool:
        """
        Test connection to Gemini API.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            if not self.model:
                return False
            
            # Simple test prompt
            response = self.model.generate_content("Test")
            return bool(response.text)
        
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the current model configuration.
        
        Returns:
            Dictionary with model information
        """
        return {
            "model_name": self.model_name,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "timeout": self.timeout,
            "fallbacks_enabled": self.enable_fallbacks,
            "model_initialized": self.model is not None,
            "api_configured": bool(self.api_key)
        }