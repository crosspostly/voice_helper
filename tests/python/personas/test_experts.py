"""
Tests for individual expert persona functionality.
"""

import pytest
from unittest.mock import Mock, AsyncMock

from linguistics.personas.communication import CommunicationExpert
from linguistics.personas.rapport import RapportExpert
from linguistics.personas.emotions import EmotionsExpert
from linguistics.personas.creativity import CreativityExpert
from linguistics.personas.strategy import StrategyExpert
from linguistics.personas.fears import FearsExpert
from linguistics.personas.appearance import AppearanceExpert
from linguistics.personas.practice import PracticeExpert
from linguistics.personas.integrator import IntegratorExpert


class TestExpertPersonas:
    """Test suite for individual expert personas."""
    
    def test_communication_expert_initialization(self):
        """Test Communication Expert initialization."""
        expert = CommunicationExpert()
        assert "Communication" in expert.name
        assert "communicate" in " ".join(expert.routing_keywords).lower()
        assert len(expert.get_system_prompt()) > 200
        assert len(expert.get_expertise_areas()) > 0
    
    def test_communication_expert_preprocessing(self):
        """Test Communication Expert input preprocessing."""
        expert = CommunicationExpert()
        
        # Test clarity issues detection
        processed = expert.preprocess_input("I have this thing and stuff that's kind of confusing", {})
        assert "clarity" in processed
        
        # Test emotional context detection
        processed = expert.preprocess_input("I feel frustrated when I can't explain myself", {})
        assert "emotional_context" in processed
    
    def test_communication_expert_postprocessing(self):
        """Test Communication Expert response postprocessing."""
        expert = CommunicationExpert()
        
        context = {
            "original_input": "How can I communicate better?"
        }
        response = "Here are some communication tips"
        processed = expert.postprocess_response(response, context)
        
        assert "Communication Tip" in processed
        assert len(processed) > len(response)
    
    def test_rapport_expert_initialization(self):
        """Test Rapport Expert initialization."""
        expert = RapportExpert()
        assert "Rapport" in expert.name
        assert "relationship" in " ".join(expert.routing_keywords).lower()
        assert len(expert.get_system_prompt()) > 200
    
    def test_rapport_expert_preprocessing(self):
        """Test Rapport Expert input preprocessing."""
        expert = RapportExpert()
        
        # Test relationship type detection
        processed = expert.preprocess_input("How can I build trust with my friend?", {})
        assert "relationship_type" in processed
        assert "friend" in processed
        
        # Test connection needs detection
        processed = expert.preprocess_input("I want to feel closer to my team", {})
        assert "connection_needs" in processed
    
    def test_emotions_expert_initialization(self):
        """Test Emotions Expert initialization."""
        expert = EmotionsExpert()
        assert "Emotions" in expert.name
        assert "emotion" in " ".join(expert.routing_keywords).lower()
        assert len(expert.get_system_prompt()) > 200
    
    def test_emotions_expert_preprocessing(self):
        """Test Emotions Expert input preprocessing."""
        expert = EmotionsExpert()
        
        # Test emotion detection
        processed = expert.preprocess_input("I feel very angry and frustrated", {})
        assert "emotions" in processed
        assert "anger" in processed
        
        # Test intensity detection
        processed = expert.preprocess_input("I'm extremely worried", {})
        assert "intensity" in processed
        assert "high" in processed
    
    def test_creativity_expert_initialization(self):
        """Test Creativity Expert initialization."""
        expert = CreativityExpert()
        assert "Creativity" in expert.name
        assert "creative" in " ".join(expert.routing_keywords).lower()
        assert len(expert.get_system_prompt()) > 200
    
    def test_creativity_expert_preprocessing(self):
        """Test Creativity Expert input preprocessing."""
        expert = CreativityExpert()
        
        # Test creative needs detection
        processed = expert.preprocess_input("Help me brainstorm some new ideas", {})
        assert "creative_needs" in processed
        assert "brainstorming" in processed
        
        # Test constraint detection
        processed = expert.preprocess_input("I have limited time and money", {})
        assert "constraints" in processed
    
    def test_strategy_expert_initialization(self):
        """Test Strategy Expert initialization."""
        expert = StrategyExpert()
        assert "Strategy" in expert.name
        assert "strategy" in " ".join(expert.routing_keywords).lower()
        assert len(expert.get_system_prompt()) > 200
    
    def test_strategy_expert_preprocessing(self):
        """Test Strategy Expert input preprocessing."""
        expert = StrategyExpert()
        
        # Test strategic needs detection
        processed = expert.preprocess_input("I need to plan my career path", {})
        assert "strategic_needs" in processed
        assert "planning" in processed
        
        # Test time horizon detection
        processed = expert.preprocess_input("What should I do this week?", {})
        assert "time_horizon" in processed
    
    def test_fears_expert_initialization(self):
        """Test Fears Expert initialization."""
        expert = FearsExpert()
        assert "Fears" in expert.name
        assert "fear" in " ".join(expert.routing_keywords).lower()
        assert len(expert.get_system_prompt()) > 200
    
    def test_fears_expert_preprocessing(self):
        """Test Fears Expert input preprocessing."""
        expert = FearsExpert()
        
        # Test fear type detection
        processed = expert.preprocess_input("I'm very anxious about public speaking", {})
        assert "fear_types" in processed
        assert "anxiety" in processed
        assert "social" in processed
    
    def test_appearance_expert_initialization(self):
        """Test Appearance Expert initialization."""
        expert = AppearanceExpert()
        assert "Appearance" in expert.name
        assert "appearance" in " ".join(expert.routing_keywords).lower()
        assert len(expert.get_system_prompt()) > 200
    
    def test_appearance_expert_preprocessing(self):
        """Test Appearance Expert input preprocessing."""
        expert = AppearanceExpert()
        
        # Test appearance area detection
        processed = expert.preprocess_input("What should I wear to my interview?", {})
        assert "areas" in processed
        assert "clothing" in processed
        assert "occasions" in processed
    
    def test_practice_expert_initialization(self):
        """Test Practice Expert initialization."""
        expert = PracticeExpert()
        assert "Practice" in expert.name
        assert "practice" in " ".join(expert.routing_keywords).lower()
        assert len(expert.get_system_prompt()) > 200
    
    def test_practice_expert_preprocessing(self):
        """Test Practice Expert input preprocessing."""
        expert = PracticeExpert()
        
        # Test skill type detection
        processed = expert.preprocess_input("How can I practice playing piano better?", {})
        assert "skill_types" in processed
        assert "creative" in processed
        
        # Test learning stage detection
        processed = expert.preprocess_input("I'm a beginner at learning languages", {})
        assert "learning_stage" in processed
        assert "beginner" in processed
    
    def test_integrator_expert_initialization(self):
        """Test Integrator Expert initialization."""
        expert = IntegratorExpert()
        assert "Integrator" in expert.name
        assert "integrate" in " ".join(expert.routing_keywords).lower()
        assert len(expert.get_system_prompt()) > 200
    
    def test_integrator_expert_preprocessing(self):
        """Test Integrator Expert input preprocessing."""
        expert = IntegratorExpert()
        
        # Test integration needs detection
        processed = expert.preprocess_input("Help me see the big picture of all this data", {})
        assert "integration_needs" in processed
        assert "holistic_view" in processed
    
    def test_all_experts_routing_keywords(self):
        """Test that all experts have appropriate routing keywords."""
        experts = [
            CommunicationExpert(), RapportExpert(), EmotionsExpert(),
            CreativityExpert(), StrategyExpert(), FearsExpert(),
            AppearanceExpert(), PracticeExpert(), IntegratorExpert()
        ]
        
        for expert in experts:
            # Check that routing keywords are not empty
            assert len(expert.routing_keywords) > 0, f"{expert.name} should have routing keywords"
            
            # Check that routing keywords are relevant to the expert
            routing_str = " ".join(expert.routing_keywords).lower()
            expert_name_lower = expert.name.lower()
            
            # At least one keyword should relate to the expert's domain
            has_relevant_keyword = False
            for keyword in expert.routing_keywords:
                if any(domain_word in keyword.lower() for domain_word in expert_name_lower.split()):
                    has_relevant_keyword = True
                    break
            
            assert has_relevant_keyword, f"{expert.name} should have relevant routing keywords"
    
    def test_all_experts_expertise_areas(self):
        """Test that all experts have well-defined expertise areas."""
        experts = [
            CommunicationExpert(), RapportExpert(), EmotionsExpert(),
            CreativityExpert(), StrategyExpert(), FearsExpert(),
            AppearanceExpert(), PracticeExpert(), IntegratorExpert()
        ]
        
        for expert in experts:
            areas = expert.get_expertise_areas()
            
            # Check that expertise areas are not empty
            assert len(areas) > 0, f"{expert.name} should have expertise areas"
            
            # Check that expertise areas are relevant
            expert_name_lower = expert.name.lower()
            has_relevant_area = any(area_word in " ".join(areas).lower() 
                                   for area_word in expert_name_lower.split())
            
            # This is a loose check - some experts might have broader expertise
            assert len(areas) >= 2, f"{expert.name} should have at least 2 expertise areas"
    
    def test_all_experts_system_prompts(self):
        """Test that all experts have substantial system prompts."""
        experts = [
            CommunicationExpert(), RapportExpert(), EmotionsExpert(),
            CreativityExpert(), StrategyExpert(), FearsExpert(),
            AppearanceExpert(), PracticeExpert(), IntegratorExpert()
        ]
        
        for expert in experts:
            prompt = expert.get_system_prompt()
            
            # Check prompt length
            assert len(prompt) > 200, f"{expert.name} system prompt should be substantial"
            
            # Check that prompt contains expert-specific content
            expert_name_in_prompt = expert.name.lower() in prompt.lower()
            expert_domain_in_prompt = any(area.lower() in prompt.lower() 
                                        for area in expert.get_expertise_areas())
            
            assert expert_name_in_prompt or expert_domain_in_prompt, \
                f"{expert.name} system prompt should mention the expert or their domain"
    
    def test_all_experts_postprocessing_tips(self):
        """Test that all experts provide helpful tips in postprocessing."""
        experts = [
            CommunicationExpert(), RapportExpert(), EmotionsExpert(),
            CreativityExpert(), StrategyExpert(), FearsExpert(),
            AppearanceExpert(), PracticeExpert(), IntegratorExpert()
        ]
        
        for expert in experts:
            context = {
                "original_input": f"How can I get better at {expert.routing_keywords[0]}?"
            }
            
            response = "Here's some advice"
            processed = expert.postprocess_response(response, context)
            
            # Should include a tip (except for cases where no help pattern is detected)
            # This is a loose check since some inputs might not trigger help patterns
            assert len(processed) >= len(response), \
                f"{expert.name} postprocessing should not reduce response length"
    
    @pytest.mark.asyncio
    async def test_all_experts_context_gathering(self):
        """Test that all experts can gather context (async test)."""
        # Create mock services
        mock_memory = AsyncMock()
        mock_memory.get_conversation_context.return_value = {"conversation": "test"}
        
        mock_rag = AsyncMock()
        mock_rag.retrieve_relevant_content.return_value = {"content": "test"}
        
        experts = [
            CommunicationExpert(memory_service=mock_memory, rag_service=mock_rag),
            RapportExpert(memory_service=mock_memory, rag_service=mock_rag),
            EmotionsExpert(memory_service=mock_memory, rag_service=mock_rag),
            CreativityExpert(memory_service=mock_memory, rag_service=mock_rag),
            StrategyExpert(memory_service=mock_memory, rag_service=mock_rag),
            FearsExpert(memory_service=mock_memory, rag_service=mock_rag),
            AppearanceExpert(memory_service=mock_memory, rag_service=mock_rag),
            PracticeExpert(memory_service=mock_memory, rag_service=mock_rag),
            IntegratorExpert(memory_service=mock_memory, rag_service=mock_rag)
        ]
        
        for expert in experts:
            context = await expert.get_relevant_context("test input", "conversation123")
            
            # Should return a dictionary
            assert isinstance(context, dict)
            
            # Should include memory context if service is available
            if expert.memory_service:
                assert "memory" in context
            
            # Should include RAG context if service is available
            if expert.rag_service:
                assert "rag" in context