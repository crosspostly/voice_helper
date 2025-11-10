"""
Unit tests for RAG generator module.

Tests ResponseGenerator functionality including prompt formatting,
context injection, max-token safeguards, and fallback behavior.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import time

from linguistics.rag.generator import ResponseGenerator, GenerationResult
from linguistics.rag.retriever import RetrievalResult


class TestGenerationResult:
    """Test GenerationResult class."""
    
    def test_generation_result_creation(self):
        """Test creating a GenerationResult."""
        sources = [{"id": "doc1", "score": 0.8}]
        result = GenerationResult(
            content="Test response",
            sources=sources,
            model_used="gemini-pro",
            fallback_used=False,
            generation_time=1.5,
            token_count=100
        )
        
        assert result.content == "Test response"
        assert result.sources == sources
        assert result.model_used == "gemini-pro"
        assert result.fallback_used is False
        assert result.generation_time == 1.5
        assert result.token_count == 100
        assert result.error is None
    
    def test_generation_result_with_error(self):
        """Test GenerationResult with error."""
        result = GenerationResult(
            content="",
            sources=[],
            model_used="gemini-pro",
            fallback_used=False,
            error="API error"
        )
        
        assert result.content == ""
        assert result.error == "API error"
    
    def test_to_dict(self):
        """Test converting GenerationResult to dictionary."""
        sources = [{"id": "doc1", "score": 0.8}]
        result = GenerationResult(
            content="Test response",
            sources=sources,
            model_used="gemini-pro",
            fallback_used=True,
            generation_time=1.0,
            token_count=50,
            error="Warning"
        )
        
        result_dict = result.to_dict()
        expected = {
            "content": "Test response",
            "sources": sources,
            "model_used": "gemini-pro",
            "fallback_used": True,
            "generation_time": 1.0,
            "token_count": 50,
            "error": "Warning"
        }
        
        assert result_dict == expected


class TestResponseGenerator:
    """Test ResponseGenerator class."""
    
    @pytest.fixture
    def mock_config(self):
        """Mock configuration values."""
        with patch('linguistics.rag.generator.config') as mock_cfg:
            mock_cfg.GEMINI_API_KEY = "test_api_key"
            mock_cfg.GEMINI_MODEL_NAME = "gemini-1.5-pro"
            yield mock_cfg
    
    @pytest.fixture
    def generator(self, mock_config):
        """Create ResponseGenerator instance with mocked dependencies."""
        with patch('linguistics.rag.generator.genai') as mock_genai:
            # Mock the model
            mock_model = Mock()
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = ResponseGenerator(
                api_key="test_key",
                model_name="gemini-test",
                max_tokens=1000,
                temperature=0.5,
                timeout=10.0
            )
            
            generator.model = mock_model
            return generator
    
    def test_initialization_with_defaults(self, mock_config):
        """Test ResponseGenerator initialization with default parameters."""
        with patch('linguistics.rag.generator.genai') as mock_genai:
            mock_model = Mock()
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = ResponseGenerator()
            
            assert generator.api_key == "test_api_key"
            assert generator.model_name == "gemini-1.5-pro"
            assert generator.max_tokens == 2048
            assert generator.temperature == 0.7
            assert generator.timeout == 30.0
            assert generator.enable_fallbacks is True
            mock_genai.configure.assert_called_once_with(api_key="test_api_key")
    
    def test_initialization_with_custom_params(self):
        """Test ResponseGenerator initialization with custom parameters."""
        with patch('linguistics.rag.generator.genai') as mock_genai:
            mock_model = Mock()
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = ResponseGenerator(
                api_key="custom_key",
                model_name="custom-model",
                max_tokens=1500,
                temperature=0.3,
                timeout=15.0,
                enable_fallbacks=False
            )
            
            assert generator.api_key == "custom_key"
            assert generator.model_name == "custom-model"
            assert generator.max_tokens == 1500
            assert generator.temperature == 0.3
            assert generator.timeout == 15.0
            assert generator.enable_fallbacks is False
    
    def test_initialize_model_success(self):
        """Test successful model initialization."""
        with patch('linguistics.rag.generator.genai') as mock_genai:
            mock_model = Mock()
            mock_genai.GenerativeModel.return_value = mock_model
            
            generator = ResponseGenerator(api_key="test_key")
            
            assert generator.model == mock_model
            mock_genai.configure.assert_called_once_with(api_key="test_key")
            mock_genai.GenerativeModel.assert_called_once()
            
            # Check generation config
            call_args = mock_genai.GenerativeModel.call_args
            generation_config = call_args.kwargs["generation_config"]
            assert generation_config["temperature"] == 0.7
            assert generation_config["max_output_tokens"] == 2048
    
    def test_initialize_model_failure(self):
        """Test model initialization failure."""
        with patch('linguistics.rag.generator.genai') as mock_genai:
            mock_genai.GenerativeModel.side_effect = Exception("API error")
            
            generator = ResponseGenerator(api_key="test_key")
            
            assert generator.model is None
    
    def test_generate_response_success(self, generator):
        """Test successful response generation."""
        # Mock Gemini response
        mock_chat = Mock()
        mock_response = Mock()
        mock_response.text = "Generated response"
        mock_chat.send_message.return_value = mock_response
        generator.model.start_chat.return_value = mock_chat
        
        # Test data
        query = "What is grammar?"
        context = [
            RetrievalResult("doc1", "Grammar is the study of language structure.", {}, 0.9)
        ]
        persona_instructions = "You are a helpful language teacher."
        conversation_history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi! How can I help?"}
        ]
        
        result = generator.generate_response(
            query=query,
            context=context,
            persona_instructions=persona_instructions,
            conversation_history=conversation_history
        )
        
        assert isinstance(result, GenerationResult)
        assert result.content == "Generated response"
        assert result.model_used == "gemini-test"
        assert result.fallback_used is False
        assert result.generation_time > 0
        assert len(result.sources) == 1
        assert result.sources[0]["id"] == "doc1"
        
        # Verify model was called
        generator.model.start_chat.assert_called_once()
        mock_chat.send_message.assert_called_once()
    
    def test_generate_response_without_context(self, generator):
        """Test response generation without context."""
        mock_chat = Mock()
        mock_response = Mock()
        mock_response.text = "General response"
        mock_chat.send_message.return_value = mock_response
        generator.model.start_chat.return_value = mock_chat
        
        result = generator.generate_response(query="Hello")
        
        assert result.content == "General response"
        assert result.sources == []
    
    def test_generate_response_model_not_initialized(self):
        """Test response generation when model is not initialized."""
        with patch('linguistics.rag.generator.genai') as mock_genai:
            mock_genai.GenerativeModel.side_effect = Exception("Model init failed")
            
            generator = ResponseGenerator(api_key="test_key")
            assert generator.model is None
            
            result = generator.generate_response(query="Test")
            
            assert result.fallback_used is True
            assert result.model_used == "fallback"
            assert "trouble generating" in result.content.lower()
    
    def test_generate_response_with_fallbacks_disabled(self, generator):
        """Test response generation with fallbacks disabled."""
        # Create generator that will fail and has fallbacks disabled
        with patch('linguistics.rag.generator.genai') as mock_genai:
            mock_genai.GenerativeModel.side_effect = Exception("Model error")
            
            generator_no_fallbacks = ResponseGenerator(api_key="test_key", enable_fallbacks=False)
            # Initialize model to None to simulate failure
            generator_no_fallbacks.model = None
            
            result = generator_no_fallbacks.generate_response(query="Test")
            
            assert result.fallback_used is False
            assert result.content == ""
            assert result.error is not None
            assert "fallbacks disabled" in result.error
    
    def test_generate_response_timeout_error(self, generator):
        """Test response generation with timeout error."""
        # Create a separate generator for this test to avoid conflicts
        with patch('linguistics.rag.generator.genai') as mock_genai:
            mock_model = Mock()
            mock_genai.GenerativeModel.return_value = mock_model
            
            mock_chat = Mock()
            mock_chat.send_message.side_effect = TimeoutError("Request timeout")
            mock_model.start_chat.return_value = mock_chat
            
            timeout_generator = ResponseGenerator(api_key="test_key")
            timeout_generator.model = mock_model
            
            result = timeout_generator.generate_response(query="Test")
            
            assert result.fallback_used is True
            assert "trouble generating" in result.content.lower()
            assert "timeout" in result.error.lower()
    
    def test_generate_response_rate_limit_error(self, generator):
        """Test response generation with rate limit error."""
        # Create a separate generator for this test
        with patch('linguistics.rag.generator.genai') as mock_genai:
            mock_model = Mock()
            mock_genai.GenerativeModel.return_value = mock_model
            
            mock_chat = Mock()
            mock_chat.send_message.side_effect = Exception("Rate limit exceeded")
            mock_model.start_chat.return_value = mock_chat
            
            rate_limit_generator = ResponseGenerator(api_key="test_key")
            rate_limit_generator.model = mock_model
            
            result = rate_limit_generator.generate_response(query="Test")
            
            assert result.fallback_used is True
            assert result.error is not None
            assert "rate limit" in result.error.lower()
    
    def test_generate_with_gemini_empty_response(self, generator):
        """Test Gemini returning empty response."""
        # Create a separate generator for this test
        with patch('linguistics.rag.generator.genai') as mock_genai:
            mock_model = Mock()
            mock_genai.GenerativeModel.return_value = mock_model
            
            mock_chat = Mock()
            mock_response = Mock()
            mock_response.text = ""
            mock_chat.send_message.return_value = mock_response
            mock_model.start_chat.return_value = mock_chat
            
            empty_generator = ResponseGenerator(api_key="test_key")
            empty_generator.model = mock_model
            
            with pytest.raises(Exception, match="Gemini generation failed: Empty response from Gemini"):
                empty_generator._generate_with_gemini("test prompt")
    
    def test_build_prompt_complete(self, generator):
        """Test building complete prompt with all components."""
        query = "What is a noun?"
        context = [
            RetrievalResult("doc1", "A noun is a word for a person, place, or thing.", 
                          {"content_type": "lesson", "difficulty_level": "beginner"}, 0.9)
        ]
        persona_instructions = "You are a friendly English teacher."
        conversation_history = [
            {"role": "user", "content": "Hi"},
            {"role": "assistant", "content": "Hello!"}
        ]
        
        prompt = generator._build_prompt(
            query=query,
            context=context,
            persona_instructions=persona_instructions,
            conversation_history=conversation_history,
            max_context_items=5
        )
        
        assert "PERSONA INSTRUCTIONS:" in prompt
        assert "You are a friendly English teacher." in prompt
        assert "CONTEXT INFORMATION:" in prompt
        assert "A noun is a word" in prompt
        assert "Type: lesson" in prompt
        assert "Level: beginner" in prompt
        assert "CONVERSATION HISTORY:" in prompt
        assert "USER: Hi" in prompt
        assert "ASSISTANT: Hello!" in prompt
        assert "USER QUESTION:" in prompt
        assert "What is a noun?" in prompt
        assert "RESPONSE GUIDELINES:" in prompt
    
    def test_build_prompt_minimal(self, generator):
        """Test building prompt with minimal components."""
        prompt = generator._build_prompt(
            query="Test query",
            context=None,
            persona_instructions=None,
            conversation_history=None,
            max_context_items=5
        )
        
        assert "PERSONA INSTRUCTIONS:" not in prompt
        assert "CONTEXT INFORMATION:" not in prompt
        assert "CONVERSATION HISTORY:" not in prompt
        assert "USER QUESTION:" in prompt
        assert "Test query" in prompt
        assert "RESPONSE GUIDELINES:" in prompt
    
    def test_format_context(self, generator):
        """Test formatting context for prompt."""
        context = [
            RetrievalResult(
                "doc1", 
                "Content about verbs.",
                {"content_type": "lesson", "difficulty_level": "beginner", "topic": "grammar"},
                0.9
            ),
            RetrievalResult(
                "doc2",
                "Content about nouns.", 
                {"content_type": "exercise", "difficulty_level": "intermediate", "topic": "grammar", "subtopic": "nouns"},
                0.8
            )
        ]
        
        formatted = generator._format_context(context)
        
        assert "Source 1 [Type: lesson, Level: beginner, Topic: grammar]:" in formatted
        assert "Content about verbs." in formatted
        assert "Source 2 [Type: exercise, Level: intermediate, Topic: grammar, Subtopic: nouns]:" in formatted
        assert "Content about nouns." in formatted
    
    def test_format_context_empty(self, generator):
        """Test formatting empty context."""
        formatted = generator._format_context([])
        assert "No specific context information available." in formatted
    
    def test_format_conversation_history(self, generator):
        """Test formatting conversation history."""
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
            {"role": "user", "content": "How are you?"}
        ]
        
        formatted = generator._format_conversation_history(history)
        
        assert "USER: Hello" in formatted
        assert "ASSISTANT: Hi there!" in formatted
        assert "USER: How are you?" in formatted
    
    def test_format_conversation_history_empty(self, generator):
        """Test formatting empty conversation history."""
        formatted = generator._format_conversation_history([])
        assert "No previous conversation." in formatted
    
    def test_extract_sources(self, generator):
        """Test extracting sources from context."""
        context = [
            RetrievalResult("doc1", "Content 1", {"type": "lesson"}, 0.9, 0.8),
            RetrievalResult("doc2", "Content 2", {"type": "exercise"}, 0.7, 0.6)
        ]
        
        sources = generator._extract_sources(context)
        
        assert len(sources) == 2
        assert sources[0]["id"] == "doc1"
        assert sources[0]["similarity_score"] == 0.9
        assert sources[0]["normalized_score"] == 0.8
        assert sources[0]["metadata"]["type"] == "lesson"
        
        assert sources[1]["id"] == "doc2"
        assert sources[1]["similarity_score"] == 0.7
        assert sources[1]["normalized_score"] == 0.6
    
    def test_get_fallback_response(self, generator):
        """Test getting fallback responses."""
        # Test known fallback type
        response = generator._get_fallback_response("error")
        assert "trouble generating" in response.lower()
        
        # Test unknown fallback type
        response = generator._get_fallback_response("unknown")
        assert "here to help" in response.lower()
    
    def test_set_fallback_template(self, generator):
        """Test setting custom fallback template."""
        generator.set_fallback_template("custom", "Custom fallback message")
        
        response = generator._get_fallback_response("custom")
        assert response == "Custom fallback message"
    
    def test_test_connection_success(self, generator):
        """Test successful connection test."""
        mock_response = Mock()
        mock_response.text = "OK"
        generator.model.generate_content.return_value = mock_response
        
        result = generator.test_connection()
        
        assert result is True
        generator.model.generate_content.assert_called_once_with("Test")
    
    def test_test_connection_failure(self, generator):
        """Test failed connection test."""
        generator.model.generate_content.side_effect = Exception("Connection failed")
        
        result = generator.test_connection()
        
        assert result is False
    
    def test_test_connection_no_model(self):
        """Test connection test with no model."""
        generator = ResponseGenerator(enable_fallbacks=False)
        generator.model = None
        
        result = generator.test_connection()
        
        assert result is False
    
    def test_get_model_info(self, generator):
        """Test getting model information."""
        info = generator.get_model_info()
        
        assert info["model_name"] == "gemini-test"
        assert info["max_tokens"] == 1000
        assert info["temperature"] == 0.5
        assert info["timeout"] == 10.0
        assert info["fallbacks_enabled"] is True
        assert info["model_initialized"] is True
        assert info["api_configured"] is True
    
    def test_max_context_items_limiting(self, generator):
        """Test that max_context_items limits context properly."""
        context = [
            RetrievalResult(f"doc{i}", f"Content {i}", {}, 0.9)
            for i in range(10)
        ]
        
        prompt = generator._build_prompt(
            query="Test",
            context=context,
            persona_instructions=None,
            conversation_history=None,
            max_context_items=3
        )
        
        # Should only include first 3 items
        assert "Content 0" in prompt
        assert "Content 1" in prompt
        assert "Content 2" in prompt
        assert "Content 3" not in prompt
    
    def test_conversation_history_limiting(self, generator):
        """Test that conversation history is limited to last 5 messages."""
        history = [
            {"role": "user", "content": f"Message {i}"}
            for i in range(10)
        ]
        
        prompt = generator._build_prompt(
            query="Test",
            context=None,
            persona_instructions=None,
            conversation_history=history,
            max_context_items=5
        )
        
        # Should only include last 5 messages
        assert "Message 5" in prompt
        assert "Message 6" in prompt
        assert "Message 7" in prompt
        assert "Message 8" in prompt
        assert "Message 9" in prompt
        assert "Message 0" not in prompt
        assert "Message 1" not in prompt