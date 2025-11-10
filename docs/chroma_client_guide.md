# ChromaDB Client Guide

This guide explains how to use the linguistics ChromaDB client for storing and retrieving linguistic data, conversations, and user progress.

## Overview

The linguistics package provides a ChromaDB-based client for managing three main collections:

- **linguistics_book**: Educational content (lessons, exercises, examples)
- **user_conversations**: User chat sessions and interactions
- **user_progress**: User learning progress and skill tracking

## Quick Start

### Basic Setup

```python
from linguistics.database import get_database

# Get the database client (uses default ./data/chroma_db/ directory)
db = get_database()

# Or specify a custom directory
db = get_database(persist_directory="./my_chroma_db")
```

### With API Key

```python
import os
from linguistics.database import get_database

# Set your Gemini API key
os.environ["GEMINI_API_KEY"] = "your-api-key-here"

# Get database with embeddings enabled
db = get_database()
```

## Configuration

### Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key (required for embeddings)
- `CHROMA_DB_PATH`: Path to ChromaDB storage directory (default: `./data/chroma_db`)
- `GEMINI_EMBEDDING_MODEL`: Embedding model name (default: `text-embedding-004`)

### Database Directory Structure

```
./data/chroma_db/
├── linguistics_book/
├── user_conversations/
├── user_progress/
└── chroma.sqlite3
```

## Usage Examples

### 1. Storing Educational Content

```python
from linguistics.database import Collections, create_linguistics_book_metadata

# Create metadata for a lesson
metadata = create_linguistics_book_metadata(
    content_type="lesson",
    difficulty_level="beginner",
    topic="grammar",
    subtopic="present_tense",
    language="en",
    tags=["grammar", "verbs", "beginner"]
)

# Store the content
db.upsert(
    collection_name=Collections.LINGUISTICS_BOOK,
    ids=["lesson_001"],
    documents=["The present tense is used for actions happening now."],
    metadatas=[metadata]
)
```

### 2. Storing User Conversations

```python
from linguistics.database import Collections, create_user_conversation_metadata

# Create metadata for a conversation
metadata = create_user_conversation_metadata(
    user_id="user_123",
    session_id="session_456",
    persona_id="teacher_persona",
    language="en",
    conversation_type="lesson",
    tags=["grammar", "practice"]
)

# Store conversation messages
db.upsert(
    collection_name=Collections.USER_CONVERSATIONS,
    ids=["msg_001", "msg_002"],
    documents=[
        "How do I form the present tense?",
        "To form the present tense, use the base form of the verb..."
    ],
    metadatas=[metadata, metadata]
)
```

### 3. Tracking User Progress

```python
from linguistics.database import Collections, create_user_progress_metadata

# Create metadata for progress tracking
metadata = create_user_progress_metadata(
    user_id="user_123",
    language="en",
    skill_type="grammar",
    skill_level="beginner",
    progress_score=0.75,
    mastery_level=0.60,
    practice_count=5
)

# Store progress data
db.upsert(
    collection_name=Collections.USER_PROGRESS,
    ids=["progress_001"],
    documents=["User has completed 75% of beginner grammar curriculum"],
    metadatas=[metadata]
)
```

### 4. Querying Content

```python
# Search for similar content
results = db.query(
    collection_name=Collections.LINGUISTICS_BOOK,
    query_texts=["present tense verbs"],
    n_results=5,
    where={"difficulty_level": "beginner"}
)

# Get specific documents by ID
documents = db.get(
    collection_name=Collections.LINGUISTICS_BOOK,
    ids=["lesson_001", "lesson_002"]
)

# Query with metadata filters
results = db.query(
    collection_name=Collections.USER_CONVERSATIONS,
    query_texts=["grammar questions"],
    where={"user_id": "user_123"},
    n_results=10
)
```

## Error Handling

### Missing API Key

When the Gemini API key is missing, the client gracefully degrades:

```python
from linguistics.database import get_database
from linguistics.database.embeddings import MissingAPIKeyError

db = get_database()

if not db.is_embedding_available():
    print("Embeddings not available - using fallback")
    # Can still perform basic operations without embeddings
    results = db.get(collection_name=Collections.LINGUISTICS_BOOK, ids=["lesson_001"])
else:
    # Embeddings work normally
    results = db.query(collection_name=Collections.LINGUISTICS_BOOK, query_texts=["test"])
```

### Embedding Errors

```python
try:
    results = db.query(
        collection_name=Collections.LINGUISTICS_BOOK,
        query_texts=["search term"]
    )
except MissingAPIKeyError:
    print("Please set GEMINI_API_KEY environment variable")
except Exception as e:
    print(f"Database error: {e}")
```

## Database Management

### Resetting the Database

To reset the database without losing progress in other areas:

```python
from linguistics.database import get_database

# Option 1: Reset during initialization
db = get_database(reset_db=True)

# Option 2: Delete specific collections
db.delete_collection(Collections.LINGUISTICS_BOOK)

# Option 3: Delete specific documents
db.delete(
    collection_name=Collections.USER_CONVERSATIONS,
    where={"user_id": "user_123"}
)
```

### Backup and Restore

```python
import shutil
from pathlib import Path

# Backup
backup_path = Path("./backup/chroma_db")
shutil.copytree("./data/chroma_db", backup_path)

# Restore
shutil.rmtree("./data/chroma_db")
shutil.copytree(backup_path, "./data/chroma_db")
```

### Using Context Manager for Cleanup

```python
from linguistics.database import get_database

with get_database().cleanup() as db:
    # Perform database operations
    db.upsert(...)
    results = db.query(...)
    # Resources are automatically cleaned up
```

## Testing

Run the test suite to verify functionality:

```bash
# Run all database tests
pytest tests/python/database -v

# Run specific test file
pytest tests/python/database/test_chroma_client.py -v

# Run with coverage
pytest tests/python/database --cov=linguistics.database -v
```

## Best Practices

### 1. Always Validate Metadata

The schema validation ensures data consistency:

```python
# Use the helper functions for metadata creation
metadata = create_linguistics_book_metadata(
    content_type="lesson",
    difficulty_level="beginner",
    topic="grammar"
)  # Returns validated metadata

# Or validate manually
from linguistics.database import validate_collection_metadata
metadata = validate_collection_metadata(Collections.LINGUISTICS_BOOK, raw_metadata)
```

### 2. Handle Embedding Availability

```python
db = get_database()

if db.is_embedding_available():
    # Use semantic search
    results = db.query(collection_name=Collections.LINGUISTICS_BOOK, query_texts=["topic"])
else:
    # Use metadata filters only
    results = db.get(
        collection_name=Collections.LINGUISTICS_BOOK,
        where={"topic": "grammar"}
    )
```

### 3. Use Appropriate Collection Names

```python
from linguistics.database import Collections

# Use constants instead of strings
db.upsert(Collections.LINGUISTICS_BOOK, ...)  # Good
db.upsert("linguistics_book", ...)           # Avoid
```

### 4. Batch Operations

For better performance, batch operations when possible:

```python
# Good: Batch upsert
ids = [f"doc_{i}" for i in range(100)]
documents = [f"Document {i}" for i in range(100)]
metadatas = [{"batch": True} for _ in range(100)]

db.upsert(Collections.LINGUISTICS_BOOK, ids, documents, metadatas)

# Avoid: Individual upserts in loop
for i in range(100):
    db.upsert(Collections.LINGUISTICS_BOOK, [f"doc_{i}"], [f"Document {i}"], [{"batch": True}])
```

## Troubleshooting

### Common Issues

1. **"API key not configured"**: Set the `GEMINI_API_KEY` environment variable
2. **"Collection not found"**: Use `get_or_create_collection()` before operations
3. **"Invalid metadata"**: Use the provided metadata creation helpers
4. **"Database locked"**: Ensure only one process accesses the database at a time

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Now database operations will show detailed logs
db = get_database()
```

### Performance Tips

1. Use batch operations for bulk inserts/updates
2. Limit query results with `n_results`
3. Use metadata filters to reduce search space
4. Consider the embedding dimension when setting `EMBEDDING_DIMENSION`

## Integration with React App

The database client is designed to work seamlessly with the React frontend:

1. Set `GEMINI_API_KEY` in your environment
2. The client will automatically handle missing keys gracefully
3. Embeddings will work when available, fall back when not
4. All errors are caught and logged without breaking the UI

Example integration:

```python
# In your API endpoint
from linguistics.database import get_database, MissingAPIKeyError

def search_content(query):
    try:
        db = get_database()
        results = db.query(
            collection_name=Collections.LINGUISTICS_BOOK,
            query_texts=[query],
            n_results=5
        )
        return {"success": True, "results": results}
    except MissingAPIKeyError:
        return {"success": False, "error": "API key required for search"}
    except Exception as e:
        return {"success": False, "error": str(e)}
```
