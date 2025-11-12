#!/usr/bin/env python3
"""
Setup script for linguistics database.

Loads book.md, chunks it using the RAG chunker, and populates the 
linguistics_book collection in ChromaDB with idempotent upserts.
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import Optional

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

# Load environment variables FIRST
if load_dotenv and Path('.env').exists():
    load_dotenv()

# Import modules directly to avoid coordinator import
import sys
import os
sys.path.insert(0, '/home/engine/project')

# Import linguistics modules
import linguistics.config as linguistics_config
import linguistics.rag.chunker as linguistics_chunker
import linguistics.database.chroma_client as linguistics_chroma
import linguistics.database.seed as linguistics_seed

BookChunker = linguistics_chunker.BookChunker
LinguisticsDB = linguistics_chroma.LinguisticsDB
seed_linguistics_book = linguistics_seed.seed_linguistics_book

# Use module directly (it's already an instance)
config = linguistics_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def setup_logging(verbose: bool = False) -> None:
    """Setup logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.getLogger().setLevel(level)
    
    # Reduce verbosity of some noisy libraries
    logging.getLogger('chromadb').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)


def validate_environment() -> bool:
    """Validate that required environment variables are set."""
    # Validate config
    errors = config.validate_config()
    
    if errors:
        logger.error("Configuration errors:")
        for error in errors:
            logger.error(f"  - {error}")
        return False
    
    return True


def check_book_file(book_path: Path) -> bool:
    """Check if the book file exists and is readable."""
    if not book_path.exists():
        logger.error(f"Book file not found: {book_path}")
        return False
    
    if not book_path.is_file():
        logger.error(f"Book path is not a file: {book_path}")
        return False
    
    try:
        # Try to read a small portion to verify it's text
        with open(book_path, 'r', encoding='utf-8') as f:
            f.read(100)
        return True
    except Exception as e:
        logger.error(f"Cannot read book file {book_path}: {e}")
        return False


def setup_database(
    book_path: Path,
    reset_db: bool = False,
    dry_run: bool = False,
    batch_size: int = 100,
    max_tokens: int = 512,
    min_tokens: int = 50,
    overlap_tokens: int = 50,
    verbose: bool = False
) -> bool:
    """
    Setup the linguistics database with book content.
    
    Args:
        book_path: Path to the book.md file
        reset_db: Whether to reset the database before setup
        dry_run: Whether to only simulate the process without making changes
        batch_size: Number of chunks to process in each batch
        max_tokens: Maximum tokens per chunk
        min_tokens: Minimum tokens per chunk
        overlap_tokens: Overlap tokens between chunks
        verbose: Enable verbose logging
        
    Returns:
        True if successful, False otherwise
    """
    setup_logging(verbose)
    
    # Validate environment
    if not validate_environment():
        logger.error("Environment validation failed")
        return False
    
    # Check book file
    if not check_book_file(book_path):
        logger.error("Book file validation failed")
        return False
    
    # Ensure data directories exist
    try:
        config.ensure_directories()
    except Exception as e:
        logger.error(f"Failed to create directories: {e}")
        return False
    
    # Database modules are already imported above
    
    # Initialize database
    try:
        db = LinguisticsDB(reset_db=reset_db)
        logger.info(f"Database initialized at: {db.persist_directory}")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        return False
    
    # Initialize chunker
    try:
        chunker = BookChunker(
            max_tokens=max_tokens,
            min_tokens=min_tokens,
            overlap_tokens=overlap_tokens
        )
        logger.info(f"Chunker initialized with max_tokens={max_tokens}, min_tokens={min_tokens}")
    except Exception as e:
        logger.error(f"Failed to initialize chunker: {e}")
        return False
    
    # Read and chunk the book
    try:
        logger.info(f"Reading book from: {book_path}")
        chunks, stats = chunker.chunk_batch(str(book_path))
        
        logger.info(f"Chunking completed:")
        logger.info(f"  Total chunks: {stats.total_chunks}")
        logger.info(f"  Total tokens: {stats.total_tokens:,}")
        logger.info(f"  Average tokens per chunk: {stats.avg_tokens_per_chunk:.1f}")
        logger.info(f"  Token range: {stats.min_tokens} - {stats.max_tokens}")
        logger.info(f"  Chapters found: {stats.chapters_found}")
        logger.info(f"  Sections found: {stats.sections_found}")
        
        if stats.total_chunks == 0:
            logger.error("No chunks were generated from the book")
            return False
            
    except Exception as e:
        logger.error(f"Failed to chunk book: {e}")
        return False
    
    # If dry run, stop here
    if dry_run:
        logger.info("DRY RUN: Would seed database with the above chunks")
        return True
    
    # Seed the database
    try:
        logger.info(f"Seeding database with {len(chunks)} chunks")
        successful, failed = seed_linguistics_book(
            db=db,
            chunks=chunks,
            upsert=True,
            batch_size=batch_size
        )
        
        logger.info(f"Seeding completed:")
        logger.info(f"  Successful chunks: {successful}")
        logger.info(f"  Failed chunks: {failed}")
        
        if failed > 0:
            logger.warning(f"Some chunks failed to process ({failed} out of {len(chunks)})")
        
        # Get final collection stats
        try:
            collection = db.get_collection("linguistics_book")
            count = collection.count()
            stats = {
                "collection_name": "linguistics_book",
                "document_count": count,
                "status": "active" if count > 0 else "empty"
            }
            logger.info(f"Final collection stats: {stats}")
        except Exception as e:
            logger.warning(f"Could not get final collection stats: {e}")
        
        return failed == 0
        
    except Exception as e:
        logger.error(f"Failed to seed database: {e}")
        return False


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Setup linguistics database with book content",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run to see what would happen
  python scripts/setup_linguistics_db.py --dry-run
  
  # Setup with default settings
  python scripts/setup_linguistics_db.py
  
  # Reset database and setup with custom chunking
  python scripts/setup_linguistics_db.py --reset --max-tokens 256 --batch-size 50
  
  # Verbose output
  python scripts/setup_linguistics_db.py --verbose
        """
    )
    
    parser.add_argument(
        "--book-path",
        type=str,
        default=str(config.DATA_DIR / "book.md"),
        help=f"Path to the book.md file (default: {config.DATA_DIR / 'book.md'})"
    )
    
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset the database before setup (delete all existing data)"
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate the process without making any database changes"
    )
    
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of chunks to process in each batch (default: 100)"
    )
    
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=512,
        help="Maximum tokens per chunk (default: 512)"
    )
    
    parser.add_argument(
        "--min-tokens",
        type=int,
        default=50,
        help="Minimum tokens per chunk (default: 50)"
    )
    
    parser.add_argument(
        "--overlap-tokens",
        type=int,
        default=50,
        help="Overlap tokens between chunks (default: 50)"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    # Convert book path to Path object
    book_path = Path(args.book_path).resolve()
    
    # Validate arguments
    if args.max_tokens <= 0:
        logger.error("--max-tokens must be positive")
        return 1
    
    if args.min_tokens < 0:
        logger.error("--min-tokens cannot be negative")
        return 1
    
    if args.overlap_tokens < 0:
        logger.error("--overlap-tokens cannot be negative")
        return 1
    
    if args.min_tokens > args.max_tokens:
        logger.error("--min-tokens cannot be greater than --max-tokens")
        return 1
    
    if args.batch_size <= 0:
        logger.error("--batch-size must be positive")
        return 1
    
    # Run setup
    success = setup_database(
        book_path=book_path,
        reset_db=args.reset,
        dry_run=args.dry_run,
        batch_size=args.batch_size,
        max_tokens=args.max_tokens,
        min_tokens=args.min_tokens,
        overlap_tokens=args.overlap_tokens,
        verbose=args.verbose
    )
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())