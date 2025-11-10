"""
Seeding utilities for linguistics database.

Provides helpers for bulk ingestion of documents into Chroma collections
with batching, retry logic, and progress tracking.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Tuple

try:
    from ..config import config
except ImportError:
    # For setup script when config import might fail
    class MockConfig:
        DATA_DIR = Path("data")
    config = MockConfig()

try:
    from .chroma_client import LinguisticsDB
except ImportError:
    LinguisticsDB = None

try:
    from .schema import Collections, validate_collection_metadata
except ImportError:
    Collections = None
    validate_collection_metadata = None

logger = logging.getLogger(__name__)


class DatabaseSeedError(Exception):
    """Exception raised during database seeding operations."""
    pass


class CollectionSeeder:
    """
    Helper class for seeding collections with document batches.
    
    Handles batching, retry logic, and validation for bulk document ingestion.
    """
    
    def __init__(
        self,
        db: LinguisticsDB,
        batch_size: int = 100,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        """
        Initialize the collection seeder.
        
        Args:
            db: LinguisticsDB instance
            batch_size: Number of documents to process in each batch
            max_retries: Maximum number of retry attempts per batch
            retry_delay: Delay between retries in seconds
        """
        self.db = db
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.retry_delay = retry_delay
    
    def seed_collection(
        self,
        collection_name: str,
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        ids: List[str],
        upsert: bool = True,
        show_progress: bool = True
    ) -> Tuple[int, int]:
        """
        Seed a collection with documents.
        
        Args:
            collection_name: Name of the collection to seed
            documents: List of document contents
            metadatas: List of metadata dictionaries
            ids: List of document IDs
            upsert: Whether to use upsert (update existing) or insert only
            show_progress: Whether to show progress information
            
        Returns:
            Tuple of (successful_documents, failed_documents)
            
        Raises:
            DatabaseSeedError: If validation fails
        """
        # Validate inputs
        if not (len(documents) == len(metadatas) == len(ids)):
            raise DatabaseSeedError(
                f"Mismatched lengths: {len(documents)} documents, "
                f"{len(metadatas)} metadatas, {len(ids)} ids"
            )
        
        # Validate metadata if validator is available
        if validate_collection_metadata:
            try:
                for i, metadata in enumerate(metadatas):
                    validate_collection_metadata(collection_name, metadata)
            except Exception as e:
                raise DatabaseSeedError(f"Metadata validation failed: {e}")
        
        # Get collection
        try:
            collection = self.db.get_collection(collection_name)
        except Exception as e:
            raise DatabaseSeedError(f"Failed to get collection {collection_name}: {e}")
        
        # Process in batches
        total_docs = len(documents)
        successful = 0
        failed = 0
        
        if show_progress:
            logger.info(f"Seeding {total_docs} documents into {collection_name}")
        
        for batch_start in range(0, total_docs, self.batch_size):
            batch_end = min(batch_start + self.batch_size, total_docs)
            batch_docs = documents[batch_start:batch_end]
            batch_metadatas = metadatas[batch_start:batch_end]
            batch_ids = ids[batch_start:batch_end]
            
            batch_success = self._process_batch(
                collection,
                batch_docs,
                batch_metadatas,
                batch_ids,
                upsert,
                batch_start,
                total_docs,
                show_progress
            )
            
            if batch_success:
                successful += len(batch_docs)
            else:
                failed += len(batch_docs)
        
        if show_progress:
            logger.info(
                f"Seeding completed: {successful} successful, {failed} failed "
                f"documents in {collection_name}"
            )
        
        return successful, failed
    
    def _process_batch(
        self,
        collection,
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        ids: List[str],
        upsert: bool,
        batch_start: int,
        total_docs: int,
        show_progress: bool
    ) -> bool:
        """
        Process a single batch of documents with retry logic.
        
        Returns:
            True if successful, False otherwise
        """
        last_error = None
        
        for attempt in range(self.max_retries + 1):
            try:
                if attempt > 0:
                    if show_progress:
                        logger.warning(
                            f"Retry attempt {attempt}/{self.max_retries} for batch "
                            f"{batch_start + 1}-{min(batch_start + self.batch_size, total_docs)}"
                        )
                    time.sleep(self.retry_delay * attempt)
                
                if upsert:
                    collection.upsert(
                        documents=documents,
                        metadatas=metadatas,
                        ids=ids
                    )
                else:
                    collection.add(
                        documents=documents,
                        metadatas=metadatas,
                        ids=ids
                    )
                
                if show_progress and attempt == 0:
                    progress = min(batch_start + self.batch_size, total_docs)
                    percentage = (progress / total_docs) * 100
                    logger.info(
                        f"Progress: {progress}/{total_docs} ({percentage:.1f}%)"
                    )
                
                return True
                
            except Exception as e:
                last_error = e
                if show_progress:
                    logger.warning(
                        f"Batch {batch_start + 1}-{min(batch_start + self.batch_size, total_docs)} "
                        f"failed on attempt {attempt + 1}: {e}"
                    )
                continue
        
        if show_progress:
            logger.error(
                f"Batch {batch_start + 1}-{min(batch_start + self.batch_size, total_docs)} "
                f"failed after {self.max_retries + 1} attempts. Last error: {last_error}"
            )
        
        return False
    
    def clear_collection(self, collection_name: str) -> bool:
        """
        Clear all documents from a collection.
        
        Args:
            collection_name: Name of the collection to clear
            
        Returns:
            True if successful, False otherwise
        """
        try:
            collection = self.db.get_collection(collection_name)
            collection.delete()  # Delete all documents
            logger.info(f"Cleared collection: {collection_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to clear collection {collection_name}: {e}")
            return False
    
    def get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        """
        Get statistics for a collection.
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            Dictionary with collection statistics
        """
        try:
            collection = self.db.get_collection(collection_name)
            count = collection.count()
            
            return {
                "collection_name": collection_name,
                "document_count": count,
                "status": "active" if count > 0 else "empty"
            }
        except Exception as e:
            logger.error(f"Failed to get stats for collection {collection_name}: {e}")
            return {
                "collection_name": collection_name,
                "document_count": 0,
                "status": "error",
                "error": str(e)
            }


def seed_linguistics_book(
    db: LinguisticsDB,
    chunks: List[Any],  # List of Chunk objects
    upsert: bool = True,
    batch_size: Optional[int] = None
) -> Tuple[int, int]:
    """
    Convenience function to seed linguistics_book collection.
    
    Args:
        db: LinguisticsDB instance
        chunks: List of Chunk objects
        upsert: Whether to use upsert operations
        batch_size: Custom batch size (uses default if None)
        
    Returns:
        Tuple of (successful_chunks, failed_chunks)
    """
    seeder = CollectionSeeder(db, batch_size=batch_size or 100)
    
    # Extract data from chunks
    documents = [chunk.content for chunk in chunks]
    metadatas = [chunk.metadata for chunk in chunks]
    ids = [chunk.id for chunk in chunks]
    
    collection_name = "linguistics_book"
    if Collections:
        collection_name = Collections.LINGUISTICS_BOOK
    
    return seeder.seed_collection(
        collection_name=collection_name,
        documents=documents,
        metadatas=metadatas,
        ids=ids,
        upsert=upsert
    )