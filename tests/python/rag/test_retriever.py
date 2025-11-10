"""
Unit tests for RAG retriever module.

Tests BookRetriever functionality including semantic search,
filtering, score normalization, and bulk retrieval.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, List, Any

from linguistics.rag.retriever import BookRetriever, RetrievalResult
from linguistics.database.chroma_client import LinguisticsDB
from linguistics.database.embeddings import EmbeddingService
from linguistics.database.schema import Collections


class TestRetrievalResult:
    """Test RetrievalResult class."""
    
    def test_retrieval_result_creation(self):
        """Test creating a RetrievalResult."""
        metadata = {"content_type": "lesson", "difficulty_level": "beginner"}
        result = RetrievalResult(
            id="test_id",
            content="Test content",
            metadata=metadata,
            similarity_score=0.8
        )
        
        assert result.id == "test_id"
        assert result.content == "Test content"
        assert result.metadata == metadata
        assert result.similarity_score == 0.8
        assert result.normalized_score == 0.8  # Should default to similarity_score
    
    def test_retrieval_result_with_normalized_score(self):
        """Test RetrievalResult with explicit normalized score."""
        result = RetrievalResult(
            id="test_id",
            content="Test content",
            metadata={},
            similarity_score=0.8,
            normalized_score=0.9
        )
        
        assert result.normalized_score == 0.9
    
    def test_to_dict(self):
        """Test converting RetrievalResult to dictionary."""
        metadata = {"content_type": "lesson"}
        result = RetrievalResult(
            id="test_id",
            content="Test content",
            metadata=metadata,
            similarity_score=0.8,
            normalized_score=0.9
        )
        
        result_dict = result.to_dict()
        expected = {
            "id": "test_id",
            "content": "Test content",
            "metadata": metadata,
            "similarity_score": 0.8,
            "normalized_score": 0.9
        }
        
        assert result_dict == expected


class TestBookRetriever:
    """Test BookRetriever class."""
    
    @pytest.fixture
    def mock_db(self):
        """Create mock LinguisticsDB."""
        db = Mock(spec=LinguisticsDB)
        db.embedding_service = Mock(spec=EmbeddingService)
        # Add missing methods that tests expect
        db.get_collection = Mock()
        db.create_collection = Mock()
        db.query = Mock()
        db.get = Mock()
        return db
    
    @pytest.fixture
    def mock_embedding_service(self):
        """Create mock EmbeddingService."""
        return Mock(spec=EmbeddingService)
    
    @pytest.fixture
    def retriever(self, mock_db):
        """Create BookRetriever instance with mocked dependencies."""
        with patch('linguistics.rag.retriever.LinguisticsDB', return_value=mock_db):
            retriever = BookRetriever(mock_db)
            return retriever
    
    def test_initialization_with_defaults(self):
        """Test BookRetriever initialization with default parameters."""
        with patch('linguistics.rag.retriever.LinguisticsDB') as mock_db_class:
            mock_db = Mock()
            mock_db_class.return_value = mock_db
            
            retriever = BookRetriever()
            
            assert retriever.db == mock_db
            assert retriever.similarity_threshold == 0.7  # From config
            assert retriever.max_results == 5  # From config
            mock_db.get_collection.assert_called_once_with(Collections.LINGUISTICS_BOOK)
    
    def test_initialization_with_custom_params(self, mock_db, mock_embedding_service):
        """Test BookRetriever initialization with custom parameters."""
        retriever = BookRetriever(
            db=mock_db,
            embedding_service=mock_embedding_service,
            similarity_threshold=0.5,
            max_results=10
        )
        
        assert retriever.db == mock_db
        assert retriever.embedding_service == mock_embedding_service
        assert retriever.similarity_threshold == 0.5
        assert retriever.max_results == 10
    
    def test_ensure_collection_creates_collection_if_missing(self, mock_db):
        """Test that missing collection is created."""
        mock_db.get_collection.side_effect = Exception("Collection not found")
        
        with patch('linguistics.rag.retriever.LinguisticsDB', return_value=mock_db):
            BookRetriever(mock_db)
        
        mock_db.create_collection.assert_called_once_with(Collections.LINGUISTICS_BOOK)
    
    def test_search_success(self, retriever, mock_db):
        """Test successful search operation."""
        # Mock query response
        mock_response = {
            "ids": [["doc1", "doc2"]],
            "distances": [[0.1, 0.3]],  # Distance, so similarity = 1 - distance (0.9, 0.7)
            "metadatas": [[
                {"content_type": "lesson", "difficulty_level": "beginner"},
                {"content_type": "exercise", "difficulty_level": "intermediate"}
            ]],
            "documents": [["Content 1", "Content 2"]]
        }
        
        mock_db.query.return_value = mock_response
        
        results = retriever.search("test query")
        
        assert len(results) == 2
        assert results[0].id == "doc1"
        assert results[0].content == "Content 1"
        assert results[0].similarity_score == 0.9  # 1 - 0.1
        assert results[0].metadata["content_type"] == "lesson"
        
        assert results[1].id == "doc2"
        assert results[1].similarity_score == 0.7  # 1 - 0.3
        
        mock_db.query.assert_called_once_with(
            collection_name=Collections.LINGUISTICS_BOOK,
            query_texts=["test query"],
            n_results=5,
            where=None,
            include=["metadatas", "distances", "documents"]
        )
    
    def test_search_with_filters(self, retriever, mock_db):
        """Test search with filters."""
        mock_response = {
            "ids": [["doc1"]],
            "distances": [[0.1]],
            "metadatas": [[{"content_type": "lesson"}]],
            "documents": [["Content 1"]]
        }
        
        mock_db.query.return_value = mock_response
        
        filters = {"content_type": "lesson", "difficulty_level": "beginner"}
        results = retriever.search("test query", filters=filters)
        
        assert len(results) == 1
        
        # Check that where clause was built correctly
        call_args = mock_db.query.call_args
        where_clause = call_args.kwargs["where"]
        assert where_clause["content_type"] == "lesson"
        assert where_clause["difficulty_level"] == "beginner"
    
    def test_search_applies_similarity_threshold(self, retriever, mock_db):
        """Test that similarity threshold is applied."""
        # Mock response with low similarity scores
        mock_response = {
            "ids": [["doc1", "doc2"]],
            "distances": [[0.2, 0.8]],  # Similarities: 0.8, 0.2
            "metadatas": [[{}, {}]],
            "documents": [["Content 1", "Content 2"]]
        }
        
        mock_db.query.return_value = mock_response
        
        # Set high threshold
        retriever.similarity_threshold = 0.7
        results = retriever.search("test query")
        
        # Only first result should pass threshold
        assert len(results) == 1
        assert results[0].id == "doc1"
        assert results[0].similarity_score == 0.8
    
    def test_search_empty_query(self, retriever):
        """Test search with empty query raises error."""
        with pytest.raises(ValueError, match="Query cannot be empty"):
            retriever.search("")
        
        with pytest.raises(ValueError, match="Query cannot be empty"):
            retriever.search("   ")
    
    def test_search_with_metadata_filtering(self, retriever, mock_db):
        """Test search with specific metadata fields included."""
        mock_response = {
            "ids": [["doc1"]],
            "distances": [[0.1]],
            "metadatas": [[{"content_type": "lesson", "difficulty_level": "beginner", "topic": "grammar"}]],
            "documents": [["Content 1"]]
        }
        
        mock_db.query.return_value = mock_response
        
        include_metadata = ["content_type", "topic"]
        results = retriever.search("test query", include_metadata=include_metadata)
        
        assert len(results) == 1
        assert "content_type" in results[0].metadata
        assert "topic" in results[0].metadata
        assert "difficulty_level" not in results[0].metadata  # Should be filtered out
    
    def test_bulk_search(self, retriever):
        """Test bulk search functionality."""
        # Mock individual search calls
        retriever.search = Mock(side_effect=[
            [RetrievalResult("doc1", "Content 1", {}, 0.8)],
            [RetrievalResult("doc2", "Content 2", {}, 0.7)]
        ])
        
        queries = ["query1", "query2"]
        results = retriever.bulk_search(queries)
        
        assert len(results) == 2
        assert "query1" in results
        assert "query2" in results
        assert len(results["query1"]) == 1
        assert results["query1"][0].id == "doc1"
        assert len(results["query2"]) == 1
        assert results["query2"][0].id == "doc2"
    
    def test_bulk_search_handles_errors(self, retriever):
        """Test bulk search handles individual query errors."""
        retriever.search = Mock(side_effect=[
            [RetrievalResult("doc1", "Content 1", {}, 0.8)],
            Exception("Search failed")
        ])
        
        queries = ["query1", "query2"]
        results = retriever.bulk_search(queries)
        
        assert len(results) == 2
        assert len(results["query1"]) == 1
        assert len(results["query2"]) == 0  # Should be empty due to error
    
    def test_get_by_id(self, retriever, mock_db):
        """Test getting document by ID."""
        mock_response = {
            "ids": ["doc1"],
            "metadatas": [{"content_type": "lesson"}],
            "documents": ["Content 1"]
        }
        
        # Mock get to return the response in the expected format
        mock_db.get.return_value = mock_response
        
        result = retriever.get_by_id("doc1")
        
        assert result is not None
        assert result.id == "doc1"
        assert result.content == "Content 1"
        assert result.similarity_score == 1.0
        assert result.normalized_score == 1.0
        
        mock_db.get.assert_called_once_with(
            collection_name=Collections.LINGUISTICS_BOOK,
            ids=["doc1"],
            include=["metadatas", "documents"]
        )
    
    def test_get_by_id_not_found(self, retriever, mock_db):
        """Test getting non-existent document by ID."""
        mock_response = {"ids": [], "metadatas": [], "documents": []}
        mock_db.get.return_value = mock_response
        
        result = retriever.get_by_id("nonexistent")
        
        assert result is None
    
    def test_get_by_filters(self, retriever, mock_db):
        """Test getting documents by filters."""
        mock_response = {
            "ids": ["doc1", "doc2"],
            "metadatas": [
                {"content_type": "lesson"},
                {"content_type": "exercise"}
            ],
            "documents": ["Content 1", "Content 2"]
        }
        
        mock_db.get.return_value = mock_response
        
        filters = {"content_type": "lesson"}
        results = retriever.get_by_filters(filters, limit=10)
        
        assert len(results) == 2
        assert results[0].id == "doc1"
        assert results[1].id == "doc2"
        
        # All results should have perfect scores for filter lookup
        for result in results:
            assert result.similarity_score == 1.0
            assert result.normalized_score == 1.0
    
    def test_build_where_clause(self, retriever):
        """Test building where clauses from filters."""
        # Test with no filters
        assert retriever._build_where_clause(None) is None
        assert retriever._build_where_clause({}) is None
        
        # Test with various filters
        filters = {
            "content_type": "lesson",
            "difficulty_level": "beginner",
            "topic": "grammar",
            "tags": ["noun", "verb"],
            "chapter": "1",
            "level": "intermediate"
        }
        
        where_clause = retriever._build_where_clause(filters)
        
        assert where_clause["content_type"] == "lesson"
        assert where_clause["topic"] == "grammar"
        assert where_clause["$contains"] == ["noun", "verb"]
        assert where_clause["chapter"] == "1"
        # Note: level maps to difficulty_level, so it overwrites the beginner value
        assert where_clause["difficulty_level"] == "intermediate"
    
    def test_normalize_scores(self, retriever):
        """Test score normalization."""
        results = [
            RetrievalResult("doc1", "Content 1", {}, 0.6),
            RetrievalResult("doc2", "Content 2", {}, 0.8),
            RetrievalResult("doc3", "Content 3", {}, 0.7)
        ]
        
        retriever._normalize_scores(results)
        
        # Check normalization (min=0.6, max=0.8)
        assert results[0].normalized_score == 0.0  # (0.6-0.6)/(0.8-0.6) = 0
        assert results[1].normalized_score == 1.0  # (0.8-0.6)/(0.8-0.6) = 1
        assert abs(results[2].normalized_score - 0.5) < 0.0001  # Allow for floating point precision
    
    def test_normalize_scores_empty_list(self, retriever):
        """Test score normalization with empty list."""
        results = []
        retriever._normalize_scores(results)
        assert results == []
    
    def test_normalize_scores_identical_scores(self, retriever):
        """Test score normalization with identical scores."""
        results = [
            RetrievalResult("doc1", "Content 1", {}, 0.7),
            RetrievalResult("doc2", "Content 2", {}, 0.7)
        ]
        
        retriever._normalize_scores(results)
        
        # All should be normalized to 1.0 when scores are identical
        for result in results:
            assert result.normalized_score == 1.0
    
    def test_get_collection_stats(self, retriever, mock_db):
        """Test getting collection statistics."""
        # Mock collection
        mock_collection = Mock()
        mock_collection.count.return_value = 10
        mock_db.get_collection.return_value = mock_collection
        
        # Mock sample results
        sample_metadata = [
            {"content_type": "lesson", "difficulty_level": "beginner", "topic": "grammar", "language": "en"},
            {"content_type": "exercise", "difficulty_level": "beginner", "topic": "vocabulary", "language": "en"},
            {"content_type": "lesson", "difficulty_level": "intermediate", "topic": "grammar", "language": "en"}
        ]
        
        mock_db.get.return_value = {"metadatas": sample_metadata}
        
        stats = retriever.get_collection_stats()
        
        assert stats["total_documents"] == 10
        assert stats["content_types"]["lesson"] == 2
        assert stats["content_types"]["exercise"] == 1
        assert stats["difficulty_levels"]["beginner"] == 2
        assert stats["difficulty_levels"]["intermediate"] == 1
        assert stats["topics"]["grammar"] == 2
        assert stats["topics"]["vocabulary"] == 1
        assert stats["languages"]["en"] == 3
    
    def test_get_collection_stats_error(self, retriever, mock_db):
        """Test getting collection stats with error."""
        mock_db.get_collection.side_effect = Exception("Database error")
        
        stats = retriever.get_collection_stats()
        
        assert "error" in stats
        assert "Database error" in stats["error"]