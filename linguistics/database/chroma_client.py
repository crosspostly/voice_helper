"""
ChromaDB client for the linguistics package.

Provides a LinguisticsDB class managing a persistent Chroma client,
embedding function selection, lazy collection creation, and helper methods
for CRUD operations across the three collections.
"""

import logging
import shutil
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions

from ..config import config
try:
    from .embeddings import EmbeddingService, get_embedding_service
    _embeddings_available = True
except ImportError:
    _embeddings_available = False
    EmbeddingService = None
    get_embedding_service = None
from .schema import Collections, validate_collection_metadata

logger = logging.getLogger(__name__)


class LinguisticsDBError(Exception):
    """Base exception for LinguisticsDB operations."""
    pass


class CollectionNotFoundError(LinguisticsDBError):
    """Raised when a collection is not found."""
    pass


class EmbeddingUnavailableError(LinguisticsDBError):
    """Raised when embedding service is not available."""
    pass


class LinguisticsDB:
    """
    Main database client for linguistics package using ChromaDB.
    
    Manages persistent storage, embedding functions, collection creation,
    and CRUD operations for linguistics data, conversations, and progress.
    """
    
    def __init__(
        self,
        persist_directory: Optional[Union[str, Path]] = None,
        embedding_service: Optional[EmbeddingService] = None,
        reset_db: bool = False
    ):
        """
        Initialize the LinguisticsDB client.
        
        Args:
            persist_directory: Directory for persistent storage. If None, uses config.CHROMA_DB_PATH
            embedding_service: Custom embedding service. If None, uses default service
            reset_db: If True, resets the database by deleting and recreating the persist directory
        """
        self.persist_directory = Path(persist_directory or config.CHROMA_DB_PATH)
        
        # Handle missing embedding service
        if _embeddings_available:
            self.embedding_service = embedding_service or get_embedding_service()
        else:
            self.embedding_service = None
            logger.warning("Embedding service not available - using fallback embedding function")
        
        self._client = None
        self._collections = {}
        self._embedding_function = None
        
        # Ensure the persist directory exists
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        
        # Reset database if requested
        if reset_db:
            self._reset_database()
        
        # Initialize the client
        self._initialize_client()
        self._setup_embedding_function()
        
        logger.info(f"Initialized LinguisticsDB with persist directory: {self.persist_directory}")
    
    def _reset_database(self) -> None:
        """Reset the database by deleting and recreating the persist directory."""
        if self.persist_directory.exists():
            logger.warning(f"Resetting database at {self.persist_directory}")
            shutil.rmtree(self.persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)
    
    def _initialize_client(self) -> None:
        """Initialize the ChromaDB client."""
        try:
            self._client = chromadb.PersistentClient(
                path=str(self.persist_directory),
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            logger.info("ChromaDB client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB client: {e}")
            raise LinguisticsDBError(f"Failed to initialize ChromaDB client: {e}")
    
    def _setup_embedding_function(self) -> None:
        """Setup the embedding function based on available services."""
        if self.embedding_service and hasattr(self.embedding_service, 'is_available') and self.embedding_service.is_available():
            # Use custom embedding function that wraps Gemini
            try:
                self._embedding_function = GeminiEmbeddingFunction(self.embedding_service)
                logger.info("Using Gemini embedding function")
            except Exception as e:
                logger.warning(f"Failed to setup Gemini embedding function: {e}")
                self._embedding_function = None
        else:
            # Fallback to a simple sentence transformer embedding
            try:
                self._embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name="all-MiniLM-L6-v2"
                )
                logger.info("Using SentenceTransformer embedding function as fallback")
            except Exception as e:
                logger.warning(f"Failed to setup fallback embedding function: {e}")
                self._embedding_function = None
    
    @contextmanager
    def _ensure_collection(self, collection_name: str):
        """Context manager to ensure collection exists."""
        collection = self.get_or_create_collection(collection_name)
        try:
            yield collection
        except Exception as e:
            logger.error(f"Error in collection operation for {collection_name}: {e}")
            raise LinguisticsDBError(f"Collection operation failed: {e}")
    
    def get_or_create_collection(self, collection_name: str):
        """
        Get or create a collection by name.
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            ChromaDB collection object
            
        Raises:
            LinguisticsDBError: If collection creation fails
        """
        if collection_name in self._collections:
            return self._collections[collection_name]
        
        try:
            # Validate collection name
            if collection_name not in [Collections.LINGUISTICS_BOOK, Collections.USER_CONVERSATIONS, Collections.USER_PROGRESS]:
                raise ValueError(f"Unknown collection name: {collection_name}")
            
            # Create or get collection
            if self._embedding_function:
                collection = self._client.get_or_create_collection(
                    name=collection_name,
                    embedding_function=self._embedding_function,
                    metadata={"description": f"Linguistics {collection_name} collection"}
                )
            else:
                # Create collection without embedding function (will use default)
                collection = self._client.get_or_create_collection(
                    name=collection_name,
                    metadata={"description": f"Linguistics {collection_name} collection"}
                )
            
            self._collections[collection_name] = collection
            logger.info(f"Collection '{collection_name}' ready for use")
            return collection
            
        except Exception as e:
            logger.error(f"Failed to get or create collection {collection_name}: {e}")
            raise LinguisticsDBError(f"Failed to get or create collection {collection_name}: {e}")
    
    def upsert(
        self,
        collection_name: str,
        ids: List[str],
        documents: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None
    ) -> List[str]:
        """
        Upsert documents into a collection.
        
        Args:
            collection_name: Name of the collection
            ids: List of document IDs
            documents: List of document contents
            metadatas: List of metadata dictionaries (optional)
            
        Returns:
            List of IDs that were upserted
            
        Raises:
            LinguisticsDBError: If upsert operation fails
        """
        if not ids or not documents:
            logger.warning("Empty ids or documents provided to upsert")
            return []
        
        if len(ids) != len(documents):
            raise ValueError("Number of ids must match number of documents")
        
        if metadatas and len(metadatas) != len(documents):
            raise ValueError("Number of metadatas must match number of documents")
        
        # Validate and convert metadata if provided
        if metadatas:
            for i, metadata in enumerate(metadatas):
                try:
                    validated_metadata = validate_collection_metadata(collection_name, metadata)
                    # Convert datetime objects to ISO strings for ChromaDB compatibility
                    metadatas[i] = self._convert_metadata_for_chromadb(validated_metadata.model_dump())
                except Exception as e:
                    logger.error(f"Invalid metadata for document {ids[i]}: {e}")
                    raise ValueError(f"Invalid metadata for document {ids[i]}: {e}")
        
        with self._ensure_collection(collection_name) as collection:
            try:
                result = collection.upsert(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas
                )
                # ChromaDB upsert returns None or empty list, so return the input IDs
                logger.info(f"Upserted {len(ids)} documents into {collection_name}")
                return ids
            except Exception as e:
                logger.error(f"Failed to upsert documents into {collection_name}: {e}")
                raise LinguisticsDBError(f"Failed to upsert documents: {e}")
    
    def query(
        self,
        collection_name: str,
        query_texts: Optional[List[str]] = None,
        query_embeddings: Optional[List[List[float]]] = None,
        n_results: int = 10,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None,
        include: Optional[List[str]] = None
    ) -> Dict[str, List[Any]]:
        """
        Query documents from a collection.
        
        Args:
            collection_name: Name of the collection
            query_texts: List of query texts (alternative to query_embeddings)
            query_embeddings: List of query embeddings (alternative to query_texts)
            n_results: Maximum number of results to return
            where: Metadata filters
            where_document: Document content filters
            include: Fields to include in results
            
        Returns:
            Query results dictionary
            
        Raises:
            LinguisticsDBError: If query operation fails
        """
        if not query_texts and not query_embeddings:
            raise ValueError("Either query_texts or query_embeddings must be provided")
        
        if query_texts and not self.embedding_service.is_available() and not query_embeddings:
            raise EmbeddingUnavailableError("Embedding service not available and no query_embeddings provided")
        
        with self._ensure_collection(collection_name) as collection:
            try:
                result = collection.query(
                    query_texts=query_texts,
                    query_embeddings=query_embeddings,
                    n_results=n_results,
                    where=where,
                    where_document=where_document,
                    include=include or ["metadatas", "documents", "distances"]
                )
                logger.info(f"Queried {collection_name} with {len(query_texts or query_embeddings)} queries")
                return result
            except Exception as e:
                logger.error(f"Failed to query {collection_name}: {e}")
                raise LinguisticsDBError(f"Failed to query collection: {e}")
    
    def get(
        self,
        collection_name: str,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        include: Optional[List[str]] = None
    ) -> Dict[str, List[Any]]:
        """
        Get documents from a collection by ID or filters.
        
        Args:
            collection_name: Name of the collection
            ids: List of document IDs to retrieve
            where: Metadata filters
            limit: Maximum number of results to return
            offset: Number of results to skip
            include: Fields to include in results
            
        Returns:
            Retrieved documents dictionary
            
        Raises:
            LinguisticsDBError: If get operation fails
        """
        with self._ensure_collection(collection_name) as collection:
            try:
                result = collection.get(
                    ids=ids,
                    where=where,
                    limit=limit,
                    offset=offset,
                    include=include or ["metadatas", "documents"]
                )
                logger.info(f"Retrieved {len(result.get('ids', []))} documents from {collection_name}")
                return result
            except Exception as e:
                logger.error(f"Failed to get documents from {collection_name}: {e}")
                raise LinguisticsDBError(f"Failed to get documents: {e}")
    
    def delete(
        self,
        collection_name: str,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Delete documents from a collection.
        
        Args:
            collection_name: Name of the collection
            ids: List of document IDs to delete
            where: Metadata filters for deletion
            where_document: Document content filters for deletion
            
        Raises:
            LinguisticsDBError: If delete operation fails
        """
        if not ids and not where and not where_document:
            raise ValueError("Either ids, where, or where_document must be provided for deletion")
        
        with self._ensure_collection(collection_name) as collection:
            try:
                collection.delete(
                    ids=ids,
                    where=where,
                    where_document=where_document
                )
                logger.info(f"Deleted documents from {collection_name}")
            except Exception as e:
                logger.error(f"Failed to delete documents from {collection_name}: {e}")
                raise LinguisticsDBError(f"Failed to delete documents: {e}")
    
    def count(self, collection_name: str) -> int:
        """
        Count documents in a collection.
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            Number of documents in the collection
            
        Raises:
            LinguisticsDBError: If count operation fails
        """
        with self._ensure_collection(collection_name) as collection:
            try:
                count = collection.count()
                logger.info(f"Collection {collection_name} contains {count} documents")
                return count
            except Exception as e:
                logger.error(f"Failed to count documents in {collection_name}: {e}")
                raise LinguisticsDBError(f"Failed to count documents: {e}")
    
    def list_collections(self) -> List[str]:
        """
        List all available collections.
        
        Returns:
            List of collection names
        """
        try:
            collections = self._client.list_collections()
            return [collection.name for collection in collections]
        except Exception as e:
            logger.error(f"Failed to list collections: {e}")
            raise LinguisticsDBError(f"Failed to list collections: {e}")
    
    def delete_collection(self, collection_name: str) -> None:
        """
        Delete a collection entirely.
        
        Args:
            collection_name: Name of the collection to delete
            
        Raises:
            LinguisticsDBError: If deletion fails
        """
        try:
            self._client.delete_collection(name=collection_name)
            if collection_name in self._collections:
                del self._collections[collection_name]
            logger.info(f"Deleted collection: {collection_name}")
        except Exception as e:
            logger.error(f"Failed to delete collection {collection_name}: {e}")
            raise LinguisticsDBError(f"Failed to delete collection: {e}")
    
    @contextmanager
    def cleanup(self):
        """
        Context manager for cleanup operations.
        
        Usage:
            with db.cleanup():
                # Database operations here
                pass
        """
        try:
            yield self
        finally:
            self._cleanup()
    
    def _convert_metadata_for_chromadb(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert metadata to be ChromaDB-compatible.
        
        ChromaDB doesn't support datetime objects or lists directly, so convert them to strings.
        """
        converted = {}
        for key, value in metadata.items():
            if isinstance(value, datetime):
                converted[key] = value.isoformat()
            elif isinstance(value, list):
                # Convert lists to comma-separated strings
                converted[key] = ",".join(str(item) for item in value)
            elif isinstance(value, dict):
                # Handle nested dictionaries
                converted[key] = str(value)  # Convert nested dicts to strings
            else:
                converted[key] = value
        return converted
    
    def _cleanup(self) -> None:
        """Cleanup resources."""
        try:
            # Clear collection cache
            self._collections.clear()
            logger.debug("Cleaned up LinguisticsDB resources")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    def get_embedding_service(self) -> EmbeddingService:
        """Get the embedding service instance."""
        return self.embedding_service
    
    def is_embedding_available(self) -> bool:
        """Check if embedding service is available."""
        return self.embedding_service.is_available()


class GeminiEmbeddingFunction:
    """
    Custom embedding function for ChromaDB that uses Gemini embeddings.
    
    This class implements the interface expected by ChromaDB for embedding functions.
    """
    
    def __init__(self, embedding_service: EmbeddingService):
        """
        Initialize the Gemini embedding function.
        
        Args:
            embedding_service: Gemini embedding service instance
        """
        self.embedding_service = embedding_service
        self._name = "gemini"
        self._is_legacy = False
    
    def name(self) -> str:
        """Get the name of the embedding function."""
        return self._name
    
    def is_legacy(self) -> bool:
        """Check if this is a legacy embedding function."""
        return self._is_legacy
    
    def __call__(self, input: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of input texts.
        
        Args:
            input: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        try:
            return self.embedding_service.embed_texts(input)
        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}")
            raise
    
    def embed_query(self, input: List[str]) -> List[List[float]]:
        """
        Generate embeddings for query texts.
        
        Args:
            input: List of query texts to embed
            
        Returns:
            List of embedding vectors
        """
        # For now, use the same embedding method for queries
        return self(input)
    
    def embed_documents(self, input: List[str]) -> List[List[float]]:
        """
        Generate embeddings for document texts.
        
        Args:
            input: List of document texts to embed
            
        Returns:
            List of embedding vectors
        """
        # For now, use the same embedding method for documents
        return self(input)


# Global database instance
_linguistics_db: Optional[LinguisticsDB] = None


def get_database(
    persist_directory: Optional[Union[str, Path]] = None,
    reset_db: bool = False
) -> LinguisticsDB:
    """
    Get or create the global LinguisticsDB instance.
    
    Args:
        persist_directory: Directory for persistent storage
        reset_db: Whether to reset the database
        
    Returns:
        LinguisticsDB instance
    """
    global _linguistics_db
    if _linguistics_db is None or reset_db:
        _linguistics_db = LinguisticsDB(persist_directory=persist_directory, reset_db=reset_db)
    return _linguistics_db


def reset_database() -> None:
    """Reset the global database instance."""
    global _linguistics_db
    _linguistics_db = None
