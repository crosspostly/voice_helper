<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Live Voice Assistant

A React-based voice assistant application powered by Google's Gemini AI. Features real-time voice interaction, multiple persona support, and multilingual capabilities.

## Quick Start

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your Gemini API key in the environment or use the included default:
   ```bash
   export GEMINI_API_KEY=your_api_key_here
   ```

3. Run the application:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser
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
