<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Voice Assistant with Linguistics Module

This contains everything you need to run your AI voice assistant app locally, including an advanced linguistics module for enhanced language processing.

View your app in AI Studio: https://ai.studio/apps/drive/1D-Qm7HvyN7TzaJFIo4322UF9HfmmMwsN

## Run Locally

**Prerequisites:** Node.js, Python 3.8+

### Frontend (React App)

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the frontend:
   ```bash
   npm run dev
   ```

### Linguistics Module (Python Backend)

The linguistics module provides advanced language processing, RAG capabilities, memory management, and voice processing.

1. Install Python dependencies:
   ```bash
   make install
   ```

2. Set up environment variables (create `.env.local` if not exists):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Create necessary directories:
   ```bash
   make setup-dirs
   ```

4. Run the linguistics service:
   ```bash
   make linguistics-run
   ```

### Development Commands

- `make linguistics-test` - Run linguistics module tests
- `make lint` - Run Python linting checks
- `make format` - Format Python code
- `make validate-linguistics` - Validate package compilation

## Documentation

- [Linguistics Module Overview](docs/linguistics-overview.md) - Detailed setup and architecture guide
- [Data Directory](data/README.md) - Data structure and usage
- [HOSTING_GUIDE.md](HOSTING_GUIDE.md) - Deployment instructions
- [TTS_FALLBACK_GUIDE.md](TTS_FALLBACK_GUIDE.md) - Text-to-speech troubleshooting

## Architecture

```
├── linguistics/          # Python backend module
│   ├── database/         # ChromaDB integration
│   ├── rag/             # Retrieval-Augmented Generation
│   ├── memory/          # Conversation memory
│   ├── personas/        # AI personality profiles
│   ├── voice/           # Speech processing
│   └── config.py        # Configuration management
├── data/                # Data storage
│   ├── book.md          # Knowledge base
│   ├── chroma_db/       # Vector database
│   └── ...              # Other data files
├── scripts/             # Data ingestion utilities
└── docs/                # Documentation
```
