"""
RAG (Retrieval-Augmented Generation) module for linguistics package.

Provides retrieval capabilities to enhance AI responses with relevant
context from stored knowledge bases and documents.
"""
from .rag_service import RAGService

__all__ = ["RAGService"]
=======
# Skip retriever import for setup script to avoid dependency issues
try:
    from .retriever import (
        RAGRetriever,
        get_rag_retriever,
        reset_rag_retriever,
    )
    _retriever_available = True
except ImportError:
    _retriever_available = False
    RAGRetriever = None
    get_rag_retriever = None
    reset_rag_retriever = None

__all__ = []

if _retriever_available:
    __all__.extend([
        "RAGRetriever",
        "get_rag_retriever",
        "reset_rag_retriever",
    ])