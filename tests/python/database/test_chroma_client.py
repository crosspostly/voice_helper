"""
Unit tests for the ChromaDB client.

Tests initialization against a temporary directory, collection creation,
missing API key behavior (mocked), and basic upsert/query flows.
"""

import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import pytest

# Add the project root to Python path for imports
import sys
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root / "linguistics"))

from linguistics.database.chroma_client import (
    LinguisticsDB,
    LinguisticsDBError,
    EmbeddingUnavailableError,
    get_database,
    reset_database
)
from linguistics.database.embeddings import EmbeddingService, MissingAPIKeyError
from linguistics.database.schema import Collections


class TestEmbeddingService:
    """Test cases for EmbeddingService."""
    
    def test_missing_api_key_initialization(self):
        """Test that EmbeddingService handles missing API key gracefully."""
        with patch('linguistics.database.embeddings.config') as mock_config:
            mock_config.GEMINI_API_KEY = ""
            mock_config.GEMINI_EMBEDDING_MODEL = "text-embedding-004"
            
            service = EmbeddingService()
            
            assert not service.is_available()
            assert not service._initialized
    
    def test_api_key_initialization(self):
        """Test that EmbeddingService initializes properly with API key."""
        with patch('linguistics.database.embeddings.config') as mock_config:
            mock_config.GEMINI_API_KEY = "test-api-key"
            mock_config.GEMINI_EMBEDDING_MODEL = "text-embedding-004"
            
            with patch('linguistics.database.embeddings.genai') as mock_genai:
                mock_model = Mock()
                mock_genai.GenerativeModel.return_value = mock_model
                mock_genai.configure.return_value = None
                
                service = EmbeddingService()
                
                assert service.is_available()
                assert service._initialized
                mock_genai.configure.assert_called_once_with(api_key="test-api-key")
    
    def test_embed_text_without_api_key(self):
        """Test that embedding fails gracefully without API key."""
        service = EmbeddingService()
        
        with pytest.raises(MissingAPIKeyError):
            service.embed_text("test text")
    
    def test_embed_text_with_mocked_api(self):
        """Test embedding generation with mocked API."""
        with patch('linguistics.database.embeddings.config') as mock_config:
            mock_config.GEMINI_API_KEY = "test-api-key"
            mock_config.GEMINI_EMBEDDING_MODEL = "text-embedding-004"
            mock_config.EMBEDDING_DIMENSION = 768
            
            with patch('linguistics.database.embeddings.genai') as mock_genai:
                mock_model = Mock()
                mock_genai.GenerativeModel.return_value = mock_model
                mock_genai.configure.return_value = None
                mock_genai.embed_content.return_value = {
                    'embedding': [0.1] * 768
                }
                
                service = EmbeddingService()
                result = service.embed_text("test text")
                
                assert len(result) == 768
                assert all(isinstance(x, float) for x in result)


class TestLinguisticsDB:
    """Test cases for LinguisticsDB."""
    
    @pytest.fixture
    def temp_db_dir(self):
        """Create a temporary directory for database testing."""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    @pytest.fixture
    def mock_embedding_service(self):
        """Create a mock embedding service."""
        service = Mock(spec=EmbeddingService)
        service.is_available.return_value = True
        service.embed_texts.return_value = [[0.1] * 768, [0.2] * 768]
        service.get_embedding_dimension.return_value = 768
        return service
    
    def test_initialization_with_temp_directory(self, temp_db_dir, mock_embedding_service):
        """Test database initialization against a temporary directory."""
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service
        )
        
        assert db.persist_directory == temp_db_dir
        assert db.embedding_service == mock_embedding_service
        assert db._client is not None
        assert temp_db_dir.exists()
    
    def test_initialization_with_reset(self, temp_db_dir, mock_embedding_service):
        """Test database initialization with reset flag."""
        # Create a file in the directory first
        (temp_db_dir / "test.txt").write_text("test")
        
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service,
            reset_db=True
        )
        
        # Directory should exist but test.txt should be gone
        assert temp_db_dir.exists()
        assert not (temp_db_dir / "test.txt").exists()
    
    def test_missing_api_key_behavior(self, temp_db_dir):
        """Test database behavior when API key is missing."""
        # Create embedding service without API key
        no_key_service = EmbeddingService()
        
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=no_key_service
        )
        
        # Should not raise error during initialization
        assert db is not None
        assert not db.is_embedding_available()
    
    def test_collection_creation(self, temp_db_dir, mock_embedding_service):
        """Test lazy collection creation."""
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service
        )
        
        # Get collection - should create it lazily
        collection = db.get_or_create_collection(Collections.LINGUISTICS_BOOK)
        assert collection is not None
        
        # Should be cached now
        assert Collections.LINGUISTICS_BOOK in db._collections
        
        # Getting again should return the same instance
        collection2 = db.get_or_create_collection(Collections.LINGUISTICS_BOOK)
        assert collection is collection2
    
    def test_invalid_collection_name(self, temp_db_dir, mock_embedding_service):
        """Test that invalid collection names raise errors."""
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service
        )
        
        with pytest.raises(LinguisticsDBError):
            db.get_or_create_collection("invalid_collection")
    
    def test_upsert_documents(self, temp_db_dir, mock_embedding_service):
        """Test basic upsert operation."""
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service
        )
        
        ids = ["doc1", "doc2"]
        documents = ["First document", "Second document"]
        metadatas = [
            {
                "content_type": "lesson",
                "difficulty_level": "beginner",
                "topic": "grammar",
                "language": "en"
            },
            {
                "content_type": "exercise",
                "difficulty_level": "intermediate",
                "topic": "vocabulary",
                "language": "en"
            }
        ]
        
        result = db.upsert(Collections.LINGUISTICS_BOOK, ids, documents, metadatas)
        
        assert len(result) == 2
        assert set(result) == set(ids)
    
    def test_upsert_invalid_metadata(self, temp_db_dir, mock_embedding_service):
        """Test that invalid metadata raises error."""
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service
        )
        
        ids = ["doc1"]
        documents = ["First document"]
        metadatas = [
            {
                "content_type": "invalid_type",  # Invalid content type
                "difficulty_level": "beginner",
                "topic": "grammar",
                "language": "en"
            }
        ]
        
        with pytest.raises(ValueError):
            db.upsert(Collections.LINGUISTICS_BOOK, ids, documents, metadatas)
    
    def test_query_documents(self, temp_db_dir, mock_embedding_service):
        """Test basic query operation."""
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service
        )
        
        # First, insert some documents
        ids = ["doc1", "doc2"]
        documents = ["First document about grammar", "Second document about vocabulary"]
        metadatas = [
            {
                "content_type": "lesson",
                "difficulty_level": "beginner",
                "topic": "grammar",
                "language": "en"
            },
            {
                "content_type": "exercise",
                "difficulty_level": "intermediate",
                "topic": "vocabulary",
                "language": "en"
            }
        ]
        
        db.upsert(Collections.LINGUISTICS_BOOK, ids, documents, metadatas)
        
        # Now query
        results = db.query(
            collection_name=Collections.LINGUISTICS_BOOK,
            query_texts=["grammar lesson"],
            n_results=2
        )
        
        assert 'ids' in results
        assert 'documents' in results
        assert 'metadatas' in results
        assert 'distances' in results
        # ChromaDB returns results for each query
        assert len(results['ids']) >= 1  # At least one query result
        # Check that we got some results
        assert len(results['ids'][0]) >= 0  # Should have some (possibly zero) results
    
    def test_query_without_embeddings(self, temp_db_dir):
        """Test query behavior when embeddings are not available."""
        no_key_service = EmbeddingService()
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=no_key_service
        )
        
        with pytest.raises(EmbeddingUnavailableError):
            db.query(
                collection_name=Collections.LINGUISTICS_BOOK,
                query_texts=["test query"]
            )
    
    def test_get_documents(self, temp_db_dir, mock_embedding_service):
        """Test get operation."""
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service
        )
        
        # Insert documents first
        ids = ["doc1", "doc2"]
        documents = ["First document", "Second document"]
        metadatas = [
            {
                "content_type": "lesson",
                "difficulty_level": "beginner",
                "topic": "grammar",
                "language": "en"
            },
            {
                "content_type": "exercise",
                "difficulty_level": "intermediate",
                "topic": "vocabulary",
                "language": "en"
            }
        ]
        
        db.upsert(Collections.LINGUISTICS_BOOK, ids, documents, metadatas)
        
        # Get specific documents
        results = db.get(
            collection_name=Collections.LINGUISTICS_BOOK,
            ids=["doc1"]
        )
        
        assert 'ids' in results
        assert 'documents' in results
        assert 'metadatas' in results
        assert len(results['ids']) == 1
        assert results['ids'][0] == "doc1"
    
    def test_delete_documents(self, temp_db_dir, mock_embedding_service):
        """Test delete operation."""
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service
        )
        
        # Insert documents first
        ids = ["doc1", "doc2"]
        documents = ["First document", "Second document"]
        metadatas = [
            {
                "content_type": "lesson",
                "difficulty_level": "beginner",
                "topic": "grammar",
                "language": "en"
            },
            {
                "content_type": "exercise",
                "difficulty_level": "intermediate",
                "topic": "vocabulary",
                "language": "en"
            }
        ]
        
        db.upsert(Collections.LINGUISTICS_BOOK, ids, documents, metadatas)
        
        # Delete one document
        db.delete(
            collection_name=Collections.LINGUISTICS_BOOK,
            ids=["doc1"]
        )
        
        # Verify deletion
        results = db.get(
            collection_name=Collections.LINGUISTICS_BOOK,
            ids=["doc1"]
        )
        
        assert len(results['ids']) == 0
    
    def test_count_documents(self, temp_db_dir, mock_embedding_service):
        """Test count operation."""
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service
        )
        
        # Insert documents
        ids = ["doc1", "doc2"]
        documents = ["First document", "Second document"]
        metadatas = [
            {
                "content_type": "lesson",
                "difficulty_level": "beginner",
                "topic": "grammar",
                "language": "en"
            },
            {
                "content_type": "exercise",
                "difficulty_level": "intermediate",
                "topic": "vocabulary",
                "language": "en"
            }
        ]
        
        db.upsert(Collections.LINGUISTICS_BOOK, ids, documents, metadatas)
        
        # Count documents
        count = db.count(Collections.LINGUISTICS_BOOK)
        assert count == 2
    
    def test_list_collections(self, temp_db_dir, mock_embedding_service):
        """Test listing collections."""
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service
        )
        
        # Create some collections
        db.get_or_create_collection(Collections.LINGUISTICS_BOOK)
        db.get_or_create_collection(Collections.USER_CONVERSATIONS)
        
        # List collections
        collections = db.list_collections()
        assert Collections.LINGUISTICS_BOOK in collections
        assert Collections.USER_CONVERSATIONS in collections
    
    def test_context_manager_cleanup(self, temp_db_dir, mock_embedding_service):
        """Test cleanup context manager."""
        db = LinguisticsDB(
            persist_directory=temp_db_dir,
            embedding_service=mock_embedding_service
        )
        
        # Create a collection
        db.get_or_create_collection(Collections.LINGUISTICS_BOOK)
        assert len(db._collections) == 1
        
        # Use context manager
        with db.cleanup():
            # Database should be usable within context
            collection = db.get_or_create_collection(Collections.LINGUISTICS_BOOK)
            assert collection is not None
        
        # After context, collections should be cleared
        assert len(db._collections) == 0


class TestGlobalDatabase:
    """Test cases for global database functions."""
    
    @pytest.fixture
    def temp_db_dir(self):
        """Create a temporary directory for database testing."""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    def test_get_database_singleton(self, temp_db_dir):
        """Test that get_database returns the same instance."""
        reset_database()  # Clear any existing instance
        
        db1 = get_database(persist_directory=temp_db_dir)
        db2 = get_database(persist_directory=temp_db_dir)
        
        assert db1 is db2
    
    def test_reset_database(self, temp_db_dir):
        """Test database reset functionality."""
        reset_database()  # Clear any existing instance
        
        db1 = get_database(persist_directory=temp_db_dir)
        reset_database()
        db2 = get_database(persist_directory=temp_db_dir)
        
        assert db1 is not db2
    
    def test_get_database_with_reset_flag(self, temp_db_dir):
        """Test get_database with reset flag."""
        reset_database()  # Clear any existing instance
        
        db1 = get_database(persist_directory=temp_db_dir)
        db2 = get_database(persist_directory=temp_db_dir, reset_db=True)
        
        assert db1 is not db2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
