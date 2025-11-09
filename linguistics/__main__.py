"""
Main entry point for the linguistics package.

This module provides the CLI interface for running the linguistics service.
"""

import asyncio
import sys
from pathlib import Path

from .config import config


def main() -> None:
    """Main entry point for the linguistics service."""
    print("🚀 Starting Linguistics Service...")
    
    # Validate configuration
    errors = config.validate_config()
    if errors:
        print("❌ Configuration errors:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    
    # Ensure directories exist
    config.ensure_directories()
    print(f"📁 Data directory: {config.DATA_DIR}")
    print(f"🗄️  ChromaDB path: {config.CHROMA_DB_PATH}")
    
    # Display configuration
    print(f"🤖 Gemini model: {config.GEMINI_MODEL_NAME}")
    print(f"🔤 Embedding model: {config.GEMINI_EMBEDDING_MODEL}")
    print(f"📊 Embedding dimension: {config.EMBEDDING_DIMENSION}")
    
    print("\n✅ Linguistics service is ready!")
    print("📚 See docs/linguistics-overview.md for detailed usage instructions")
    print("\n🔧 Available commands:")
    print("  make linguistics-test  # Run tests")
    print("  make lint             # Run linting")
    print("  make format           # Format code")


if __name__ == "__main__":
    main()
