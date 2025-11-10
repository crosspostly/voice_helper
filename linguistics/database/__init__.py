"""
Database module for linguistics package.

Provides database connectivity and management for storing and retrieving
linguistic data, conversations, and user interactions.
"""

from .chroma_client import LinguisticsDB, get_database, reset_database
from .embeddings import EmbeddingService, get_embedding_service, reset_embedding_service
from .schema import (
    Collections,
    LinguisticsBookMetadata,
    UserConversationMetadata,
    UserProgressMetadata,
    validate_collection_metadata,
    create_linguistics_book_metadata,
    create_user_conversation_metadata,
    create_user_progress_metadata,
)

__all__ = [
    # Main client
    "LinguisticsDB",
    "get_database",
    "reset_database",
    
    # Embeddings
    "EmbeddingService",
    "get_embedding_service",
    "reset_embedding_service",
    
    # Schema
    "Collections",
    "LinguisticsBookMetadata",
    "UserConversationMetadata",
    "UserProgressMetadata",
    "validate_collection_metadata",
    "create_linguistics_book_metadata",
    "create_user_conversation_metadata",
    "create_user_progress_metadata",
]
