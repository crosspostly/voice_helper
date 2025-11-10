"""
RAG (Retrieval-Augmented Generation) module for linguistics package.

Provides retrieval capabilities to enhance AI responses with relevant
context from stored knowledge bases and documents.
"""

from .retriever import BookRetriever, RetrievalResult
from .generator import ResponseGenerator, GenerationResult

__all__ = [
    "BookRetriever",
    "RetrievalResult", 
    "ResponseGenerator",
    "GenerationResult"
]
