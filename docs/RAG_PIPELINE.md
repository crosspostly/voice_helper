# RAG (Retrieval-Augmented Generation) Pipeline

This document describes the RAG pipeline implementation for the linguistics package, which enhances AI responses with relevant context from stored knowledge bases and documents.

## Overview

The RAG pipeline consists of two main components:

1. **BookRetriever** - Performs semantic search against the `linguistics_book` collection
2. **ResponseGenerator** - Assembles prompts and generates responses using Gemini AI

The flow follows: **Query → Retrieval → Context Injection → Response Generation**

## Architecture

```
User Query
    ↓
BookRetriever (semantic search)
    ↓
Retrieved Context (Ranked documents)
    ↓
ResponseGenerator (prompt assembly + Gemini)
    ↓
Enhanced Response with sources
```

## BookRetriever

The `BookRetriever` class provides semantic search capabilities against the linguistics knowledge base.

### Key Features

- **Semantic Search**: Uses embeddings to find conceptually similar content
- **Metadata Filtering**: Filter by content type, difficulty level, topic, etc.
- **Score Normalization**: Normalizes similarity scores to 0-1 range
- **Bulk Retrieval**: Search multiple queries simultaneously
- **Threshold Filtering**: Only return results above similarity threshold

### Usage Example

```python
from linguistics.rag import BookRetriever

# Initialize retriever
retriever = BookRetriever(
    similarity_threshold=0.7,
    max_results=5
)

# Basic semantic search
results = retriever.search("What is grammar?")

# Search with filters
filters = {
    "difficulty_level": "beginner",
    "content_type": "lesson",
    "topic": "grammar"
}
results = retriever.search("grammar rules", filters=filters)

# Bulk search for lesson planning
queries = ["basic grammar", "vocabulary building", "pronunciation"]
bulk_results = retriever.bulk_search(queries)
```

### Filtering Options

| Filter | Description | Example |
|--------|-------------|---------|
| `content_type` | Type of content | `"lesson"`, `"exercise"`, `"example"` |
| `difficulty_level` | Difficulty level | `"beginner"`, `"intermediate"`, `"advanced"` |
| `topic` | Main topic | `"grammar"`, `"vocabulary"`, `"pronunciation"` |
| `subtopic` | Specific subtopic | `"nouns"`, `"verbs"`, `"tenses"` |
| `language` | Language code | `"en"`, `"es"`, `"fr"` |
| `tags` | Content tags | `["basic", "essential"]` |
| `chapter` | Chapter number | `"1"`, `"2.1"` |
| `level` | Alias for difficulty_level | `"beginner"` |

### RetrievalResult Structure

```python
class RetrievalResult:
    id: str                    # Document ID
    content: str               # Document content
    metadata: dict             # Document metadata
    similarity_score: float     # Raw similarity score (0-1)
    normalized_score: float    # Normalized score across results
```

## ResponseGenerator

The `ResponseGenerator` class assembles prompts and generates responses using Google's Gemini AI.

### Key Features

- **Prompt Assembly**: Combines persona instructions, context, and history
- **Context Injection**: Intelligently injects retrieved context into prompts
- **Fallback Handling**: Graceful degradation when Gemini is unavailable
- **Token Management**: Respects token limits and context size constraints
- **Source Attribution**: Includes source information in responses

### Usage Example

```python
from linguistics.rag import ResponseGenerator, BookRetriever

# Initialize components
retriever = BookRetriever()
generator = ResponseGenerator(
    api_key="your-gemini-api-key",
    model_name="gemini-1.5-pro",
    max_tokens=2048,
    temperature=0.7
)

# Retrieve relevant context
query = "How should beginners learn grammar?"
context = retriever.search(query, top_k=3)

# Generate response
result = generator.generate_response(
    query=query,
    context=context,
    persona_instructions="You are a patient English teacher for beginners.",
    conversation_history=[
        {"role": "user", "content": "Hi, I'm new to English."},
        {"role": "assistant", "content": "Hello! I'm here to help you learn."}
    ]
)

print(result.content)          # Generated response
print(result.sources)          # Source documents used
print(result.fallback_used)    # Whether fallback was used
```

### GenerationResult Structure

```python
class GenerationResult:
    content: str              # Generated response text
    sources: List[dict]       # Source documents used
    model_used: str          # Model that generated response
    fallback_used: bool       # Whether fallback response was used
    generation_time: float    # Time taken to generate (seconds)
    token_count: int         # Number of tokens in response
    error: str              # Error message if generation failed
```

## Configuration

### RAG Settings

The following configuration parameters are available in `linguistics/config.py`:

```python
# RAG Configuration
EMBEDDING_DIMENSION: int = 768                    # Embedding vector size
MAX_RETRIEVAL_RESULTS: int = 5                    # Default max results
SIMILARITY_THRESHOLD: float = 0.7                 # Minimum similarity score

# Gemini Configuration  
GEMINI_API_KEY: str                               # API key
GEMINI_MODEL_NAME: str = "gemini-1.5-pro"         # Model to use
GEMINI_EMBEDDING_MODEL: str = "text-embedding-004" # Embedding model
```

### Tuning Parameters

#### Retrieval Parameters

- **`similarity_threshold`**: Controls result quality vs. quantity
  - Higher (0.8-0.9): Fewer but more relevant results
  - Lower (0.5-0.7): More results but potentially less relevant
  
- **`max_results`**: Maximum number of documents to retrieve
  - 3-5 for focused responses
  - 8-10 for comprehensive research
  
- **`top_k`**: Number of results to include in prompt
  - Should be ≤ `max_results`
  - 2-4 recommended for most use cases

#### Generation Parameters

- **`temperature`**: Response creativity (0.0-1.0)
  - 0.0-0.3: Factual, consistent responses
  - 0.4-0.7: Balanced creativity and accuracy
  - 0.8-1.0: More creative, varied responses
  
- **`max_tokens`**: Response length limit
  - 500-1000: Short, concise answers
  - 1500-2048: Detailed explanations
  - 3000+: Comprehensive responses

## Prompt Engineering

### Prompt Structure

The generator assembles prompts in this order:

1. **Persona Instructions** - How the AI should behave
2. **Context Information** - Retrieved documents with sources
3. **Conversation History** - Recent dialogue (last 5 messages)
4. **User Question** - Current query
5. **Response Guidelines** - Instructions for response format

### Persona Instructions

Effective persona instructions include:

```python
persona_instructions = """You are a patient and encouraging English teacher for beginners. 

Your teaching approach:
- Break down complex concepts into simple steps
- Provide clear, relatable examples
- Use encouraging and supportive language
- Check for understanding before proceeding
- Adapt explanations to the student's level

Always make learning feel achievable and enjoyable."""
```

### Context Formatting

Retrieved context is formatted as:

```
CONTEXT INFORMATION:
Source 1 [Type: lesson, Level: beginner, Topic: grammar]:
Grammar is the structure of language...

Source 2 [Type: exercise, Level: intermediate, Topic: grammar]:
Practice exercises help reinforce...
```

## Error Handling and Fallbacks

### Fallback Scenarios

1. **Model Unavailable**: API key issues, model downtime
2. **Rate Limiting**: Too many requests
3. **Timeout**: Request takes too long
4. **Empty Response**: Model returns no content

### Fallback Templates

Default fallback responses:

```python
fallback_templates = {
    "error": "I apologize, but I'm having trouble generating a response right now. Please try again later.",
    "timeout": "I'm taking longer than expected to respond. Please try your question again.",
    "no_context": "I don't have specific information about that topic in my knowledge base.",
    "general": "I'm here to help with language learning. Could you please clarify your question?"
}
```

### Custom Fallbacks

```python
generator.set_fallback_template(
    "grammar_specific",
    "I'm having trouble accessing my grammar resources right now. Let me help you with a different approach."
)
```

## Performance Considerations

### Retrieval Optimization

- **Indexing**: Ensure ChromaDB collection is properly indexed
- **Batching**: Use `bulk_search()` for multiple queries
- **Filtering**: Apply metadata filters before semantic search
- **Caching**: Cache frequent queries when appropriate

### Generation Optimization

- **Context Limiting**: Limit `max_context_items` to control prompt size
- **History Limiting**: Conversation history is limited to last 5 messages
- **Token Monitoring**: Monitor token usage to avoid limits
- **Timeout Settings**: Set appropriate timeouts for your use case

## Testing

### Unit Tests

Run unit tests for individual components:

```bash
# Test retriever
python -m pytest tests/python/rag/test_retriever.py -v

# Test generator  
python -m pytest tests/python/rag/test_generator.py -v
```

### Integration Tests

Test complete RAG pipeline:

```bash
python -m pytest tests/python/rag/test_integration.py -v
```

### Test Coverage

Run with coverage reporting:

```bash
python -m pytest tests/python/rag/ --cov=linguistics.rag --cov-report=html
```

## Best Practices

### Retrieval Best Practices

1. **Use Specific Queries**: More specific queries yield better results
2. **Apply Filters**: Use metadata filters to narrow search scope
3. **Set Appropriate Thresholds**: Balance relevance vs. coverage
4. **Monitor Scores**: Track similarity scores for quality control

### Generation Best Practices

1. **Craft Clear Personas**: Specific, detailed persona instructions
2. **Limit Context Size**: Stay within token limits
3. **Handle Errors Gracefully**: Always have fallback strategies
4. **Track Performance**: Monitor generation time and success rates

### Integration Best Practices

1. **Validate Inputs**: Check queries and parameters before processing
2. **Log Operations**: Track retrieval and generation for debugging
3. **Cache Results**: Cache frequent query-response pairs
4. **Monitor Costs**: Track API usage and token consumption

## Troubleshooting

### Common Issues

#### No Retrieval Results

**Problem**: Search returns empty results
**Solutions**:
- Lower `similarity_threshold`
- Check query specificity
- Verify collection has data
- Review metadata filters

#### Poor Quality Responses

**Problem**: Responses are irrelevant or low quality
**Solutions**:
- Improve persona instructions
- Increase `temperature` slightly
- Add more relevant context
- Review prompt structure

#### Rate Limiting

**Problem**: API rate limit errors
**Solutions**:
- Implement request queuing
- Use exponential backoff
- Consider model alternatives
- Monitor usage patterns

#### High Latency

**Problem**: Slow response times
**Solutions**:
- Reduce `max_results`
- Optimize context size
- Use caching strategies
- Consider model alternatives

### Debug Mode

Enable debug logging:

```python
import logging
logging.getLogger('linguistics.rag').setLevel(logging.DEBUG)
```

This provides detailed logs for:
- Retrieval operations and scores
- Prompt assembly details
- Generation timing and errors
- Fallback activation

## Future Enhancements

### Planned Features

1. **Hybrid Search**: Combine semantic and keyword search
2. **Context Compression**: Summarize long contexts before injection
3. **Multi-Modal**: Support for images and audio in context
4. **Adaptive Retrieval**: Dynamic threshold adjustment
5. **Performance Analytics**: Detailed usage and performance metrics

### Extension Points

The RAG pipeline is designed for extensibility:

- **Custom Retrievers**: Implement alternative retrieval strategies
- **Prompt Templates**: Create specialized prompt formats
- **Fallback Handlers**: Add custom fallback logic
- **Metrics Collectors**: Implement custom performance tracking

## Examples

### Lesson Planning Assistant

```python
def create_lesson_plan(topic, difficulty, duration_minutes):
    retriever = BookRetriever()
    generator = ResponseGenerator()
    
    # Retrieve relevant materials
    queries = [
        f"{topic} explanation for {difficulty} level",
        f"{topic} practice exercises",
        f"{topic} examples and activities"
    ]
    
    context_results = retriever.bulk_search(queries, top_k=3)
    
    # Generate lesson plan sections
    sections = {}
    for query, context in context_results.items():
        result = generator.generate_response(
            query=f"Create a {duration_minutes//3} minute {query} section",
            context=context,
            persona_instructions="You are an experienced curriculum designer."
        )
        sections[query] = result.content
    
    return sections
```

### Personalized Tutor

```python
def personalized_tutoring(student_query, student_level, learning_history):
    retriever = BookRetriever()
    generator = ResponseGenerator(temperature=0.6)
    
    # Filter content by student level
    filters = {"difficulty_level": student_level}
    context = retriever.search(student_query, filters=filters)
    
    # Personalize response based on history
    persona = f"""You are a personal tutor for a {student_level} level student.
    Consider their previous struggles: {learning_history[-3:]}"""
    
    result = generator.generate_response(
        query=student_query,
        context=context,
        persona_instructions=persona,
        conversation_history=learning_history
    )
    
    return result
```

This RAG pipeline provides a robust foundation for enhancing AI responses with domain-specific knowledge while maintaining flexibility for various use cases in language learning applications.