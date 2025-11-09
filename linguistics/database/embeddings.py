"""
Gemini embeddings wrapper for the linguistics database.

Provides text embedding functionality using Google's text-embedding-004 model
with API key validation, retry/backoff logic, and graceful degradation.
"""

import logging
import time
from typing import List, Optional

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from ..config import config


logger = logging.getLogger(__name__)


class EmbeddingError(Exception):
    """Base exception for embedding-related errors."""
    pass


class MissingAPIKeyError(EmbeddingError):
    """Raised when Gemini API key is missing or invalid."""
    pass


class EmbeddingService:
    """
    Wrapper for Gemini text embeddings with retry logic and error handling.
    
    Uses text-embedding-004 model for generating text embeddings with
    automatic retry on failures and graceful degradation when API key is missing.
    """
    
    def __init__(self, api_key: Optional[str] = None, max_retries: int = 3, backoff_factor: float = 1.0):
        """
        Initialize the embedding service.
        
        Args:
            api_key: Gemini API key. If None, uses config.GEMINI_API_KEY
            max_retries: Maximum number of retry attempts for failed requests
            backoff_factor: Exponential backoff factor for retries
        """
        self.api_key = api_key or config.GEMINI_API_KEY
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self._model = None
        self._initialized = False
        
        if self.api_key:
            self._initialize_client()
        else:
            logger.warning("No Gemini API key provided. Embedding functionality will be disabled.")
    
    def _initialize_client(self) -> None:
        """Initialize the Gemini client with safety settings."""
        try:
            genai.configure(api_key=self.api_key)
            self._model = genai.GenerativeModel(
                model_name=config.GEMINI_EMBEDDING_MODEL,
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                }
            )
            self._initialized = True
            logger.info(f"Initialized Gemini embedding model: {config.GEMINI_EMBEDDING_MODEL}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            raise MissingAPIKeyError(f"Failed to initialize Gemini client: {e}")
    
    def is_available(self) -> bool:
        """Check if embedding service is available and properly initialized."""
        return self._initialized and self.api_key is not None
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string.
        
        Args:
            text: Text to embed
            
        Returns:
            List of float values representing the text embedding
            
        Raises:
            MissingAPIKeyError: If API key is missing or invalid
            EmbeddingError: If embedding generation fails after retries
        """
        if not self.is_available():
            raise MissingAPIKeyError(
                "Gemini API key not configured. Please set GEMINI_API_KEY environment variable."
            )
        
        return self._embed_with_retry(text)
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple text strings.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embeddings, one for each input text
            
        Raises:
            MissingAPIKeyError: If API key is missing or invalid
            EmbeddingError: If embedding generation fails after retries
        """
        if not self.is_available():
            raise MissingAPIKeyError(
                "Gemini API key not configured. Please set GEMINI_API_KEY environment variable."
            )
        
        return [self._embed_with_retry(text) for text in texts]
    
    def _embed_with_retry(self, text: str) -> List[float]:
        """
        Generate embedding with retry logic and exponential backoff.
        
        Args:
            text: Text to embed
            
        Returns:
            List of float values representing the text embedding
        """
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                if attempt > 0:
                    wait_time = self.backoff_factor * (2 ** (attempt - 1))
                    logger.info(f"Retrying embedding generation (attempt {attempt + 1}) after {wait_time}s delay")
                    time.sleep(wait_time)
                
                # Use genai.embed_content for text-embedding-004
                result = genai.embed_content(
                    model=config.GEMINI_EMBEDDING_MODEL,
                    content=text,
                    task_type="retrieval_document"
                )
                
                if 'embedding' not in result:
                    raise EmbeddingError("Invalid response from Gemini: missing embedding field")
                
                embedding = result['embedding']
                if not isinstance(embedding, list):
                    raise EmbeddingError(f"Invalid embedding type: expected list, got {type(embedding)}")
                
                logger.debug(f"Successfully generated embedding of dimension {len(embedding)}")
                return embedding
                
            except Exception as e:
                last_exception = e
                logger.warning(f"Embedding generation attempt {attempt + 1} failed: {e}")
                
                # Don't retry on certain errors
                if "API key" in str(e).lower() or "permission" in str(e).lower():
                    break
        
        # All retries failed
        error_msg = f"Failed to generate embedding after {self.max_retries + 1} attempts"
        if last_exception:
            error_msg += f": {last_exception}"
        raise EmbeddingError(error_msg)
    
    def get_embedding_dimension(self) -> int:
        """
        Get the dimension of the embedding vectors.
        
        Returns:
            Integer representing the embedding dimension
            
        Raises:
            EmbeddingError: If service is not available
        """
        if not self.is_available():
            raise EmbeddingError("Embedding service is not available")
        
        # text-embedding-004 produces 768-dimensional vectors
        return config.EMBEDDING_DIMENSION


# Global embedding service instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Get or create the global embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


def reset_embedding_service() -> None:
    """Reset the global embedding service instance (useful for testing)."""
    global _embedding_service
    _embedding_service = None
