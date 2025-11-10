"""
Linguistics package for the AI voice assistant.

This package provides database, RAG (Retrieval-Augmented Generation),
memory management, personas, and voice processing capabilities.
"""

# Skip coordinator import for setup script to avoid dependency issues
try:
    from .coordinator import LinguisticsCoordinator, get_coordinator, reset_coordinator
    _coordinator_available = True
except ImportError:
    _coordinator_available = False
    LinguisticsCoordinator = None
    get_coordinator = None
    reset_coordinator = None

from .config import config

__version__ = "0.1.0"

__all__ = [
    "config",
]

if _coordinator_available:
    __all__.extend([
        "LinguisticsCoordinator",
        "get_coordinator", 
        "reset_coordinator",
    ])
