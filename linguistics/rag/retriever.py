"""
Retrieval-Augmented Generation (RAG) for linguistics package.

Implements RAG to enhance AI responses with relevant context from
the knowledge base using vector similarity search.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import google.generativeai as genai

from ..database import get_database, get_embedding_service
from ..config import config

logger = logging.getLogger(__name__)


class RAGRetriever:
    """Retrieves relevant context using RAG from the knowledge base."""
    
    def __init__(self):
        """Initialize RAG retriever."""
        self.db = get_database()
        self.embedding_service = get_embedding_service()
        self.max_results = config.MAX_RETRIEVAL_RESULTS
        self.similarity_threshold = config.SIMILARITY_THRESHOLD
    
    async def retrieve_context(
        self,
        query: str,
        collection_name: str = "linguistics_book",
        filters: Optional[Dict[str, Any]] = None,
        max_results: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant context for a query."""
        try:
            # Generate embedding for the query
            query_embedding = await self.embedding_service.embed_text(query)
            
            # Search in the specified collection
            results = self.db.query(
                collection_name=collection_name,
                query_embeddings=[query_embedding],
                n_results=max_results or self.max_results,
                where=filters,
                include=["documents", "metadatas", "distances"]
            )
            
            # Filter results by similarity threshold
            filtered_results = []
            if results and results.get("documents") and results["documents"][0]:
                for i, (doc, metadata, distance) in enumerate(zip(
                    results["documents"][0],
                    results["metadatas"][0], 
                    results["distances"][0]
                )):
                    # Convert distance to similarity score (lower distance = higher similarity)
                    similarity = 1.0 - distance
                    
                    if similarity >= self.similarity_threshold:
                        filtered_results.append({
                            "content": doc,
                            "metadata": metadata,
                            "similarity_score": similarity,
                            "distance": distance
                        })
            
            logger.debug(f"Retrieved {len(filtered_results)} relevant contexts for query")
            return filtered_results
            
        except Exception as e:
            logger.error(f"Failed to retrieve context: {e}")
            return []
    
    async def retrieve_educational_content(
        self,
        topic: str,
        difficulty_level: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve educational content for a specific topic."""
        filters = {"topic": topic}
        
        if difficulty_level:
            filters["difficulty_level"] = difficulty_level
        
        if content_type:
            filters["content_type"] = content_type
        
        return await self.retrieve_context(
            query=f"educational content about {topic}",
            filters=filters
        )
    
    async def retrieve_explanations(
        self,
        concept: str,
        context: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve explanations for linguistic concepts."""
        query = f"explanation of {concept}"
        if context:
            query += f" in context of {context}"
        
        filters = {"content_type": "explanation"}
        
        return await self.retrieve_context(
            query=query,
            filters=filters
        )
    
    async def retrieve_examples(
        self,
        pattern: str,
        language: Optional[str] = "en"
    ) -> List[Dict[str, Any]]:
        """Retrieve examples for linguistic patterns."""
        filters = {
            "content_type": "example",
            "language": language
        }
        
        return await self.retrieve_context(
            query=f"examples of {pattern}",
            filters=filters
        )
    
    def format_context_for_response(
        self,
        contexts: List[Dict[str, Any]],
        max_context_length: int = 2000
    ) -> str:
        """Format retrieved contexts for inclusion in AI responses."""
        if not contexts:
            return ""
        
        # Sort by relevance (similarity score)
        sorted_contexts = sorted(contexts, key=lambda x: x["similarity_score"], reverse=True)
        
        formatted_parts = []
        current_length = 0
        
        for context in sorted_contexts:
            content = context["content"]
            metadata = context["metadata"]
            
            # Create a formatted context snippet
            source_info = []
            if metadata.get("topic"):
                source_info.append(f"Topic: {metadata['topic']}")
            if metadata.get("difficulty_level"):
                source_info.append(f"Level: {metadata['difficulty_level']}")
            if metadata.get("content_type"):
                source_info.append(f"Type: {metadata['content_type']}")
            
            source_str = " | ".join(source_info) if source_info else "Source"
            formatted_context = f"[{source_str}]\n{content}"
            
            # Check length limit
            if current_length + len(formatted_context) > max_context_length:
                break
            
            formatted_parts.append(formatted_context)
            current_length += len(formatted_context)
        
        return "\n\n".join(formatted_parts)


# Global RAG retriever instance
_rag_retriever: Optional[RAGRetriever] = None


def get_rag_retriever() -> RAGRetriever:
    """Get the global RAG retriever instance."""
    global _rag_retriever
    if _rag_retriever is None:
        _rag_retriever = RAGRetriever()
    return _rag_retriever


def reset_rag_retriever() -> None:
    """Reset the global RAG retriever instance."""
    global _rag_retriever
    _rag_retriever = None