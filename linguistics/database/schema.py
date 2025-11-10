"""
Database schema definitions for the linguistics package.

Centralizes collection names, metadata schemas, and helper validators for
linguistics_book, user_conversations, and user_progress collections.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)


# Collection names
class Collections:
    """Constants for collection names in the Chroma database."""
    
    LINGUISTICS_BOOK = "linguistics_book"
    USER_CONVERSATIONS = "user_conversations"
    USER_PROGRESS = "user_progress"


# Base metadata schema
class BaseMetadata(BaseModel):
    """Base metadata schema for all collections."""
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @field_validator('updated_at', mode='before')
    @classmethod
    def update_timestamp(cls, v):
        """Always set updated_at to current time."""
        return datetime.now(timezone.utc)


# Linguistics Book Collection Schema
class LinguisticsBookMetadata(BaseMetadata):
    """Metadata schema for linguistics_book collection."""
    
    content_type: str = Field(..., description="Type of content: 'lesson', 'exercise', 'example', etc.")
    difficulty_level: str = Field(..., description="Difficulty level: 'beginner', 'intermediate', 'advanced'")
    language: str = Field(default="en", description="Language code (ISO 639-1)")
    topic: str = Field(..., description="Topic or category (e.g., 'grammar', 'vocabulary', 'pronunciation')")
    subtopic: Optional[str] = Field(None, description="More specific topic within the main topic")
    tags: List[str] = Field(default_factory=list, description="Tags for categorization and search")
    author: Optional[str] = Field(None, description="Author or source of the content")
    version: str = Field(default="1.0", description="Version of the content")
    
    @field_validator('content_type')
    @classmethod
    def validate_content_type(cls, v):
        """Validate content_type is one of the allowed values."""
        allowed_types = ['lesson', 'exercise', 'example', 'explanation', 'dialogue', 'story']
        if v not in allowed_types:
            raise ValueError(f"content_type must be one of {allowed_types}")
        return v
    
    @field_validator('difficulty_level')
    @classmethod
    def validate_difficulty_level(cls, v):
        """Validate difficulty_level is one of the allowed values."""
        allowed_levels = ['beginner', 'intermediate', 'advanced']
        if v not in allowed_levels:
            raise ValueError(f"difficulty_level must be one of {allowed_levels}")
        return v
    
    @field_validator('language')
    @classmethod
    def validate_language(cls, v):
        """Validate language is a 2-letter ISO code."""
        if len(v) != 2:
            raise ValueError("language must be a 2-letter ISO 639-1 code")
        return v.lower()


# User Conversations Collection Schema
class UserConversationMetadata(BaseMetadata):
    """Metadata schema for user_conversations collection."""
    
    user_id: str = Field(..., description="Unique identifier for the user")
    session_id: str = Field(..., description="Unique identifier for the conversation session")
    persona_id: Optional[str] = Field(None, description="ID of the persona used in the conversation")
    language: str = Field(default="en", description="Language code (ISO 639-1)")
    conversation_type: str = Field(default="chat", description="Type: 'chat', 'lesson', 'exercise'")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context information")
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")
    
    @field_validator('language')
    @classmethod
    def validate_language(cls, v):
        """Validate language is a 2-letter ISO code."""
        if len(v) != 2:
            raise ValueError("language must be a 2-letter ISO 639-1 code")
        return v.lower()
    
    @field_validator('conversation_type')
    @classmethod
    def validate_conversation_type(cls, v):
        """Validate conversation_type is one of the allowed values."""
        allowed_types = ['chat', 'lesson', 'exercise', 'assessment', 'practice']
        if v not in allowed_types:
            raise ValueError(f"conversation_type must be one of {allowed_types}")
        return v


# User Progress Collection Schema
class UserProgressMetadata(BaseMetadata):
    """Metadata schema for user_progress collection."""
    
    user_id: str = Field(..., description="Unique identifier for the user")
    language: str = Field(..., description="Language code (ISO 639-1)")
    skill_type: str = Field(..., description="Type of skill: 'vocabulary', 'grammar', 'pronunciation', etc.")
    skill_level: str = Field(..., description="Current level: 'beginner', 'intermediate', 'advanced'")
    progress_score: float = Field(..., ge=0.0, le=1.0, description="Progress score between 0 and 1")
    mastery_level: float = Field(..., ge=0.0, le=1.0, description="Mastery level between 0 and 1")
    last_practiced: datetime = Field(default_factory=datetime.utcnow, description="Last practice timestamp")
    practice_count: int = Field(default=0, ge=0, description="Number of practice sessions")
    difficulty_preference: str = Field(default="adaptive", description="Difficulty preference")
    
    @field_validator('language')
    @classmethod
    def validate_language(cls, v):
        """Validate language is a 2-letter ISO code."""
        if len(v) != 2:
            raise ValueError("language must be a 2-letter ISO 639-1 code")
        return v.lower()
    
    @field_validator('skill_type')
    @classmethod
    def validate_skill_type(cls, v):
        """Validate skill_type is one of the allowed values."""
        allowed_types = ['vocabulary', 'grammar', 'pronunciation', 'listening', 'speaking', 'reading', 'writing']
        if v not in allowed_types:
            raise ValueError(f"skill_type must be one of {allowed_types}")
        return v
    
    @field_validator('skill_level')
    @classmethod
    def validate_skill_level(cls, v):
        """Validate skill_level is one of the allowed values."""
        allowed_levels = ['beginner', 'intermediate', 'advanced']
        if v not in allowed_levels:
            raise ValueError(f"skill_level must be one of {allowed_levels}")
        return v
    
    @field_validator('difficulty_preference')
    @classmethod
    def validate_difficulty_preference(cls, v):
        """Validate difficulty_preference is one of the allowed values."""
        allowed_preferences = ['adaptive', 'easy', 'medium', 'hard']
        if v not in allowed_preferences:
            raise ValueError(f"difficulty_preference must be one of {allowed_preferences}")
        return v


# Schema validator functions
def validate_linguistics_book_metadata(metadata: Dict[str, Any]) -> LinguisticsBookMetadata:
    """
    Validate and convert metadata for linguistics_book collection.
    
    Args:
        metadata: Raw metadata dictionary
        
    Returns:
        Validated LinguisticsBookMetadata object
        
    Raises:
        ValidationError: If metadata is invalid
    """
    return LinguisticsBookMetadata(**metadata)


def validate_user_conversation_metadata(metadata: Dict[str, Any]) -> UserConversationMetadata:
    """
    Validate and convert metadata for user_conversations collection.
    
    Args:
        metadata: Raw metadata dictionary
        
    Returns:
        Validated UserConversationMetadata object
        
    Raises:
        ValidationError: If metadata is invalid
    """
    return UserConversationMetadata(**metadata)


def validate_user_progress_metadata(metadata: Dict[str, Any]) -> UserProgressMetadata:
    """
    Validate and convert metadata for user_progress collection.
    
    Args:
        metadata: Raw metadata dictionary
        
    Returns:
        Validated UserProgressMetadata object
        
    Raises:
        ValidationError: If metadata is invalid
    """
    return UserProgressMetadata(**metadata)


# Collection schema registry
COLLECTION_SCHEMAS = {
    Collections.LINGUISTICS_BOOK: validate_linguistics_book_metadata,
    Collections.USER_CONVERSATIONS: validate_user_conversation_metadata,
    Collections.USER_PROGRESS: validate_user_progress_metadata,
}


def validate_collection_metadata(collection_name: str, metadata: Dict[str, Any]) -> BaseModel:
    """
    Validate metadata for a specific collection.
    
    Args:
        collection_name: Name of the collection
        metadata: Raw metadata dictionary
        
    Returns:
        Validated metadata object
        
    Raises:
        ValueError: If collection name is not recognized
        ValidationError: If metadata is invalid
    """
    if collection_name not in COLLECTION_SCHEMAS:
        raise ValueError(f"Unknown collection: {collection_name}")
    
    validator = COLLECTION_SCHEMAS[collection_name]
    return validator(metadata)


def get_collection_schema(collection_name: str) -> type[BaseModel]:
    """
    Get the schema class for a specific collection.
    
    Args:
        collection_name: Name of the collection
        
    Returns:
        Schema class for the collection
        
    Raises:
        ValueError: If collection name is not recognized
    """
    schema_map = {
        Collections.LINGUISTICS_BOOK: LinguisticsBookMetadata,
        Collections.USER_CONVERSATIONS: UserConversationMetadata,
        Collections.USER_PROGRESS: UserProgressMetadata,
    }
    
    if collection_name not in schema_map:
        raise ValueError(f"Unknown collection: {collection_name}")
    
    return schema_map[collection_name]


# Helper functions for metadata creation
def create_linguistics_book_metadata(
    content_type: str,
    difficulty_level: str,
    topic: str,
    language: str = "en",
    **kwargs
) -> Dict[str, Any]:
    """Create metadata for linguistics_book collection with validation."""
    metadata = {
        "content_type": content_type,
        "difficulty_level": difficulty_level,
        "topic": topic,
        "language": language,
        **kwargs
    }
    return validate_linguistics_book_metadata(metadata).model_dump()


def create_user_conversation_metadata(
    user_id: str,
    session_id: str,
    language: str = "en",
    **kwargs
) -> Dict[str, Any]:
    """Create metadata for user_conversations collection with validation."""
    metadata = {
        "user_id": user_id,
        "session_id": session_id,
        "language": language,
        **kwargs
    }
    return validate_user_conversation_metadata(metadata).model_dump()


def create_user_progress_metadata(
    user_id: str,
    language: str,
    skill_type: str,
    skill_level: str,
    progress_score: float,
    mastery_level: float,
    **kwargs
) -> Dict[str, Any]:
    """Create metadata for user_progress collection with validation."""
    metadata = {
        "user_id": user_id,
        "language": language,
        "skill_type": skill_type,
        "skill_level": skill_level,
        "progress_score": progress_score,
        "mastery_level": mastery_level,
        **kwargs
    }
    return validate_user_progress_metadata(metadata).model_dump()
