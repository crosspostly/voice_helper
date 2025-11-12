"""
Database module for linguistics package.

Provides database connectivity and management for storing and retrieving
linguistic data, conversations, and user interactions.
"""

# Skip imports that require google for setup script
try:
    from .chroma_client import LinguisticsDB, get_database, reset_database
    _chroma_available = True
except ImportError:
    _chroma_available = False
    LinguisticsDB = None
    get_database = None
    reset_database = None

try:
    from .embeddings import EmbeddingService, get_embedding_service, reset_embedding_service
    _embeddings_available = True
except ImportError:
    _embeddings_available = False
    EmbeddingService = None
    get_embedding_service = None
    reset_embedding_service = None

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

if _chroma_available:
    __all__.extend([
        "LinguisticsDB",
        "get_database",
        "reset_database",
    ])

if _embeddings_available:
    __all__.extend([
        "EmbeddingService",
        "get_embedding_service",
        "reset_embedding_service",
    ])
