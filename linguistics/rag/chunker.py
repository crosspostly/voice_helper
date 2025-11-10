"""
Book chunker for linguistics RAG system.

Parses book.md and splits it into structured chunks respecting headings,
paragraphs, and token limits. Attaches metadata including chapter, section,
and heading level information.
"""

import hashlib
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Generator, List, Optional, Tuple, Union

import tiktoken

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """Represents a chunk of text with metadata."""
    
    id: str
    content: str
    metadata: Dict[str, Union[str, int, List[str]]]
    token_count: int
    
    def __post_init__(self):
        """Validate chunk data after initialization."""
        if not self.content.strip():
            raise ValueError("Chunk content cannot be empty")
        if not self.id:
            raise ValueError("Chunk ID cannot be empty")
        if self.token_count <= 0:
            raise ValueError("Token count must be positive")


@dataclass
class ChunkingStats:
    """Statistics for chunking operations."""
    
    total_chunks: int
    total_tokens: int
    avg_tokens_per_chunk: float
    min_tokens: int
    max_tokens: int
    chapters_found: int
    sections_found: int


class BookChunker:
    """
    Chunks book content into semantically meaningful pieces.
    
    Respects markdown heading hierarchy, paragraph boundaries, and token limits.
    Generates deterministic IDs based on content hash and position.
    """
    
    def __init__(
        self,
        max_tokens: int = 512,
        min_tokens: int = 50,
        overlap_tokens: int = 50,
        encoding_name: str = "cl100k_base"
    ):
        """
        Initialize the book chunker.
        
        Args:
            max_tokens: Maximum tokens per chunk
            min_tokens: Minimum tokens per chunk (smaller chunks will be merged)
            overlap_tokens: Number of tokens to overlap between chunks
            encoding_name: Name of the tiktoken encoding to use
        """
        self.max_tokens = max_tokens
        self.min_tokens = min_tokens
        self.overlap_tokens = overlap_tokens
        
        try:
            self.encoding = tiktoken.get_encoding(encoding_name)
        except KeyError:
            logger.warning(f"Encoding {encoding_name} not found, falling back to cl100k_base")
            self.encoding = tiktoken.get_encoding("cl100k_base")
        
        # Regex patterns for markdown parsing
        self.heading_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
        self.section_pattern = re.compile(r'^:::\s*(\w+)', re.MULTILINE)
        self.separator_pattern = re.compile(r'^-{4,}$', re.MULTILINE)
        
    def count_tokens(self, text: str) -> int:
        """Count tokens in text using the configured encoding."""
        return len(self.encoding.encode(text))
    
    def generate_chunk_id(self, content: str, position: int, chapter: Optional[str] = None) -> str:
        """
        Generate a deterministic ID for a chunk.
        
        Args:
            content: The chunk content
            position: Position index in the document
            chapter: Optional chapter name for additional context
            
        Returns:
            Deterministic chunk ID
        """
        # Create a hash of content + position + optional chapter
        hash_input = f"{content}_{position}"
        if chapter:
            hash_input += f"_{chapter}"
        
        content_hash = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()[:12]
        return f"chunk_{content_hash}_{position}"
    
    def parse_markdown_structure(self, content: str) -> List[Dict]:
        """
        Parse markdown content into a structured hierarchy.
        
        Returns:
            List of dictionaries representing the document structure
        """
        lines = content.split('\n')
        structure = []
        current_chapter = None
        current_section = None
        current_level = 0
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Skip empty lines and separators
            if not line or self.separator_pattern.match(line):
                i += 1
                continue
            
            # Check for headings
            heading_match = self.heading_pattern.match(line)
            if heading_match:
                level = len(heading_match.group(1))
                title = heading_match.group(2).strip()
                
                if level <= 2:  # Chapter level
                    current_chapter = title
                    current_section = None
                    current_level = level
                else:  # Section level
                    current_section = title
                    current_level = level
                
                structure.append({
                    'type': 'heading',
                    'level': level,
                    'title': title,
                    'chapter': current_chapter,
                    'section': current_section,
                    'line_start': i,
                    'line_end': i
                })
                i += 1
                continue
            
            # Check for section markers
            section_match = self.section_pattern.match(line)
            if section_match:
                current_section = section_match.group(1)
                structure.append({
                    'type': 'section',
                    'name': current_section,
                    'chapter': current_chapter,
                    'section': current_section,
                    'line_start': i,
                    'line_end': i
                })
                i += 1
                continue
            
            # Regular content paragraph
            paragraph_lines = []
            paragraph_start = i
            
            # Collect consecutive non-empty lines as a paragraph
            while i < len(lines) and lines[i].strip():
                paragraph_lines.append(lines[i])
                i += 1
            
            if paragraph_lines:
                paragraph_content = '\n'.join(paragraph_lines)
                structure.append({
                    'type': 'paragraph',
                    'content': paragraph_content,
                    'chapter': current_chapter,
                    'section': current_section,
                    'level': current_level,
                    'line_start': paragraph_start,
                    'line_end': i - 1
                })
            
            i += 1
        
        return structure
    
    def create_chunk_metadata(
        self,
        chapter: Optional[str],
        section: Optional[str],
        level: int,
        position: int,
        chunk_type: str = "content"
    ) -> Dict[str, Union[str, int, List[str]]]:
        """
        Create metadata for a chunk.
        
        Args:
            chapter: Chapter name if available
            section: Section name if available
            level: Heading level
            position: Position in document
            chunk_type: Type of chunk (heading, content, etc.)
            
        Returns:
            Metadata dictionary
        """
        metadata = {
            "chunk_type": chunk_type,
            "position": position,
            "heading_level": level,
            "language": "ru",  # Book appears to be in Russian
            "content_type": "lesson",
            "difficulty_level": "intermediate",
            "topic": "linguistics"
        }
        
        if chapter:
            metadata["chapter"] = chapter
            metadata["tags"] = [chapter.lower().replace(" ", "_")]
        
        if section:
            metadata["section"] = section
            if "tags" in metadata:
                metadata["tags"].append(section.lower().replace(" ", "_"))
            else:
                metadata["tags"] = [section.lower().replace(" ", "_")]
        
        return metadata
    
    def chunk_content(
        self,
        content: str,
        respect_structure: bool = True
    ) -> Generator[Chunk, None, None]:
        """
        Split content into chunks.
        
        Args:
            content: The content to chunk
            respect_structure: Whether to respect markdown structure
            
        Yields:
            Chunk objects
        """
        if not content.strip():
            return
        
        if respect_structure:
            yield from self._chunk_by_structure(content)
        else:
            yield from self._chunk_by_tokens(content)
    
    def _chunk_by_structure(self, content: str) -> Generator[Chunk, None, None]:
        """Chunk content respecting markdown structure."""
        structure = self.parse_markdown_structure(content)
        position = 0
        
        current_chunk_content = []
        current_metadata = None
        current_tokens = 0
        
        for element in structure:
            element_content = element.get('content', element.get('title', ''))
            element_tokens = self.count_tokens(element_content)
            
            # Handle headings separately
            if element['type'] == 'heading':
                # Yield current chunk if it exists
                if current_chunk_content:
                    yield self._create_chunk_from_buffer(
                        current_chunk_content,
                        current_metadata,
                        current_tokens,
                        position
                    )
                    position += 1
                
                # Create heading chunk
                heading_metadata = self.create_chunk_metadata(
                    chapter=element.get('chapter'),
                    section=element.get('section'),
                    level=element['level'],
                    position=position,
                    chunk_type="heading"
                )
                
                heading_chunk = Chunk(
                    id=self.generate_chunk_id(element_content, position, element.get('chapter')),
                    content=element_content,
                    metadata=heading_metadata,
                    token_count=element_tokens
                )
                yield heading_chunk
                position += 1
                
                # Reset buffer
                current_chunk_content = []
                current_metadata = self.create_chunk_metadata(
                    chapter=element.get('chapter'),
                    section=element.get('section'),
                    level=element['level'],
                    position=position
                )
                current_tokens = 0
                continue
            
            # Add content to current chunk
            if current_tokens + element_tokens > self.max_tokens:
                # Current chunk is full, yield it
                if current_chunk_content:
                    yield self._create_chunk_from_buffer(
                        current_chunk_content,
                        current_metadata,
                        current_tokens,
                        position
                    )
                    position += 1
                
                # Start new chunk with overlap if needed
                if self.overlap_tokens > 0 and current_chunk_content:
                    overlap_content = self._create_overlap_content(current_chunk_content)
                    current_chunk_content = overlap_content
                    current_tokens = sum(self.count_tokens(c) for c in overlap_content)
                else:
                    current_chunk_content = []
                    current_tokens = 0
                
                # Update metadata for new chunk
                current_metadata = self.create_chunk_metadata(
                    chapter=element.get('chapter'),
                    section=element.get('section'),
                    level=element.get('level', 0),
                    position=position
                )
            
            # Add element to current chunk
            current_chunk_content.append(element_content)
            current_tokens += element_tokens
        
        # Yield final chunk
        if current_chunk_content:
            yield self._create_chunk_from_buffer(
                current_chunk_content,
                current_metadata,
                current_tokens,
                position
            )
    
    def _chunk_by_tokens(self, content: str) -> Generator[Chunk, None, None]:
        """Chunk content by tokens only, ignoring structure."""
        tokens = self.encoding.encode(content)
        position = 0
        
        i = 0
        while i < len(tokens):
            # Calculate chunk boundaries
            end_idx = min(i + self.max_tokens, len(tokens))
            chunk_tokens = tokens[i:end_idx]
            chunk_content = self.encoding.decode(chunk_tokens)
            token_count = len(chunk_tokens)
            
            # Skip chunks that are too small (except at the end)
            if token_count < self.min_tokens and end_idx < len(tokens):
                i += 1
                continue
            
            metadata = self.create_chunk_metadata(
                chapter=None,
                section=None,
                level=0,
                position=position,
                chunk_type="content"
            )
            
            chunk = Chunk(
                id=self.generate_chunk_id(chunk_content, position),
                content=chunk_content,
                metadata=metadata,
                token_count=token_count
            )
            yield chunk
            position += 1
            
            # Move to next chunk with overlap
            i = max(i + 1, end_idx - self.overlap_tokens)
    
    def _create_chunk_from_buffer(
        self,
        content_buffer: List[str],
        metadata: Dict[str, Union[str, int, List[str]]],
        token_count: int,
        position: int
    ) -> Chunk:
        """Create a chunk from content buffer."""
        content = '\n\n'.join(content_buffer)
        chapter = metadata.get('chapter')
        
        return Chunk(
            id=self.generate_chunk_id(content, position, chapter),
            content=content,
            metadata=metadata,
            token_count=token_count
        )
    
    def _create_overlap_content(self, content_buffer: List[str]) -> List[str]:
        """Create overlap content from the end of current buffer."""
        overlap_content = []
        overlap_tokens = 0
        
        # Work backwards to include as much content as possible within overlap limit
        for content in reversed(content_buffer):
            content_tokens = self.count_tokens(content)
            if overlap_tokens + content_tokens > self.overlap_tokens:
                break
            overlap_content.insert(0, content)
            overlap_tokens += content_tokens
        
        return overlap_content
    
    def chunk_file(
        self,
        file_path: Union[str, Path],
        respect_structure: bool = True
    ) -> Generator[Chunk, None, None]:
        """
        Chunk a markdown file.
        
        Args:
            file_path: Path to the markdown file
            respect_structure: Whether to respect markdown structure
            
        Yields:
            Chunk objects
        """
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            logger.info(f"Chunking file: {file_path}")
            yield from self.chunk_content(content, respect_structure)
            
        except Exception as e:
            logger.error(f"Error chunking file {file_path}: {e}")
            raise
    
    def chunk_batch(
        self,
        content: str,
        respect_structure: bool = True
    ) -> Tuple[List[Chunk], ChunkingStats]:
        """
        Chunk content and return all chunks with statistics.
        
        Args:
            content: Content to chunk
            respect_structure: Whether to respect markdown structure
            
        Returns:
            Tuple of (chunks list, statistics)
        """
        chunks = list(self.chunk_content(content, respect_structure))
        stats = self.calculate_stats(chunks)
        return chunks, stats
    
    def calculate_stats(self, chunks: List[Chunk]) -> ChunkingStats:
        """Calculate statistics for a list of chunks."""
        if not chunks:
            return ChunkingStats(0, 0, 0.0, 0, 0, 0, 0)
        
        token_counts = [chunk.token_count for chunk in chunks]
        chapters = set(chunk.metadata.get('chapter') for chunk in chunks if chunk.metadata.get('chapter'))
        sections = set(chunk.metadata.get('section') for chunk in chunks if chunk.metadata.get('section'))
        
        return ChunkingStats(
            total_chunks=len(chunks),
            total_tokens=sum(token_counts),
            avg_tokens_per_chunk=sum(token_counts) / len(token_counts),
            min_tokens=min(token_counts),
            max_tokens=max(token_counts),
            chapters_found=len(chapters),
            sections_found=len(sections)
        )