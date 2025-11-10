"""
RAG (Retrieval-Augmented Generation) module for linguistics package.

Provides retrieval capabilities to enhance AI responses with relevant
context from stored knowledge bases and documents.
"""

from .retriever import (
    RAGRetriever,
    get_rag_retriever,
    reset_rag_retriever,
)

__all__ = [
    "RAGRetriever",
    "get_rag_retriever",
    "reset_rag_retriever",
]
