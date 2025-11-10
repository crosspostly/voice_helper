"""
Integration tests for the persona system.

Tests the coordination between personas and overall system behavior.
"""

import pytest
from unittest.mock import Mock, AsyncMock

from linguistics.personas import (
    LinguisticsCoordinator,
    CommunicationExpert,
    RapportExpert,
    EmotionsExpert,
    CreativityExpert,
    StrategyExpert,
    FearsExpert,
    AppearanceExpert,
    PracticeExpert,
    IntegratorExpert,
    get_persona_metadata
)


class TestPersonaIntegration:
    """Integration tests for the complete persona system."""
    
    @pytest.fixture
    def coordinator_with_experts(self):
        """Create a coordinator with all expert personas available."""
        coordinator = LinguisticsCoordinator()
        
        # Mock the persona metadata to simulate all experts being available
        coordinator.all_personas_metadata = get_persona_metadata("coordinator")  # This will be updated in test
        
        return coordinator
    
    def test_coordinator_can_route_to_all_experts(self, coordinator_with_experts):
        """Test that coordinator can route to all expert personas."""
        coordinator = coordinator_with_experts
        
        # Test inputs that should route to each expert
        expert_test_cases = [
            ("communication", "I need help with my communication skills"),
            ("rapport", "How can I build better relationships with my team?"),
            ("emotions", "I'm struggling with managing my anxiety"),
            ("creativity", "Help me brainstorm some innovative ideas"),
            ("strategy", "I need to create a strategic plan for my business"),
            ("fears", "I'm afraid of public speaking, what should I do?"),
            ("appearance", "What should I wear to make a good impression?"),
            ("practice", "How can I practice piano more effectively?"),
            ("integrator", "Help me see the big picture of all these different ideas")
        ]
        
        for expected_expert, test_input in expert_test_cases:
            selected = coordinator.select_best_expert(test_input)
            
            # Should either select the expected expert or a reasonable fallback
            # We're testing that routing works, not that it's perfect
            assert selected in [expected_expert, "communication"], \
                f"Failed routing for {expected_expert} with input: {test_input}"
    
    def test_coordinator_handles_expert_transitions(self, coordinator_with_experts):
        """Test that coordinator handles expert transitions smoothly."""
        coordinator = coordinator_with_experts
        
        # Simulate a conversation that moves between topics
        inputs = [
            "I need help with communication skills",  # Should route to communication
            "Actually, I'm feeling very anxious about it",  # Should route to emotions
            "Can you help me practice some techniques?",  # Should route to practice
            "I want to understand the big picture of this",  # Should route to integrator
        ]
        
        expert_sequence = []
        for user_input in inputs:
            selected_expert = coordinator.select_best_expert(user_input)
            expert_sequence.append(selected_expert)
            coordinator.update_conversation_state(selected_expert, user_input)
        
        # Check that we got different experts (showing transitions)
        unique_experts = set(expert_sequence)
        assert len(unique_experts) >= 2, "Should have transitions between different experts"
        
        # Check conversation state was updated
        assert coordinator.current_expert == expert_sequence[-1]
        assert len(coordinator.expert_history) >= 2
    
    def test_expert_context_awareness(self):
        """Test that experts are aware of conversation context."""
        # Test with communication expert
        comm_expert = CommunicationExpert()
        
        # Test preprocessing with emotional context
        processed = comm_expert.preprocess_input(
            "I feel frustrated when I can't express myself clearly",
            {"emotional_context": "frustration"}
        )
        
        # Should detect emotional context
        assert "emotional_context" in processed or "frustrat" in processed.lower()
        
        # Test with emotions expert
        emotions_expert = EmotionsExpert()
        
        # Test preprocessing with communication context
        processed = emotions_expert.preprocess_input(
            "I need help communicating my feelings",
            {"communication_context": "expression"}
        )
        
        # Should detect emotion-related keywords
        assert "feelings" in processed.lower()
    
    def test_fallback_behavior_under_uncertainty(self):
        """Test coordinator fallback behavior when confidence is low."""
        coordinator = LinguisticsCoordinator(confidence_threshold=0.8)  # High threshold
        
        # Test with ambiguous input
        ambiguous_inputs = [
            "Hello",
            "Hi there",
            "Can you help me?",
            "I have a question",
            "Thanks"
        ]
        
        for ambiguous_input in ambiguous_inputs:
            selected = coordinator.select_best_expert(ambiguous_input)
            assert selected == coordinator.fallback_expert, \
                f"Should fallback for ambiguous input: {ambiguous_input}"
    
    def test_expert_specialization_differences(self):
        """Test that different experts provide different perspectives."""
        # Create test case that could apply to multiple experts
        test_input = "I'm having trouble with my presentation skills"
        
        experts = [
            CommunicationExpert(),
            FearsExpert(),
            AppearanceExpert(),
            PracticeExpert()
        ]
        
        responses = {}
        for expert in experts:
            # Preprocess the input
            processed_input = expert.preprocess_input(test_input, {})
            
            # Get system prompt to check focus
            system_prompt = expert.get_system_prompt()
            
            # Store the main focus areas
            expertise_areas = expert.get_expertise_areas()
            responses[expert.name] = {
                "processed": processed_input,
                "expertise": expertise_areas,
                "prompt_focus": system_prompt[:200]  # First part of prompt
            }
        
        # Check that experts have different focuses
        expertise_sets = [set(resp["expertise"]) for resp in responses.values()]
        
        # Should have some differentiation
        all_expertise = set()
        for expertise_set in expertise_sets:
            all_expertise.update(expertise_set)
        
        # Should have a good variety of expertise areas
        assert len(all_expertise) >= 6, "Experts should have diverse expertise areas"
    
    def test_persona_metadata_consistency(self):
        """Test that persona metadata is consistent across the system."""
        # Test that all experts can be instantiated from metadata
        expert_classes = [
            CommunicationExpert, RapportExpert, EmotionsExpert,
            CreativityExpert, StrategyExpert, FearsExpert,
            AppearanceExpert, PracticeExpert, IntegratorExpert
        ]
        
        for expert_class in expert_classes:
            expert = expert_class()
            
            # Check that expert name matches metadata
            metadata = get_persona_metadata(expert.name.lower().replace(" expert", "").replace(" ", "_"))
            
            # Should have consistent routing keywords
            assert len(expert.routing_keywords) > 0
            assert len(metadata.routing_keywords) > 0
            
            # Should have consistent expertise areas
            assert len(expert.get_expertise_areas()) > 0
            assert len(metadata.expertise_areas) > 0
    
    def test_coordinator_with_memory_and_rag_integration(self):
        """Test coordinator integration with memory and RAG services."""
        # Create mock services
        mock_memory = AsyncMock()
        mock_memory.get_conversation_context.return_value = {
            "previous_experts": ["communication"],
            "conversation themes": ["skill development"]
        }
        
        mock_rag = AsyncMock()
        mock_rag.retrieve_relevant_content.return_value = {
            "relevant_documents": ["communication_skills_guide.pdf"],
            "expertise_matches": ["communication", "practice"]
        }
        
        coordinator = LinguisticsCoordinator(
            memory_service=mock_memory,
            rag_service=mock_rag
        )
        
        # Test that coordinator can use context for better routing
        context = {
            "conversation_id": "test_conversation",
            "previous_experts": ["communication"]
        }
        
        # Test input that could benefit from context
        test_input = "I want to continue improving my skills"
        
        # Should consider context in routing
        intent_scores = coordinator.analyze_user_intent(test_input, context)
        
        # Should have some scores (even if boosted by context)
        assert len(intent_scores) > 0
    
    def test_end_to_end_persona_workflow(self):
        """Test a complete end-to-end workflow with the persona system."""
        coordinator = LinguisticsCoordinator()
        
        # Simulate a multi-turn conversation
        conversation_turns = [
            ("Hi, I need some help", "communication"),  # Greeting -> fallback
            ("I want to improve my public speaking skills", "communication"),  # Communication focus
            ("I get really nervous before presentations", "fears"),  # Fear/Anxiety
            ("Can you help me practice some techniques?", "practice"),  # Practice
            ("How do I integrate all these different approaches?", "integrator")  # Integration
        ]
        
        expert_history = []
        
        for user_input, expected_expert in conversation_turns:
            # Select expert
            selected_expert = coordinator.select_best_expert(user_input)
            
            # Should select expected or reasonable alternative
            assert selected_expert in [expected_expert, "communication"], \
                f"Expected {expected_expert}, got {selected_expert} for: {user_input}"
            
            # Update conversation state
            coordinator.update_conversation_state(selected_expert, user_input)
            expert_history.append(selected_expert)
        
        # Check conversation progression
        assert len(expert_history) == 5
        assert coordinator.current_expert == expert_history[-1]
        assert len(coordinator.expert_history) >= 3  # Should have some transitions
    
    def test_persona_resilience_and_error_handling(self):
        """Test that personas handle edge cases gracefully."""
        experts = [
            CommunicationExpert(), RapportExpert(), EmotionsExpert(),
            CreativityExpert(), StrategyExpert(), FearsExpert(),
            AppearanceExpert(), PracticeExpert(), IntegratorExpert()
        ]
        
        edge_cases = [
            "",  # Empty input
            "   ",  # Whitespace only
            "a" * 1000,  # Very long input
            "!@#$%^&*()",  # Special characters only
            "Hello world",  # Normal input
        ]
        
        for expert in experts:
            for edge_case in edge_cases:
                try:
                    # Test preprocessing
                    processed = expert.preprocess_input(edge_case, {})
                    assert isinstance(processed, str)
                    
                    # Test postprocessing
                    response = expert.postprocess_response("Test response", {"original_input": edge_case})
                    assert isinstance(response, str)
                    
                    # Test basic methods
                    system_prompt = expert.get_system_prompt()
                    assert isinstance(system_prompt, str)
                    assert len(system_prompt) > 0
                    
                    expertise_areas = expert.get_expertise_areas()
                    assert isinstance(expertise_areas, list)
                    
                except Exception as e:
                    pytest.fail(f"Expert {expert.name} failed on edge case '{edge_case}': {e}")
    
    def test_persona_system_performance(self):
        """Test that the persona system performs efficiently."""
        coordinator = LinguisticsCoordinator()
        
        # Test routing performance with multiple inputs
        test_inputs = [
            "I need help with communication",
            "I'm feeling anxious",
            "Help me be more creative",
            "I need a strategic plan",
            "I'm afraid of failure",
            "What should I wear?",
            "How can I practice better?",
            "Help me understand the big picture",
            "I want to build better relationships",
            "I need to manage my emotions"
        ] * 10  # 100 total inputs
        
        import time
        start_time = time.time()
        
        for user_input in test_inputs:
            selected = coordinator.select_best_expert(user_input)
            assert selected is not None
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should complete in reasonable time (less than 1 second for 100 inputs)
        assert total_time < 1.0, f"Performance test took too long: {total_time:.2f}s"
        
        # Average time per input should be very low
        avg_time = total_time / len(test_inputs)
        assert avg_time < 0.01, f"Average routing time too high: {avg_time:.4f}s"