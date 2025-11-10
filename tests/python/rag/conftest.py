"""
Test configuration and fixtures for RAG module tests.

Provides common test utilities and mock configurations.
"""

import pytest
import sys
from pathlib import Path

# Add the project root to Python path for imports
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root / "linguistics"))


@pytest.fixture
def sample_linguistics_metadata():
    """Sample metadata for linguistics book documents."""
    return {
        "content_type": "lesson",
        "difficulty_level": "beginner", 
        "topic": "grammar",
        "subtopic": "nouns",
        "language": "en",
        "tags": ["basic", "essential"],
        "author": "Test Author",
        "version": "1.0"
    }


@pytest.fixture
def sample_retrieval_results():
    """Sample retrieval results for testing."""
    return [
        {
            "id": "doc1",
            "content": "Grammar is the structure of language. It includes rules for forming sentences and proper word usage.",
            "metadata": {
                "content_type": "lesson",
                "difficulty_level": "beginner",
                "topic": "grammar",
                "language": "en"
            },
            "similarity_score": 0.95,
            "normalized_score": 1.0
        },
        {
            "id": "doc2", 
            "content": "Practice exercises help reinforce grammar concepts through application and repetition.",
            "metadata": {
                "content_type": "exercise",
                "difficulty_level": "intermediate",
                "topic": "grammar", 
                "language": "en"
            },
            "similarity_score": 0.80,
            "normalized_score": 0.7
        },
        {
            "id": "doc3",
            "content": "Vocabulary refers to the words used in a language. Building vocabulary is essential for communication.",
            "metadata": {
                "content_type": "lesson",
                "difficulty_level": "beginner",
                "topic": "vocabulary",
                "language": "en"
            },
            "similarity_score": 0.75,
            "normalized_score": 0.5
        }
    ]


@pytest.fixture
def sample_conversation_history():
    """Sample conversation history for testing."""
    return [
        {"role": "user", "content": "Hi, I'm learning English."},
        {"role": "assistant", "content": "Hello! I'm here to help you learn English effectively."},
        {"role": "user", "content": "What should I start with?"},
        {"role": "assistant", "content": "I recommend starting with basic grammar and vocabulary."}
    ]


@pytest.fixture
def sample_persona_instructions():
    """Sample persona instructions for testing."""
    return """You are a patient and encouraging English teacher for beginners. Your teaching style includes:
1. Breaking down complex concepts into simple steps
2. Providing clear examples
3. Using encouraging language
4. Checking for understanding
5. Adapting to the student's pace

Always be supportive and make learning enjoyable."""