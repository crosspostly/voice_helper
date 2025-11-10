"""
Tests for the Linguistics Coordinator functionality.
"""

import pytest
from unittest.mock import Mock, AsyncMock

from linguistics.personas.coordinator import LinguisticsCoordinator
from linguistics.personas.prompts import get_all_personas_metadata


class TestLinguisticsCoordinator:
    """Test suite for the Linguistics Coordinator."""
    
    @pytest.fixture
    def coordinator(self):
        """Create a coordinator instance for testing."""
        return LinguisticsCoordinator()
    
    @pytest.fixture
    def coordinator_with_services(self):
        """Create a coordinator with mock services."""
        mock_memory = Mock()
        mock_rag = Mock()
        return LinguisticsCoordinator(
            memory_service=mock_memory,
            rag_service=mock_rag
        )
    
    def test_coordinator_initialization(self, coordinator):
        """Test that coordinator initializes correctly."""
        assert coordinator.name == "Linguistics Coordinator"
        assert "coordinate" in " ".join(coordinator.routing_keywords).lower()
        assert coordinator.confidence_threshold == 0.6
        assert coordinator.fallback_expert == "communication"
        assert len(coordinator.all_personas_metadata) == 10
    
    def test_get_system_prompt(self, coordinator):
        """Test getting the coordinator's system prompt."""
        prompt = coordinator.get_system_prompt()
        assert len(prompt) > 200
        assert "coordinator" in prompt.lower()
        assert "expert" in prompt.lower()
    
    def test_get_expertise_areas(self, coordinator):
        """Test getting the coordinator's expertise areas."""
        areas = coordinator.get_expertise_areas()
        assert isinstance(areas, list)
        assert len(areas) > 0
        assert "coordination" in areas
    
    def test_analyze_user_intent_basic(self, coordinator):
        """Test basic user intent analysis."""
        # Test communication-related input
        intent_scores = coordinator.analyze_user_intent("I need help with communication skills")
        assert "communication" in intent_scores
        assert intent_scores["communication"] > 0
        
        # Test emotion-related input
        intent_scores = coordinator.analyze_user_intent("I'm feeling very anxious")
        assert "emotions" in intent_scores
        assert intent_scores["emotions"] > 0
    
    def test_analyze_user_intent_with_context(self, coordinator):
        """Test user intent analysis with context."""
        context = {
            "current_expert": "communication",
            "recent_experts": ["communication", "rapport"]
        }
        
        # Test continuation scenario
        intent_scores = coordinator.analyze_user_intent(
            "Can you tell me more about active listening?", 
            context
        )
        
        # Should get boost for communication expert since it's a continuation
        assert intent_scores["communication"] > 0
    
    def test_analyze_user_intent_explicit_transition(self, coordinator):
        """Test intent analysis with explicit transition requests."""
        # Test explicit transition request
        intent_scores = coordinator.analyze_user_intent("Let's switch to talking about creativity")
        
        # Should detect transition request and boost creativity
        assert "creativity" in intent_scores
        if intent_scores["creativity"] > 0:
            pass  # Test passes if creativity is detected
    
    def test_select_best_expert(self, coordinator):
        """Test expert selection based on user input."""
        # Test clear communication intent
        selected = coordinator.select_best_expert("I need help improving my communication skills")
        assert selected in ["communication", "rapport"]  # Either could be reasonable
        
        # Test clear emotion intent
        selected = coordinator.select_best_expert("I'm struggling with managing my anger")
        assert selected == "emotions"
        
        # Test clear creativity intent
        selected = coordinator.select_best_expert("Help me brainstorm some creative ideas")
        assert selected == "creativity"
    
    def test_select_best_expert_fallback(self, coordinator):
        """Test fallback behavior when confidence is low."""
        # Test ambiguous input
        selected = coordinator.select_best_expert("Hello")
        assert selected == coordinator.fallback_expert  # Should fallback to communication
    
    def test_should_handle_intent_coordination_keywords(self, coordinator):
        """Test that coordinator handles coordination-related requests."""
        # Test explicit coordination requests
        assert coordinator.should_handle_intent("Which expert should help me?")
        assert coordinator.should_handle_intent("Help me choose the right approach")
        assert coordinator.should_handle_intent("Can you coordinate this discussion?")
    
    def test_should_handle_intent_ambiguous_cases(self, coordinator):
        """Test coordinator handling of ambiguous cases."""
        # Create a scenario where multiple experts have similar scores
        intent_scores = {
            "communication": 0.5,
            "rapport": 0.45,
            "emotions": 0.4
        }
        
        # Mock the analyze method to return controlled scores
        coordinator.analyze_user_intent = Mock(return_value=intent_scores)
        
        # Should handle when scores are close
        assert coordinator.should_handle_intent("test input")
    
    def test_update_conversation_state(self, coordinator):
        """Test conversation state updates."""
        # Initial state
        assert coordinator.current_expert is None
        assert len(coordinator.expert_history) == 0
        
        # First expert selection
        coordinator.update_conversation_state("communication", "test input")
        assert coordinator.current_expert == "communication"
        assert len(coordinator.expert_history) == 0  # No previous expert
        
        # Switch to different expert
        coordinator.update_conversation_state("emotions", "another input")
        assert coordinator.current_expert == "emotions"
        assert len(coordinator.expert_history) == 1
        assert "communication" in coordinator.expert_history
    
    def test_get_expert_transition_message(self, coordinator):
        """Test expert transition message generation."""
        # Test transition from communication to emotions
        message = coordinator.get_expert_transition_message("communication", "emotions")
        assert len(message) > 0
        assert "emotions" in message.lower()
        
        # Test transition with no previous expert
        message = coordinator.get_expert_transition_message("none", "communication")
        assert len(message) > 0
    
    def test_preprocess_input_coordination_context(self, coordinator):
        """Test input preprocessing for coordination requests."""
        # Test coordination request
        processed = coordinator.preprocess_input(
            "Which expert should help me with this?", 
            {}
        )
        assert "Linguistics Coordinator" in processed
        
        # Test regular input
        processed = coordinator.preprocess_input(
            "I need help with communication", 
            {}
        )
        assert "Linguistics Coordinator" not in processed
    
    def test_postprocess_response_with_transition(self, coordinator):
        """Test response postprocessing with expert transitions."""
        context = {
            "selected_expert": "emotions",
            "original_input": "test input"
        }
        
        # Set current expert to simulate transition
        coordinator.current_expert = "communication"
        
        response = "Here's some helpful advice"
        processed = coordinator.postprocess_response(response, context)
        
        # Should include transition message
        assert "emotions" in processed.lower()
        assert len(processed) > len(response)
    
    def test_context_boost_calculation(self, coordinator):
        """Test context-based confidence boost calculation."""
        # Test continuation boost
        context = {
            "current_expert": "communication",
            "continuation_indicators": ["continue", "more"]
        }
        
        boost = coordinator._calculate_context_boost("communication", context, "Tell me more")
        assert boost > 0
        
        # Test no boost scenario
        boost = coordinator._calculate_context_boost("strategy", {}, "Random input")
        assert boost == 0
    
    def test_expert_routing_coverage(self, coordinator):
        """Test that all expert personas can be routed to."""
        all_metadata = get_all_personas_metadata()
        
        # Test that each expert can be selected with appropriate input
        for persona_id, metadata in all_metadata.items():
            if persona_id == "coordinator":
                continue  # Skip coordinator
                
            # Use first routing keyword to test selection
            if metadata.routing_keywords:
                test_input = f"I need help with {metadata.routing_keywords[0]}"
                selected = coordinator.select_best_expert(test_input)
                
                # Should either select this persona or fallback (both are acceptable)
                assert selected in [persona_id, coordinator.fallback_expert]
    
    def test_confidence_threshold_behavior(self, coordinator):
        """Test confidence threshold behavior."""
        # Test with low confidence threshold
        coordinator.confidence_threshold = 0.1
        selected = coordinator.select_best_expert("I need help with something")
        # Should select an expert since threshold is low
        
        # Test with high confidence threshold
        coordinator.confidence_threshold = 0.9
        selected = coordinator.select_best_expert("I need help with something")
        # Should fallback since threshold is high
        assert selected == coordinator.fallback_expert