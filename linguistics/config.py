"""
Configuration settings for the linguistics package.

Centralizes all configuration parameters including model names,
embedding settings, and persistence paths.
"""

import os
from pathlib import Path
from typing import Optional


class LinguisticsConfig:
    """Configuration class for linguistics package settings."""
    
    # Gemini AI Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL_NAME: str = os.getenv(
        "GEMINI_MODEL_NAME", 
        "gemini-1.5-pro"
    )
    GEMINI_EMBEDDING_MODEL: str = os.getenv(
        "GEMINI_EMBEDDING_MODEL", 
        "text-embedding-004"
    )
    
    # Database Configuration
    CHROMA_DB_PATH: Path = Path(
        os.getenv("CHROMA_DB_PATH", "data/chroma_db")
    )
    
    # Persistence Paths
    DATA_DIR: Path = Path(
        os.getenv("LINGUISTICS_DATA_DIR", "data")
    )
    PERSONAS_DIR: Path = DATA_DIR / "personas"
    MEMORY_DIR: Path = DATA_DIR / "memory"
    TRANSCRIPTS_DIR: Path = DATA_DIR / "transcripts"
    
    # RAG Configuration
    EMBEDDING_DIMENSION: int = int(
        os.getenv("EMBEDDING_DIMENSION", "768")
    )
    MAX_RETRIEVAL_RESULTS: int = int(
        os.getenv("MAX_RETRIEVAL_RESULTS", "5")
    )
    SIMILARITY_THRESHOLD: float = float(
        os.getenv("SIMILARITY_THRESHOLD", "0.7")
    )
    
    # Voice Configuration
    TTS_MODEL: str = os.getenv(
        "TTS_MODEL", 
        "gemini-tts-v1"
    )
    AUDIO_SAMPLE_RATE: int = int(
        os.getenv("AUDIO_SAMPLE_RATE", "16000")
    )
    AUDIO_CHANNELS: int = int(
        os.getenv("AUDIO_CHANNELS", "1")
    )
    
    # Application Configuration
    DEBUG_MODE: bool = os.getenv("LINGUISTICS_DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv(
        "LINGUISTICS_LOG_LEVEL", 
        "INFO"
    )
    
    @classmethod
    def ensure_directories(cls) -> None:
        """Create necessary directories if they don't exist."""
        directories = [
            cls.DATA_DIR,
            cls.CHROMA_DB_PATH,
            cls.PERSONAS_DIR,
            cls.MEMORY_DIR,
            cls.TRANSCRIPTS_DIR,
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    @classmethod
    def validate_config(cls) -> list[str]:
        """Validate configuration and return list of missing required settings."""
        errors = []
        
        if not cls.GEMINI_API_KEY:
            errors.append("GEMINI_API_KEY is required")
        
        return errors


# Global configuration instance
config = LinguisticsConfig()
