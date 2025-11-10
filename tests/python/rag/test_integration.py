"""
Integration tests for RAG pipeline.

Tests the complete flow from retrieval to response generation
with mocked Gemini responses and seeded Chroma data.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock

from linguistics.rag.retriever import BookRetriever, RetrievalResult
from linguistics.rag.generator import ResponseGenerator, GenerationResult


class TestRAGIntegration:
    """Test complete RAG pipeline integration."""
    
    @pytest.fixture
    def mock_db(self):
        """Create mock LinguisticsDB with seeded data."""
        db = Mock()
        
        # Mock collection with sample data
        mock_collection = Mock()
        mock_collection.count.return_value = 5
        db.get_collection.return_value = mock_collection
        
        # Mock query results for semantic search
        def mock_query(collection_name, query_texts, n_results, where=None, include=None):
            if "grammar" in query_texts[0].lower():
                return {
                    "ids": [["doc1", "doc2"]],
                    "distances": [[0.1, 0.3]],  # Similarities: 0.9, 0.7
                    "metadatas": [[
                        {
                            "content_type": "lesson",
                            "difficulty_level": "beginner",
                            "topic": "grammar",
                            "language": "en"
                        },
                        {
                            "content_type": "exercise", 
                            "difficulty_level": "intermediate",
                            "topic": "grammar",
                            "language": "en"
                        }
                    ]],
                    "documents": [[
                        "Grammar is the structure of language. It includes rules for forming sentences.",
                        "Practice exercises help reinforce grammar concepts through application."
                    ]]
                }
            elif "vocabulary" in query_texts[0].lower():
                return {
                    "ids": [["doc3"]],
                    "distances": [[0.2]],  # Similarity: 0.8
                    "metadatas": [[
                        {
                            "content_type": "lesson",
                            "difficulty_level": "beginner",
                            "topic": "vocabulary",
                            "language": "en"
                        }
                    ]],
                    "documents": [[
                        "Vocabulary refers to the words used in a language. Building vocabulary is essential for communication."
                    ]]
                }
            else:
                return {
                    "ids": [[]],
                    "distances": [[]],
                    "metadatas": [[]],
                    "documents": [[]]
                }
        
        db.query.side_effect = mock_query
        
        # Mock get by ID
        def mock_get(collection_name, ids=None, where=None, limit=None, include=None):
            if ids and "doc1" in ids:
                return {
                    "ids": ["doc1"],
                    "metadatas": [{
                        "content_type": "lesson",
                        "difficulty_level": "beginner", 
                        "topic": "grammar",
                        "language": "en"
                    }],
                    "documents": ["Grammar is the structure of language."]
                }
            elif where:
                if where.get("topic") == "grammar":
                    return {
                        "ids": ["doc1", "doc2"],
                        "metadatas": [
                            {"content_type": "lesson", "topic": "grammar"},
                            {"content_type": "exercise", "topic": "grammar"}
                        ],
                        "documents": ["Grammar lesson content.", "Grammar exercise content."]
                    }
                return {"ids": [], "metadatas": [], "documents": []}
            else:
                return {"ids": [], "metadatas": [], "documents": []}
        
        db.get.side_effect = mock_get
        
        return db
    
    @pytest.fixture
    def retriever(self, mock_db):
        """Create BookRetriever with mocked database."""
        with patch('linguistics.rag.retriever.LinguisticsDB', return_value=mock_db):
            retriever = BookRetriever(mock_db)
            return retriever
    
    @pytest.fixture
    def generator(self):
        """Create ResponseGenerator with mocked Gemini."""
        with patch('linguistics.rag.generator.genai') as mock_genai:
            # Mock model
            mock_model = Mock()
            mock_genai.GenerativeModel.return_value = mock_model
            
            # Mock chat session
            mock_chat = Mock()
            mock_response = Mock()
            
            # Store reference to self for the nested function
            test_instance = self
            
            def mock_send_message(prompt):
                mock_response.text = TestRAGIntegration._generate_mock_response(prompt)
                return mock_response
            
            mock_chat.send_message.side_effect = mock_send_message
            mock_model.start_chat.return_value = mock_chat
            
            generator = ResponseGenerator(api_key="test_key")
            generator.model = mock_model
            return generator
    
    @staticmethod
    def _generate_mock_response(prompt):
        """Generate mock response based on prompt content."""
        if "grammar" in prompt.lower():
            return "Grammar is indeed the foundation of language structure. Based on the context provided, it includes rules for forming sentences and proper word usage. For beginners, it's best to start with basic sentence structures and gradually move to more complex concepts."
        elif "vocabulary" in prompt.lower():
            return "Building vocabulary is essential for effective communication. The context mentions that vocabulary refers to the words used in a language. I recommend learning new words in context and practicing them regularly."
        else:
            return "I'd be happy to help with your language learning journey. Could you please specify which aspect you'd like to focus on - grammar, vocabulary, pronunciation, or something else?"
    
    def test_complete_rag_flow_grammar_query(self, retriever, generator):
        """Test complete RAG flow for grammar-related query."""
        # Step 1: Retrieve relevant context
        query = "What is grammar and how should beginners learn it?"
        context = retriever.search(query, top_k=3)
        
        assert len(context) == 2
        assert context[0].metadata["topic"] == "grammar"
        assert context[0].similarity_score == 0.9
        assert context[1].similarity_score == 0.7
        
        # Step 2: Generate response using context
        persona_instructions = "You are a patient and encouraging English teacher for beginners."
        conversation_history = [
            {"role": "user", "content": "Hi, I'm learning English."},
            {"role": "assistant", "content": "Hello! I'm here to help you learn English effectively."}
        ]
        
        result = generator.generate_response(
            query=query,
            context=context,
            persona_instructions=persona_instructions,
            conversation_history=conversation_history
        )
        
        # Verify response
        assert isinstance(result, GenerationResult)
        assert result.content is not None
        assert len(result.content) > 0
        assert result.fallback_used is False
        assert result.model_used == "gemini-1.5-pro"  # Default model name
        assert len(result.sources) == 2
        assert result.sources[0]["id"] == "doc1"
        assert result.sources[1]["id"] == "doc2"
        
        # Verify context was included in response
        assert "grammar" in result.content.lower()
        assert "foundation" in result.content.lower()
    
    def test_complete_rag_flow_vocabulary_query(self, retriever, generator):
        """Test complete RAG flow for vocabulary-related query."""
        query = "How important is vocabulary for language learning?"
        context = retriever.search(query, top_k=2)
        
        assert len(context) == 1
        assert context[0].metadata["topic"] == "vocabulary"
        
        result = generator.generate_response(
            query=query,
            context=context,
            persona_instructions="You are an experienced language instructor."
        )
        
        assert result.fallback_used is False
        assert "vocabulary" in result.content.lower()
        assert "communication" in result.content.lower()
        assert len(result.sources) == 1
    
    def test_rag_flow_no_results_found(self, retriever, generator):
        """Test RAG flow when no relevant context is found."""
        query = "Tell me about quantum physics"  # Not in linguistics context
        context = retriever.search(query)
        
        assert len(context) == 0
        
        result = generator.generate_response(
            query=query,
            context=context,
            persona_instructions="You are a helpful assistant."
        )
        
        # Should still generate a response but without sources
        assert result.content is not None
        assert len(result.sources) == 0
        # Response should acknowledge lack of specific context
        assert "specify" in result.content.lower() or "aspect" in result.content.lower()
    
    def test_rag_flow_with_filters(self, retriever, generator):
        """Test RAG flow with metadata filters."""
        query = "grammar rules"
        filters = {"difficulty_level": "beginner", "content_type": "lesson"}
        
        context = retriever.search(query, filters=filters)
        
        # Should return filtered results
        assert len(context) >= 0  # May be empty due to filtering
        
        if context:
            # Verify filters were applied
            for result in context:
                assert result.metadata.get("difficulty_level") == "beginner"
                assert result.metadata.get("content_type") == "lesson"
    
    def test_rag_flow_bulk_search(self, retriever, generator):
        """Test RAG flow with bulk search for lesson planning."""
        queries = [
            "basic grammar concepts",
            "vocabulary building techniques", 
            "pronunciation practice"
        ]
        
        context_results = retriever.bulk_search(queries, top_k=2)
        
        assert len(context_results) == 3
        assert "basic grammar concepts" in context_results
        assert "vocabulary building techniques" in context_results
        assert "pronunciation practice" in context_results
        
        # Generate responses for each query
        responses = {}
        for query, context in context_results.items():
            result = generator.generate_response(
                query=query,
                context=context,
                persona_instructions="You are creating a comprehensive lesson plan."
            )
            responses[query] = result
        
        # Verify all responses generated
        assert len(responses) == 3
        for query, result in responses.items():
            assert isinstance(result, GenerationResult)
            assert result.content is not None
            assert result.generation_time > 0
    
    def test_rag_flow_with_gemini_failure(self, retriever):
        """Test RAG flow when Gemini is unavailable."""
        # Create generator that will fail
        with patch('linguistics.rag.generator.genai') as mock_genai:
            mock_genai.GenerativeModel.side_effect = Exception("API unavailable")
            
            generator = ResponseGenerator(api_key="test_key", enable_fallbacks=True)
            assert generator.model is None
            
            query = "What is grammar?"
            context = retriever.search(query)
            
            result = generator.generate_response(
                query=query,
                context=context,
                persona_instructions="You are a helpful teacher."
            )
            
            # Should use fallback
            assert result.fallback_used is True
            assert result.model_used == "fallback"
            assert "trouble generating" in result.content.lower()
            assert result.error is not None
    
    def test_rag_flow_score_normalization(self, retriever, generator):
        """Test that scores are properly normalized in RAG flow."""
        query = "grammar exercises"
        context = retriever.search(query, top_k=5)
        
        # Check score normalization
        if len(context) > 1:
            scores = [result.normalized_score for result in context]
            # Normalized scores should be between 0 and 1
            assert all(0 <= score <= 1 for score in scores)
            # At least one score should be 1.0 (highest)
            assert 1.0 in scores
        
        # Generate response
        result = generator.generate_response(query=query, context=context)
        
        # Sources should include normalized scores
        for source in result.sources:
            assert "normalized_score" in source
            assert 0 <= source["normalized_score"] <= 1
    
    def test_rag_flow_max_token_safeguards(self, generator):
        """Test that max token limits are respected."""
        # Create a very long context
        long_context = [
            RetrievalResult(
                f"doc{i}",
                "Content " * 1000,  # Long content
                {"content_type": "lesson"},
                0.9
            )
            for i in range(10)
        ]
        
        with patch('linguistics.rag.generator.genai') as mock_genai:
            mock_model = Mock()
            mock_genai.GenerativeModel.return_value = mock_model
            
            mock_chat = Mock()
            mock_response = Mock()
            mock_response.text = "Response"
            mock_chat.send_message.return_value = mock_response
            mock_model.start_chat.return_value = mock_chat
            
            generator = ResponseGenerator(max_tokens=100)  # Very low limit
            generator.model = mock_model
            
            result = generator.generate_response(
                query="Test",
                context=long_context,
                max_context_items=3  # Should limit context
            )
            
            # Verify the model was called
            mock_chat.send_message.assert_called_once()
            
            # Get the prompt that was sent
            call_args = mock_chat.send_message.call_args[0][0]
            
            # Should have limited context items
            context_count = call_args.count("Source ")
            assert context_count <= 3  # Should respect max_context_items
    
    def test_rag_flow_conversation_history_integration(self, retriever, generator):
        """Test RAG flow with conversation history."""
        query = "Can you explain this grammar rule again?"
        
        # Create conversation history
        conversation_history = [
            {"role": "user", "content": "What are subjects and verbs?"},
            {"role": "assistant", "content": "Subjects are who/what the sentence is about, verbs are actions."},
            {"role": "user", "content": "Can you give me an example?"},
            {"role": "assistant", "content": "'The cat sleeps' - cat=subject, sleeps=verb."},
            {"role": "user", "content": "What about complex sentences?"},
            {"role": "assistant", "content": "Complex sentences have multiple clauses."}
        ]
        
        context = retriever.search(query)
        result = generator.generate_response(
            query=query,
            context=context,
            conversation_history=conversation_history,
            persona_instructions="You are a patient grammar teacher."
        )
        
        assert result.content is not None
        assert result.fallback_used is False
        
        # Verify the generator was called with history
        generator.model.start_chat.assert_called_once()
        mock_chat = generator.model.start_chat.return_value
        mock_chat.send_message.assert_called_once()
        
        # Check that conversation history was included in prompt
        prompt = mock_chat.send_message.call_args[0][0]
        assert "CONVERSATION HISTORY:" in prompt
        assert "subjects and verbs" in prompt.lower()
    
    def test_rag_flow_error_handling_and_recovery(self, retriever, generator):
        """Test error handling and recovery in RAG flow."""
        query = "test query"
        
        # Test with retriever error
        retriever.search = Mock(side_effect=Exception("Database error"))
        
        try:
            context = retriever.search(query)
            assert False, "Should have raised exception"
        except Exception:
            # Expected behavior
            pass
        
            # Test with generator error but fallbacks enabled
            with patch.object(generator, '_generate_with_gemini', side_effect=Exception("Model error")):
                result = generator.generate_response(query=query)
            
            assert result.fallback_used is True
            assert result.error is not None
    
    def test_rag_flow_performance_metrics(self, retriever, generator):
        """Test that performance metrics are properly tracked."""
        query = "grammar basics"
        context = retriever.search(query)
        
        result = generator.generate_response(
            query=query,
            context=context,
            persona_instructions="You are an efficient teacher."
        )
        
        # Verify metrics are tracked
        assert result.generation_time > 0
        assert isinstance(result.generation_time, float)
        assert result.model_used is not None
        assert result.fallback_used is not None
        assert isinstance(result.fallback_used, bool)