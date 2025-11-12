# Linguistics Module Overview

The linguistics module provides advanced language processing capabilities for the AI voice assistant, including database management, RAG (Retrieval-Augmented Generation), memory management, personas, and voice processing.

## Architecture

```
linguistics/
├── database/     # Database connectivity and management
├── rag/         # Retrieval-Augmented Generation
├── memory/      # Conversation memory management
├── personas/    # AI personality profiles
├── voice/       # Speech processing capabilities
└── config.py    # Centralized configuration
```

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- pip package manager
- Gemini API key

### Installation

1. **Install Python dependencies:**
   ```bash
   make install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file with:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Create necessary directories:**
   ```bash
   make setup-dirs
   ```

### Configuration

The linguistics module can be configured through environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | Required | Gemini API authentication key |
| `GEMINI_MODEL_NAME` | `gemini-1.5-pro` | Primary Gemini model |
| `CHROMA_DB_PATH` | `data/chroma_db` | Vector database location |
| `LINGUISTICS_DATA_DIR` | `data` | Data directory root |
| `EMBEDDING_DIMENSION` | `768` | Text embedding dimension |
| `MAX_RETRIEVAL_RESULTS` | `5` | Max RAG retrieval results |

### Running the Service

Start the linguistics service:
```bash
make linguistics-run
```

### Development

#### Testing
```bash
make linguistics-test
```

#### Code Quality
```bash
make lint    # Run linting checks
make format  # Format code
```

#### Validation
```bash
make validate-linguistics
```

## Module Details

### Database Module
Provides ChromaDB integration for vector storage and retrieval of linguistic data.

### RAG Module
Implements Retrieval-Augmented Generation to enhance AI responses with relevant context from the knowledge base.

### Memory Module
Manages conversation history and contextual information for coherent multi-turn dialogues.

### Personas Module
Handles AI personality profiles, allowing customization of behavior, tone, and response patterns.

### Voice Module
Provides speech-to-text and text-to-speech capabilities for voice interactions.

## Data Structure

- `data/book.md` - Primary knowledge base
- `data/chroma_db/` - Vector embeddings (auto-generated)
- `data/personas/` - Persona configuration files
- `data/memory/` - Conversation memory storage
- `data/transcripts/` - Session transcripts

## Integration

The linguistics module integrates with the main React application through:
- REST API endpoints (FastAPI)
- WebSocket connections for real-time communication
- Shared configuration through environment variables

## Troubleshooting

### Common Issues

1. **Missing API Key**: Ensure `GEMINI_API_KEY` is set in your environment
2. **Directory Permissions**: Run `make setup-dirs` to create necessary directories
3. **Import Errors**: Verify Python dependencies are installed with `make install`

### Debug Mode

Enable debug logging:
```bash
export LINGUISTICS_DEBUG=true
export LINGUISTICS_LOG_LEVEL=DEBUG
make linguistics-run
```
