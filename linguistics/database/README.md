# Linguistics Database

A ChromaDB-based client for storing and retrieving linguistic data, conversations, and user progress.

## Features

- **Persistent Storage**: Uses ChromaDB for efficient vector storage and retrieval
- **Gemini Embeddings**: Integration with Google's text-embedding-004 model
- **Graceful Degradation**: Works without API key using fallback embeddings
- **Schema Validation**: Built-in metadata validation using Pydantic
- **Type Safety**: Full TypeScript-style type annotations
- **Comprehensive Testing**: 100% test coverage with pytest

## Quick Start

```python
from linguistics.database import get_database, Collections

# Initialize database (creates ./data/chroma_db if needed)
db = get_database()

# Check if embeddings are available
if db.is_embedding_available():
    print("✅ Gemini embeddings ready")
else:
    print("⚠️  Set GEMINI_API_KEY to enable embeddings")

# Store content
db.upsert(
    collection_name=Collections.LINGUISTICS_BOOK,
    ids=["lesson_001"],
    documents=["The present tense describes current actions..."],
    metadatas=[{
        "content_type": "lesson",
        "difficulty_level": "beginner",
        "topic": "grammar",
        "language": "en"
    }]
)

# Search content
results = db.query(
    collection_name=Collections.LINGUISTICS_BOOK,
    query_texts=["present tense"],
    n_results=5
)
```

## Collections

### linguistics_book
Educational content including lessons, exercises, examples, and explanations.

**Metadata fields:**
- `content_type`: lesson, exercise, example, explanation, dialogue, story
- `difficulty_level`: beginner, intermediate, advanced
- `topic`: grammar, vocabulary, pronunciation, etc.
- `language`: ISO 639-1 language code (e.g., "en", "es")
- `tags`: List of categorization tags

### user_conversations
User chat sessions and interactions.

**Metadata fields:**
- `user_id`: Unique user identifier
- `session_id`: Unique session identifier
- `persona_id`: Persona used in conversation
- `conversation_type`: chat, lesson, exercise, assessment, practice
- `language`: Language code
- `context`: Additional context information

### user_progress
User learning progress and skill tracking.

**Metadata fields:**
- `user_id`: Unique user identifier
- `skill_type`: vocabulary, grammar, pronunciation, listening, speaking, reading, writing
- `skill_level`: beginner, intermediate, advanced
- `progress_score`: 0.0 to 1.0
- `mastery_level`: 0.0 to 1.0
- `practice_count`: Number of practice sessions
- `difficulty_preference`: adaptive, easy, medium, hard

## Configuration

Environment variables:

```bash
# Required for embeddings
export GEMINI_API_KEY="your-gemini-api-key"

# Optional: Custom database path
export CHROMA_DB_PATH="./custom/chroma_db"

# Optional: Custom embedding model
export GEMINI_EMBEDDING_MODEL="text-embedding-004"
```

## API Reference

### LinguisticsDB

Main database client class.

#### Methods

- `upsert(collection_name, ids, documents, metadatas)`: Add/update documents
- `query(collection_name, query_texts, n_results, where, include)`: Search documents
- `get(collection_name, ids, where, limit, offset, include)`: Retrieve documents
- `delete(collection_name, ids, where, where_document)`: Remove documents
- `count(collection_name)`: Count documents in collection
- `list_collections()`: List all collections
- `delete_collection(collection_name)`: Delete entire collection

### Schema Helpers

- `create_linguistics_book_metadata(...)`: Create validated metadata
- `create_user_conversation_metadata(...)`: Create validated metadata
- `create_user_progress_metadata(...)`: Create validated metadata

### Global Functions

- `get_database(persist_directory, reset_db)`: Get singleton database instance
- `reset_database()`: Reset global database instance

## Error Handling

The client handles errors gracefully:

```python
from linguistics.database import get_database
from linguistics.database.embeddings import MissingAPIKeyError

db = get_database()

try:
    results = db.query(
        collection_name="linguistics_book",
        query_texts=["search term"]
    )
except MissingAPIKeyError:
    print("Set GEMINI_API_KEY to enable semantic search")
    # Fall back to metadata-only search
    results = db.get(
        collection_name="linguistics_book",
        where={"topic": "grammar"}
    )
except Exception as e:
    print(f"Database error: {e}")
```

## Testing

Run the test suite:

```bash
# Run all database tests
pytest tests/python/database -v

# Run with coverage
pytest tests/python/database --cov=linguistics.database -v

# Run specific test
pytest tests/python/database/test_chroma_client.py::TestLinguisticsDB::test_upsert_documents -v
```

## Examples

See `examples/chroma_client_example.py` for a complete working example.

## Database Reset

To reset the database without losing progress:

```python
from linguistics.database import get_database

# Reset entire database
db = get_database(reset_db=True)

# Or delete specific collections
db.delete_collection("linguistics_book")

# Or delete specific documents
db.delete(
    collection_name="user_conversations",
    where={"user_id": "user_123"}
)
```

## Performance Tips

1. **Batch Operations**: Use upsert for multiple documents at once
2. **Metadata Filters**: Use `where` clauses to reduce search space
3. **Limit Results**: Set appropriate `n_results` values
4. **Selective Fields**: Use `include` parameter to fetch only needed data

## Troubleshooting

### Common Issues

1. **"API key not configured"**: Set `GEMINI_API_KEY` environment variable
2. **"Collection not found"**: Use `get_or_create_collection()` before operations
3. **"Invalid metadata"**: Use provided metadata creation helpers
4. **"Database locked"**: Ensure only one process accesses the database

### Debug Mode

```python
import logging
logging.basicConfig(level=logging.DEBUG)

db = get_database()
# Database operations will show detailed logs
```

## Integration with React App

The client is designed to work seamlessly with the React frontend:

1. Set `GEMINI_API_KEY` in your environment
2. Client handles missing keys gracefully
3. Embeddings work when available, fall back when not
4. All errors are caught and logged without breaking the UI

Example API endpoint:

```python
from linguistics.database import get_database, MissingAPIKeyError

def search_content(query):
    try:
        db = get_database()
        results = db.query(
            collection_name="linguistics_book",
            query_texts=[query],
            n_results=5
        )
        return {"success": True, "results": results}
    except MissingAPIKeyError:
        return {"success": False, "error": "API key required for search"}
    except Exception as e:
        return {"success": False, "error": str(e)}
```
