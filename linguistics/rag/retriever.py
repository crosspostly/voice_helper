"""
Book Retriever for semantic search against linguistics_book collection.

Provides BookRetriever class supporting semantic search with filters,
score normalization, and bulk retrieval for lesson planning.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple, Union

from ..database.chroma_client import LinguisticsDB
from ..database.embeddings import EmbeddingService
from ..database.schema import Collections, LinguisticsBookMetadata
from ..config import config

logger = logging.getLogger(__name__)


class RetrievalResult:
    """Represents a single retrieval result with normalized score."""
    
    def __init__(
        self,
        id: str,
        content: str,
        metadata: Dict[str, Any],
        similarity_score: float,
        normalized_score: Optional[float] = None
    ):
        self.id = id
        self.content = content
        self.metadata = metadata
        self.similarity_score = similarity_score
        self.normalized_score = normalized_score or similarity_score
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "content": self.content,
            "metadata": self.metadata,
            "similarity_score": self.similarity_score,
            "normalized_score": self.normalized_score
        }


class BookRetriever:
    """
    Semantic search retriever for linguistics_book collection.
    
    Supports filtering by chapter, level, content type, and other metadata
    fields, with score normalization and bulk retrieval capabilities.
    """
    
    def __init__(
        self,
        db: Optional[LinguisticsDB] = None,
        embedding_service: Optional[EmbeddingService] = None,
        similarity_threshold: float = config.SIMILARITY_THRESHOLD,
        max_results: int = config.MAX_RETRIEVAL_RESULTS
    ):
        """
        Initialize BookRetriever.
        
        Args:
            db: LinguisticsDB instance (creates default if None)
            embedding_service: EmbeddingService instance (creates default if None)
            similarity_threshold: Minimum similarity score for results
            max_results: Maximum number of results to return
        """
        self.db = db or LinguisticsDB()
        self.embedding_service = embedding_service or self.db.embedding_service
        self.similarity_threshold = similarity_threshold
        self.max_results = max_results
        
        # Ensure collection exists
        self._ensure_collection()
    
    def _ensure_collection(self) -> None:
        """Ensure the linguistics_book collection exists."""
        try:
            self.db.get_collection(Collections.LINGUISTICS_BOOK)
        except Exception:
            logger.info(f"Creating collection {Collections.LINGUISTICS_BOOK}")
            self.db.create_collection(Collections.LINGUISTICS_BOOK)
    
    def search(
        self,
        query: str,
        top_k: Optional[int] = None,
        filters: Optional[Dict[str, Any]] = None,
        include_metadata: List[str] = None
    ) -> List[RetrievalResult]:
        """
        Perform semantic search against linguistics_book collection.
        
        Args:
            query: Search query string
            top_k: Number of results to return (uses instance default if None)
            filters: Metadata filters to apply
            include_metadata: List of metadata fields to include in results
            
        Returns:
            List of RetrievalResult objects ranked by similarity
        """
        if not query.strip():
            raise ValueError("Query cannot be empty")
        
        top_k = top_k or self.max_results
        
        try:
            # Build where clause for filters
            where_clause = self._build_where_clause(filters)
            
            # Perform search
            results = self.db.query(
                collection_name=Collections.LINGUISTICS_BOOK,
                query_texts=[query],
                n_results=top_k,
                where=where_clause,
                include=["metadatas", "distances", "documents"]
            )
            
            # Convert to RetrievalResult objects
            retrieval_results = []
            if results["ids"] and results["ids"][0]:
                for i, doc_id in enumerate(results["ids"][0]):
                    similarity_score = 1 - results["distances"][0][i]  # Convert distance to similarity
                    
                    # Apply similarity threshold
                    if similarity_score < self.similarity_threshold:
                        continue
                    
                    metadata = results["metadatas"][0][i] or {}
                    content = results["documents"][0][i] or ""
                    
                    # Filter metadata if requested
                    if include_metadata:
                        filtered_metadata = {
                            k: v for k, v in metadata.items() 
                            if k in include_metadata
                        }
                    else:
                        filtered_metadata = metadata
                    
                    result = RetrievalResult(
                        id=doc_id,
                        content=content,
                        metadata=filtered_metadata,
                        similarity_score=similarity_score
                    )
                    retrieval_results.append(result)
            
            # Normalize scores
            self._normalize_scores(retrieval_results)
            
            return retrieval_results
            
        except Exception as e:
            logger.error(f"Search failed for query '{query}': {e}")
            raise
    
    def bulk_search(
        self,
        queries: List[str],
        top_k: Optional[int] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, List[RetrievalResult]]:
        """
        Perform bulk semantic search for multiple queries.
        
        Args:
            queries: List of search query strings
            top_k: Number of results per query
            filters: Metadata filters to apply
            
        Returns:
            Dictionary mapping query to list of RetrievalResult objects
        """
        if not queries:
            return {}
        
        results = {}
        for query in queries:
            try:
                results[query] = self.search(query, top_k, filters)
            except Exception as e:
                logger.error(f"Bulk search failed for query '{query}': {e}")
                results[query] = []
        
        return results
    
    def get_by_id(self, doc_id: str) -> Optional[RetrievalResult]:
        """
        Retrieve a document by its ID.
        
        Args:
            doc_id: Document ID to retrieve
            
        Returns:
            RetrievalResult object if found, None otherwise
        """
        try:
            results = self.db.get(
                collection_name=Collections.LINGUISTICS_BOOK,
                ids=[doc_id],
                include=["metadatas", "documents"]
            )
            
            if results["ids"] and results["ids"][0]:
                metadata = results["metadatas"][0] or {}
                content = results["documents"][0] or ""
                
                return RetrievalResult(
                    id=doc_id,
                    content=content,
                    metadata=metadata,
                    similarity_score=1.0,  # Perfect match for ID lookup
                    normalized_score=1.0
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get document by ID '{doc_id}': {e}")
            return None
    
    def get_by_filters(
        self,
        filters: Dict[str, Any],
        limit: Optional[int] = None
    ) -> List[RetrievalResult]:
        """
        Retrieve documents by metadata filters only (no semantic search).
        
        Args:
            filters: Metadata filters to apply
            limit: Maximum number of results to return
            
        Returns:
            List of RetrievalResult objects
        """
        try:
            where_clause = self._build_where_clause(filters)
            limit = limit or self.max_results
            
            results = self.db.get(
                collection_name=Collections.LINGUISTICS_BOOK,
                where=where_clause,
                limit=limit,
                include=["metadatas", "documents"]
            )
            
            retrieval_results = []
            if results["ids"]:
                for i, doc_id in enumerate(results["ids"]):
                    metadata = results["metadatas"][i] or {}
                    content = results["documents"][i] or ""
                    
                    result = RetrievalResult(
                        id=doc_id,
                        content=content,
                        metadata=metadata,
                        similarity_score=1.0,  # Perfect match for filter lookup
                        normalized_score=1.0
                    )
                    retrieval_results.append(result)
            
            return retrieval_results
            
        except Exception as e:
            logger.error(f"Failed to get documents by filters: {e}")
            return []
    
    def _build_where_clause(self, filters: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Build ChromaDB where clause from filters.
        
        Args:
            filters: Dictionary of filters
            
        Returns:
            ChromaDB where clause or None if no filters
        """
        if not filters:
            return None
        
        where_clause = {}
        
        # Handle common filter types
        for key, value in filters.items():
            if key in ["content_type", "difficulty_level", "language", "topic", "subtopic"]:
                where_clause[key] = value
            elif key == "tags":
                if isinstance(value, list):
                    where_clause["$contains"] = value
                else:
                    where_clause["$contains"] = [value]
            elif key == "chapter":
                # Handle chapter filtering - could be in metadata or content
                where_clause["chapter"] = value
            elif key == "level":
                # Map level to difficulty_level
                where_clause["difficulty_level"] = value
        
        return where_clause if where_clause else None
    
    def _normalize_scores(self, results: List[RetrievalResult]) -> None:
        """
        Normalize similarity scores to 0-1 range across results.
        
        Args:
            results: List of RetrievalResult objects to normalize
        """
        if not results:
            return
        
        # Find min and max scores
        min_score = min(r.similarity_score for r in results)
        max_score = max(r.similarity_score for r in results)
        
        # Avoid division by zero
        if max_score == min_score:
            for result in results:
                result.normalized_score = 1.0
            return
        
        # Normalize scores
        for result in results:
            result.normalized_score = (
                (result.similarity_score - min_score) / (max_score - min_score)
            )
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the linguistics_book collection.
        
        Returns:
            Dictionary with collection statistics
        """
        try:
            collection = self.db.get_collection(Collections.LINGUISTICS_BOOK)
            count = collection.count()
            
            # Get sample of metadata for statistics
            sample_results = self.db.get(
                collection_name=Collections.LINGUISTICS_BOOK,
                limit=min(100, count),
                include=["metadatas"]
            )
            
            stats = {
                "total_documents": count,
                "content_types": {},
                "difficulty_levels": {},
                "topics": {},
                "languages": {}
            }
            
            if sample_results["metadatas"]:
                for metadata in sample_results["metadatas"]:
                    if metadata:
                        # Count content types
                        content_type = metadata.get("content_type", "unknown")
                        stats["content_types"][content_type] = \
                            stats["content_types"].get(content_type, 0) + 1
                        
                        # Count difficulty levels
                        difficulty = metadata.get("difficulty_level", "unknown")
                        stats["difficulty_levels"][difficulty] = \
                            stats["difficulty_levels"].get(difficulty, 0) + 1
                        
                        # Count topics
                        topic = metadata.get("topic", "unknown")
                        stats["topics"][topic] = \
                            stats["topics"].get(topic, 0) + 1
                        
                        # Count languages
                        language = metadata.get("language", "unknown")
                        stats["languages"][language] = \
                            stats["languages"].get(language, 0) + 1
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {"error": str(e)}