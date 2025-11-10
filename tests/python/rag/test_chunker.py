"""
Tests for RAG chunker functionality.

Includes unit tests for chunking logic, metadata generation, 
and integration tests with ChromaDB.
"""

import tempfile
from pathlib import Path
from typing import Generator

import pytest

from linguistics.database.chroma_client import LinguisticsDB
from linguistics.database.seed import seed_linguistics_book
from linguistics.rag.chunker import BookChunker, Chunk, ChunkingStats


class TestBookChunker:
    """Test cases for BookChunker class."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.chunker = BookChunker(
            max_tokens=100,
            min_tokens=10,
            overlap_tokens=20
        )
        
        # Sample text for testing
        self.sample_text = """
# Глава 1 Введение

Это первая глава книги. Здесь мы изучаем основные концепции.

## Раздел 1.1 Основы

Здесь описываются базовые принципы работы с лингвистикой.
Мы рассмотрим важные аспекты:

- Фонетика
- Морфология  
- Синтаксис

### Подраздел 1.1.1 Фонетика

Фонетика изучает звуки речи. Это важная часть лингвистики.

## Раздел 1.2 Продвинутые темы

Более сложные концепции для изучения.

# Глава 2 Практика

Практические упражнения и примеры.
        """.strip()
    
    def test_chunker_initialization(self):
        """Test chunker initialization with different parameters."""
        chunker = BookChunker(max_tokens=200, min_tokens=20, overlap_tokens=30)
        assert chunker.max_tokens == 200
        assert chunker.min_tokens == 20
        assert chunker.overlap_tokens == 30
        assert chunker.encoding is not None
    
    def test_count_tokens(self):
        """Test token counting functionality."""
        text = "This is a test sentence for token counting."
        tokens = self.chunker.count_tokens(text)
        assert tokens > 0
        assert isinstance(tokens, int)
    
    def test_generate_chunk_id(self):
        """Test deterministic chunk ID generation."""
        content = "Test content"
        position = 5
        chapter = "Test Chapter"
        
        id1 = self.chunker.generate_chunk_id(content, position, chapter)
        id2 = self.chunker.generate_chunk_id(content, position, chapter)
        id3 = self.chunker.generate_chunk_id(content, position + 1, chapter)
        
        # Same inputs should produce same ID
        assert id1 == id2
        # Different position should produce different ID
        assert id1 != id3
        # IDs should start with "chunk_"
        assert id1.startswith("chunk_")
    
    def test_parse_markdown_structure(self):
        """Test markdown structure parsing."""
        structure = self.chunker.parse_markdown_structure(self.sample_text)
        
        # Should have headings and paragraphs
        headings = [s for s in structure if s['type'] == 'heading']
        paragraphs = [s for s in structure if s['type'] == 'paragraph']
        
        assert len(headings) >= 3  # At least 3 chapters/sections
        assert len(paragraphs) >= 3  # At least 3 paragraphs
        
        # Check heading structure
        chapter_headings = [h for h in headings if h['level'] <= 2]
        assert len(chapter_headings) >= 2  # At least 2 chapters
        
        # Check chapter tracking
        for element in structure:
            if element['type'] in ['heading', 'paragraph']:
                if element['level'] <= 2:
                    assert element['chapter'] is not None
    
    def test_create_chunk_metadata(self):
        """Test chunk metadata creation."""
        metadata = self.chunker.create_chunk_metadata(
            chapter="Глава 1",
            section="Раздел 1.1",
            level=2,
            position=5,
            chunk_type="content"
        )
        
        assert metadata['chapter'] == "Глава 1"
        assert metadata['section'] == "Раздел 1.1"
        assert metadata['level'] == 2
        assert metadata['position'] == 5
        assert metadata['chunk_type'] == "content"
        assert metadata['language'] == "ru"
        assert metadata['content_type'] == "lesson"
        assert metadata['difficulty_level'] == "intermediate"
        assert "tags" in metadata
        assert "глава_1" in metadata['tags']
    
    def test_chunk_content_by_structure(self):
        """Test content chunking respecting structure."""
        chunks = list(self.chunker.chunk_content(self.sample_text, respect_structure=True))
        
        assert len(chunks) > 0
        
        # Check chunk properties
        for chunk in chunks:
            assert isinstance(chunk, Chunk)
            assert chunk.id
            assert chunk.content.strip()
            assert chunk.token_count > 0
            assert isinstance(chunk.metadata, dict)
        
        # Should have heading chunks
        heading_chunks = [c for c in chunks if c.metadata.get('chunk_type') == 'heading']
        assert len(heading_chunks) > 0
    
    def test_chunk_content_by_tokens(self):
        """Test content chunking by tokens only."""
        chunks = list(self.chunker.chunk_content(self.sample_text, respect_structure=False))
        
        assert len(chunks) > 0
        
        # Check token limits
        for chunk in chunks:
            assert chunk.token_count <= self.chunker.max_tokens
            if len(chunks) > 1:  # Only check if we have multiple chunks
                assert chunk.token_count >= self.chunker.min_tokens or \
                       chunk == chunks[-1]  # Last chunk can be smaller
    
    def test_chunk_batch(self):
        """Test batch chunking with statistics."""
        chunks, stats = self.chunker.chunk_batch(self.sample_text)
        
        assert isinstance(chunks, list)
        assert isinstance(stats, ChunkingStats)
        assert len(chunks) == stats.total_chunks
        assert stats.total_tokens > 0
        assert stats.avg_tokens_per_chunk > 0
        assert stats.min_tokens <= stats.max_tokens
    
    def test_chunk_file(self):
        """Test chunking from file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
            f.write(self.sample_text)
            temp_file = Path(f.name)
        
        try:
            chunks = list(self.chunker.chunk_file(temp_file))
            assert len(chunks) > 0
            
            for chunk in chunks:
                assert isinstance(chunk, Chunk)
                assert chunk.content.strip()
        finally:
            temp_file.unlink()
    
    def test_chunk_file_not_found(self):
        """Test chunking non-existent file."""
        with pytest.raises(FileNotFoundError):
            list(self.chunker.chunk_file("non_existent_file.md"))
    
    def test_empty_content(self):
        """Test chunking empty content."""
        chunks = list(self.chunker.chunk_content(""))
        assert len(chunks) == 0
    
    def test_calculate_stats_empty(self):
        """Test statistics calculation with empty chunk list."""
        stats = self.chunker.calculate_stats([])
        assert stats.total_chunks == 0
        assert stats.total_tokens == 0
        assert stats.avg_tokens_per_chunk == 0.0
        assert stats.chapters_found == 0
        assert stats.sections_found == 0
    
    def test_chunk_validation(self):
        """Test Chunk validation."""
        # Valid chunk
        chunk = Chunk(
            id="test_id",
            content="Test content",
            metadata={"test": "data"},
            token_count=10
        )
        assert chunk.id == "test_id"
        assert chunk.content == "Test content"
        
        # Invalid chunks
        with pytest.raises(ValueError):
            Chunk(id="", content="content", metadata={}, token_count=10)
        
        with pytest.raises(ValueError):
            Chunk(id="id", content="", metadata={}, token_count=10)
        
        with pytest.raises(ValueError):
            Chunk(id="id", content="content", metadata={}, token_count=0)


class TestIntegrationWithChromaDB:
    """Integration tests with ChromaDB."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.chunker = BookChunker(max_tokens=100, min_tokens=10)
        
        # Small sample text for integration tests
        self.sample_text = """
# Тестовая глава

Это тестовый контент для проверки интеграции с ChromaDB.

## Раздел 1

Первый раздел с важной информацией.

## Раздел 2  

Второй раздел с дополнительными данными.
        """.strip()
    
    def teardown_method(self):
        """Cleanup test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_seed_chunks_to_chroma(self):
        """Test seeding chunks to ChromaDB."""
        # Create chunks
        chunks, _ = self.chunker.chunk_batch(self.sample_text)
        assert len(chunks) > 0
        
        # Initialize database
        db = LinguisticsDB(persist_directory=self.temp_dir, reset_db=True)
        
        # Seed chunks
        successful, failed = seed_linguistics_book(db, chunks, upsert=True)
        
        assert successful == len(chunks)
        assert failed == 0
        
        # Verify chunks were stored
        collection = db.get_collection("linguistics_book")
        count = collection.count()
        assert count == len(chunks)
        
        # Verify we can retrieve chunks
        results = collection.get(include=['documents', 'metadatas', 'ids'])
        assert len(results['documents']) == len(chunks)
        assert len(results['metadatas']) == len(chunks)
        assert len(results['ids']) == len(chunks)
        
        # Check metadata structure
        for metadata in results['metadatas']:
            assert 'chunk_type' in metadata
            assert 'position' in metadata
            assert 'language' in metadata
            assert 'content_type' in metadata


class TestChunkerEdgeCases:
    """Test edge cases and error conditions."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.chunker = BookChunker(max_tokens=50, min_tokens=5)
    
    def test_very_long_paragraph(self):
        """Test handling of very long paragraphs."""
        long_text = "Это очень длинный абзац. " * 100  # Repeat many times
        
        chunks = list(self.chunker.chunk_content(long_text, respect_structure=False))
        
        assert len(chunks) > 1  # Should be split into multiple chunks
        
        for chunk in chunks:
            assert chunk.token_count <= self.chunker.max_tokens


if __name__ == "__main__":
    pytest.main([__file__])