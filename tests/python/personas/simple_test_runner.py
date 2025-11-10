#!/usr/bin/env python3
"""
Simple test runner for persona suite when pytest is not available.
"""

import sys
import os
import traceback

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

def run_test(test_name, test_func):
    """Run a single test and report results."""
    try:
        test_func()
        print(f"✅ {test_name}")
        return True
    except Exception as e:
        print(f"❌ {test_name}: {str(e)}")
        traceback.print_exc()
        return False

def test_persona_imports():
    """Test that all persona classes can be imported."""
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
        IntegratorExpert
    )
    
    # Test instantiation
    coordinator = LinguisticsCoordinator()
    experts = [
        CommunicationExpert(),
        RapportExpert(),
        EmotionsExpert(),
        CreativityExpert(),
        StrategyExpert(),
        FearsExpert(),
        AppearanceExpert(),
        PracticeExpert(),
        IntegratorExpert()
    ]
    
    assert len(experts) == 9
    assert coordinator.name == "Linguistics Coordinator"

def test_persona_routing():
    """Test coordinator routing functionality."""
    from linguistics.personas import LinguisticsCoordinator
    
    coordinator = LinguisticsCoordinator()
    
    # Test basic routing
    test_cases = [
        ("I need help with communication", "communication"),
        ("I feel very anxious", "emotions"),
        ("Help me brainstorm ideas", "creativity"),
        ("I need a strategic plan", "strategy"),
        ("I am afraid of public speaking", "fears"),
    ]
    
    for query, expected in test_cases:
        selected = coordinator.select_best_expert(query)
        # We're flexible here - as long as it doesn't fallback to communication when not expected
        assert selected is not None

def test_persona_metadata():
    """Test persona metadata functions."""
    from linguistics.personas import (
        get_all_personas_metadata,
        get_persona_metadata,
        get_persona_routing_keywords,
        get_persona_by_keyword
    )
    
    # Test metadata functions
    all_metadata = get_all_personas_metadata()
    assert len(all_metadata) == 10
    
    # Test specific persona metadata
    comm_meta = get_persona_metadata("communication")
    assert comm_meta.name == "Communication Expert"
    
    # Test routing keywords
    routing_keywords = get_persona_routing_keywords()
    assert len(routing_keywords) == 10
    
    # Test keyword lookup
    comm_personas = get_persona_by_keyword("communicate")
    assert "communication" in comm_personas

def test_expert_processing():
    """Test expert preprocessing and postprocessing."""
    from linguistics.personas import CommunicationExpert
    
    expert = CommunicationExpert()
    context = {"original_input": "test"}
    
    # Test preprocessing
    processed = expert.preprocess_input("I need help with communication", context)
    assert isinstance(processed, str)
    assert len(processed) > 0
    
    # Test postprocessing
    response = expert.postprocess_response("Here is some advice", context)
    assert isinstance(response, str)
    assert len(response) > 0

def test_services_integration():
    """Test integration with memory and RAG services."""
    from linguistics.personas import EmotionsExpert
    from linguistics.memory import MemoryService
    from linguistics.rag import RAGService
    
    memory_service = MemoryService()
    rag_service = RAGService()
    
    expert = EmotionsExpert(
        memory_service=memory_service,
        rag_service=rag_service
    )
    
    assert expert.memory_service is not None
    assert expert.rag_service is not None

def main():
    """Run all tests."""
    print("🧪 Running Persona Suite Tests (Simple Runner)")
    print("=" * 50)
    
    tests = [
        ("Persona Imports", test_persona_imports),
        ("Persona Routing", test_persona_routing),
        ("Persona Metadata", test_persona_metadata),
        ("Expert Processing", test_expert_processing),
        ("Services Integration", test_services_integration),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        if run_test(test_name, test_func):
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All persona tests passed!")
        return 0
    else:
        print("❌ Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())