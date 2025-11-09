# Data Directory

This directory contains data files and storage for the linguistics module.

## Structure

- `book.md` - Knowledge base content for RAG system
- `chroma_db/` - ChromaDB vector database storage (auto-created)
- `personas/` - Persona configuration files (auto-created)
- `memory/` - Conversation memory storage (auto-created)
- `transcripts/` - Conversation transcripts (auto-created)

## Usage

The data directories are automatically created by the linguistics package when first run. You can also manually create them using:

```bash
make setup-dirs
```

## Notes

- `chroma_db/` is excluded from git tracking as it contains generated vector embeddings
- Configuration files in `personas/` can be customized for different AI personalities
- Memory and transcript files are stored in JSON format for easy parsing
