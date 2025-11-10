"""
Linguistics package for the AI voice assistant.

This package provides database, RAG (Retrieval-Augmented Generation),
memory management, personas, and voice processing capabilities.
"""

from .coordinator import LinguisticsCoordinator, get_coordinator, reset_coordinator
from .config import config

__version__ = "0.1.0"

__all__ = [
    "LinguisticsCoordinator",
    "get_coordinator", 
    "reset_coordinator",
    "config",
]
