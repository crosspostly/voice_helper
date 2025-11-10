"""
Tests for persona prompts and metadata functionality.
"""

import pytest
from linguistics.personas.prompts import (
    get_persona_metadata,
    get_all_personas_metadata,
    get_persona_routing_keywords,
    get_persona_by_keyword,
    PERSONAS_METADATA
)


class TestPersonaPrompts:
    """Test suite for persona prompts and metadata."""
    
    def test_get_all_personas_metadata(self):
        """Test that all personas have proper metadata."""
        all_metadata = get_all_personas_metadata()
        
        # Check that we have 10 personas (coordinator + 9 experts)
        assert len(all_metadata) == 10
        
        # Check that all required personas are present
        required_personas = [
            "coordinator", "communication", "rapport", "emotions", "creativity",
            "strategy", "fears", "appearance", "practice", "integrator"
        ]
        
        for persona_id in required_personas:
            assert persona_id in all_metadata, f"Missing persona: {persona_id}"
    
    def test_persona_metadata_structure(self):
        """Test that each persona has the required metadata structure."""
        all_metadata = get_all_personas_metadata()
        
        for persona_id, metadata in all_metadata.items():
            # Check required attributes
            assert hasattr(metadata, 'name'), f"{persona_id} missing name"
            assert hasattr(metadata, 'description'), f"{persona_id} missing description"
            assert hasattr(metadata, 'routing_keywords'), f"{persona_id} missing routing_keywords"
            assert hasattr(metadata, 'expertise_areas'), f"{persona_id} missing expertise_areas"
            assert hasattr(metadata, 'system_prompt'), f"{persona_id} missing system_prompt"
            
            # Check data types
            assert isinstance(metadata.name, str), f"{persona_id} name should be string"
            assert isinstance(metadata.description, str), f"{persona_id} description should be string"
            assert isinstance(metadata.routing_keywords, list), f"{persona_id} routing_keywords should be list"
            assert isinstance(metadata.expertise_areas, list), f"{persona_id} expertise_areas should be list"
            assert isinstance(metadata.system_prompt, str), f"{persona_id} system_prompt should be string"
            
            # Check that lists are not empty
            assert len(metadata.routing_keywords) > 0, f"{persona_id} routing_keywords should not be empty"
            assert len(metadata.expertise_areas) > 0, f"{persona_id} expertise_areas should not be empty"
            assert len(metadata.system_prompt) > 100, f"{persona_id} system_prompt should be substantial"
    
    def test_get_persona_metadata(self):
        """Test getting metadata for specific personas."""
        # Test getting coordinator metadata
        coordinator_meta = get_persona_metadata("coordinator")
        assert coordinator_meta.name == "Linguistics Coordinator"
        assert "coordinate" in " ".join(coordinator_meta.routing_keywords).lower()
        
        # Test getting communication expert metadata
        comm_meta = get_persona_metadata("communication")
        assert "communication" in comm_meta.name.lower()
        assert "communicate" in " ".join(comm_meta.routing_keywords).lower()
        
        # Test that invalid persona raises error
        with pytest.raises(ValueError, match="Unknown persona"):
            get_persona_metadata("nonexistent_persona")
    
    def test_routing_keywords_coverage(self):
        """Test that routing keywords are comprehensive and unique enough."""
        routing_keywords = get_persona_routing_keywords()
        
        # Check that all personas have routing keywords
        assert len(routing_keywords) == 10
        
        # Check for keyword overlap (some overlap is okay, but not too much)
        all_keywords = []
        for persona_id, keywords in routing_keywords.items():
            all_keywords.extend(keywords)
        
        # Check that we have a reasonable number of unique keywords
        unique_keywords = set(all_keywords)
        assert len(unique_keywords) >= 30, "Should have at least 30 unique routing keywords"
    
    def test_get_persona_by_keyword(self):
        """Test keyword-based persona lookup."""
        # Test communication-related keywords
        comm_personas = get_persona_by_keyword("communicate")
        assert "communication" in comm_personas
        
        # Test emotion-related keywords
        emotion_personas = get_persona_by_keyword("emotion")
        assert "emotions" in emotion_personas
        
        # Test creativity-related keywords
        creative_personas = get_persona_by_keyword("creative")
        assert "creativity" in creative_personas
        
        # Test non-existent keyword
        empty_result = get_persona_by_keyword("nonexistent_keyword_xyz")
        assert len(empty_result) == 0
    
    def test_system_prompt_quality(self):
        """Test that system prompts are well-formed and comprehensive."""
        all_metadata = get_all_personas_metadata()
        
        for persona_id, metadata in all_metadata.items():
            prompt = metadata.system_prompt
            
            # Check prompt length
            assert len(prompt) > 200, f"{persona_id} system prompt should be substantial"
            
            # Check that prompt contains persona-specific content
            assert persona_id.lower() in prompt.lower() or metadata.name.lower() in prompt.lower(), \
                f"{persona_id} system prompt should mention the persona"
            
            # Check that prompt contains actionable guidance
            action_words = ["focus on", "help users", "specialize in", "provide", "teach"]
            has_action = any(word in prompt.lower() for word in action_words)
            assert has_action, f"{persona_id} system prompt should contain actionable guidance"
    
    def test_localized_metadata(self):
        """Test that localized metadata is properly structured."""
        all_metadata = get_all_personas_metadata()
        
        for persona_id, metadata in all_metadata.items():
            # Check that localized names exist
            assert hasattr(metadata, 'localized_names')
            assert isinstance(metadata.localized_names, dict)
            
            # Check that English is present
            assert "en" in metadata.localized_names, f"{persona_id} should have English name"
            assert metadata.localized_names["en"] == metadata.name, \
                f"{persona_id} English name should match main name"
            
            # Check that localized descriptions exist
            assert hasattr(metadata, 'localized_descriptions')
            assert isinstance(metadata.localized_descriptions, dict)
            
            # Check that English is present
            assert "en" in metadata.localized_descriptions, f"{persona_id} should have English description"
            assert metadata.localized_descriptions["en"] == metadata.description, \
                f"{persona_id} English description should match main description"
    
    def test_expertise_areas_quality(self):
        """Test that expertise areas are well-defined and appropriate."""
        all_metadata = get_all_personas_metadata()
        
        for persona_id, metadata in all_metadata.items():
            areas = metadata.expertise_areas
            
            # Check that areas are relevant to persona
            assert len(areas) >= 2, f"{persona_id} should have at least 2 expertise areas"
            
            # Check that areas are strings
            for area in areas:
                assert isinstance(area, str), f"{persona_id} expertise area should be string"
                assert len(area) > 0, f"{persona_id} expertise area should not be empty"
    
    def test_persona_uniqueness(self):
        """Test that personas are distinct and have unique identities."""
        all_metadata = get_all_personas_metadata()
        
        names = [meta.name for meta in all_metadata.values()]
        unique_names = set(names)
        
        # Check that all names are unique
        assert len(names) == len(unique_names), "All persona names should be unique"
        
        # Check that routing keywords have reasonable differentiation
        keyword_sets = []
        for metadata in all_metadata.values():
            keyword_set = set(metadata.routing_keywords)
            keyword_sets.append(keyword_set)
        
        # Check that not all keyword sets are identical
        # (some overlap is expected and okay)
        unique_keyword_sets = [frozenset(ks) for ks in keyword_sets]
        assert len(set(unique_keyword_sets)) > 1, "Persona routing keywords should be differentiated"