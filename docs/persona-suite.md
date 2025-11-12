# Persona Suite Documentation

## Overview

The Persona Suite is a comprehensive system of specialized AI experts that can be dynamically selected based on user intent and conversation context. It consists of a coordinator and nine expert personas, each with distinct expertise areas and specialized capabilities.

## Architecture

### Core Components

1. **BasePersona** - Abstract base class providing common functionality
2. **LinguisticsCoordinator** - Orchestrates expert selection and conversation flow
3. **Expert Personas** - Nine specialized experts with distinct domains
4. **Memory Service** - Manages conversation context and history
5. **RAG Service** - Provides relevant knowledge retrieval

### Expert Personas

| Persona | Expertise | Routing Keywords | Focus Areas |
|---------|------------|------------------|--------------|
| **Communication Expert** | Language, clarity, interpersonal dynamics | communicate, speak, talk, listen, understand, explain, clarity, language, communication skills, better communication | communication, language, clarity, interpersonal_skills |
| **Rapport Expert** | Relationship building, trust, emotional connection | relationship, trust, connect, bond, rapport, friendship, connection | relationships, trust_building, emotional_connection, rapport |
| **Emotions Expert** | Emotional intelligence, empathy, mood analysis | emotion, feeling, empathy, mood, emotional, sentiment, affect, feel, angry, sad, happy, anxious | emotional_intelligence, empathy, mood_analysis, emotional_regulation |
| **Creativity Expert** | Innovation, brainstorming, creative problem-solving | creative, innovate, brainstorm, imagine, create, design, invent, ideas, innovative | creativity, innovation, brainstorming, creative_problem_solving |
| **Strategy Expert** | Planning, decision-making, systematic thinking | strategy, plan, decide, analyze, systematic, logical, approach, strategic, planning | strategy, planning, decision_making, systematic_thinking |
| **Fears Expert** | Anxiety management, risk assessment, comfort building | fear, anxiety, worry, stress, comfort, reassurance, confidence, anxious, afraid, scared, nervous, public speaking, speaking anxiety | fear_management, anxiety_reduction, confidence_building, comfort |
| **Appearance Expert** | Visual presentation, aesthetics, style guidance | appearance, look, style, visual, design, aesthetic, present | appearance, visual_presentation, aesthetics, style |
| **Practice Expert** | Skill development, learning strategies, improvement | practice, learn, improve, skill development, develop, train, master, how to practice, get better at | practice, skill_development, learning_strategies, improvement |
| **Integrator Expert** | Synthesis, pattern recognition, holistic understanding | integrate, synthesize, pattern, holistic, connect, unify, big picture | integration, synthesis, pattern_recognition, holistic_understanding |

## Usage

### Basic Usage

```python
from linguistics.personas import LinguisticsCoordinator

# Initialize coordinator
coordinator = LinguisticsCoordinator()

# Route user input to appropriate expert
user_input = "I need help with communication skills"
selected_expert = coordinator.select_best_expert(user_input)
print(f"Selected expert: {selected_expert}")

# Create expert instance
from linguistics.personas import CommunicationExpert
expert = CommunicationExpert()

# Preprocess input with context
context = {"original_input": user_input}
processed_input = expert.preprocess_input(user_input, context)

# Postprocess response
response = "Here's some communication advice"
enhanced_response = expert.postprocess_response(response, context)
```

### Advanced Usage with Services

```python
from linguistics.personas import EmotionsExpert
from linguistics.memory import MemoryService
from linguistics.rag import RAGService

# Create services
memory_service = MemoryService()
rag_service = RAGService()

# Create expert with services
expert = EmotionsExpert(
    memory_service=memory_service,
    rag_service=rag_service
)

# Get relevant context
context = await expert.get_relevant_context(
    user_input="I'm feeling anxious about my presentation",
    conversation_id="user123"
)
```

### Conversation State Management

```python
# Update conversation state
coordinator.update_conversation_state("communication", user_input)

# Get transition message
transition_msg = coordinator.get_expert_transition_message(
    from_expert="communication",
    to_expert="emotions"
)

# Check conversation history
print(f"Current expert: {coordinator.current_expert}")
print(f"Expert history: {coordinator.expert_history}")
```

## Key Features

### Intelligent Routing

The coordinator uses multiple factors to select the best expert:

1. **Keyword Matching** - Direct keyword matches in user input
2. **Context Boosting** - Confidence boosts based on conversation context
3. **Continuation Detection** - Boosts for continuing same topic area
4. **Transition Requests** - Handles explicit expert switching requests

### Expert Specialization

Each expert provides:

- **Specialized System Prompts** - Tailored for their domain expertise
- **Input Preprocessing** - Identifies domain-specific patterns and needs
- **Output Postprocessing** - Adds relevant tips and enhancements
- **Context Awareness** - Integrates with memory and RAG services

### Localization Support

All persona metadata includes:

- **English Names and Descriptions** - Primary language for Gemini compatibility
- **Russian Translations** - Localized names and descriptions
- **Extensible Structure** - Easy to add more languages

## Configuration

### Coordinator Settings

```python
coordinator = LinguisticsCoordinator(
    confidence_threshold=0.1,  # Minimum confidence for expert selection
    fallback_expert="communication",  # Default expert when confidence is low
    memory_service=memory_service,     # Optional memory service
    rag_service=rag_service          # Optional RAG service
)
```

### Custom Expert Creation

```python
from linguistics.personas.base import BasePersona
from linguistics.personas.prompts import PersonaMetadata

class CustomExpert(BasePersona):
    def __init__(self, memory_service=None, rag_service=None):
        metadata = PersonaMetadata(
            name="Custom Expert",
            description="Expert in custom domain",
            routing_keywords=["custom", "specialized"],
            expertise_areas=["custom_domain"],
            system_prompt="You are a custom expert..."
        )
        super().__init__(
            name=metadata.name,
            description=metadata.description,
            routing_keywords=metadata.routing_keywords,
            memory_service=memory_service,
            rag_service=rag_service
        )
    
    def get_system_prompt(self):
        return "You are a custom expert..."
    
    def get_expertise_areas(self):
        return ["custom_domain"]
```

## Testing

The persona suite includes comprehensive tests:

```bash
# Run all tests
python tests/python/personas/simple_test_runner.py

# Test specific components
python -c "
from linguistics.personas import LinguisticsCoordinator
coordinator = LinguisticsCoordinator()
print('Coordinator routing works:', coordinator.select_best_expert('help me communicate'))
"
```

## Integration

### With Main Application

```python
# In your main app
from linguistics.personas import LinguisticsCoordinator

class VoiceAssistant:
    def __init__(self):
        self.coordinator = LinguisticsCoordinator()
        self.current_expert = None
    
    async def process_user_input(self, user_input, conversation_id=None):
        # Select expert
        selected_expert_id = self.coordinator.select_best_expert(user_input)
        
        # Create expert instance
        expert_class = self.get_expert_class(selected_expert_id)
        expert = expert_class()
        
        # Get context
        context = await expert.get_relevant_context(user_input, conversation_id)
        
        # Process input
        processed_input = expert.preprocess_input(user_input, context)
        
        # Generate response (with your AI model)
        ai_response = await self.generate_response(processed_input, expert.get_system_prompt())
        
        # Postprocess response
        final_response = expert.postprocess_response(ai_response, context)
        
        # Update state
        self.coordinator.update_conversation_state(selected_expert_id, user_input)
        
        return final_response
```

## Best Practices

1. **Start with Coordinator** - Always use the coordinator for expert selection
2. **Provide Context** - Include conversation history and user context
3. **Handle Transitions** - Use transition messages when switching experts
4. **Monitor Confidence** - Check confidence scores and adjust thresholds
5. **Extend Carefully** - Follow the established patterns when adding new experts

## Troubleshooting

### Common Issues

1. **Routing to Communication Expert** - Check confidence threshold and keyword matches
2. **No Expert Selected** - Verify routing keywords and input preprocessing
3. **Context Not Available** - Ensure memory and RAG services are properly initialized
4. **Transition Messages Missing** - Check conversation state updates

### Debug Tools

```python
# Debug routing
coordinator = LinguisticsCoordinator()
scores = coordinator.analyze_user_intent("user input")
print("Intent scores:", scores)

# Debug expert processing
expert = CommunicationExpert()
processed = expert.preprocess_input("input", {})
print("Processed input:", processed)
```

## Future Enhancements

1. **Semantic Similarity** - Add embedding-based routing for better intent understanding
2. **Multi-Expert Coordination** - Support for multiple experts working together
3. **Learning Adaptation** - Adjust routing based on user feedback
4. **Performance Optimization** - Cache frequently used experts and contexts
5. **Additional Languages** - Extend localization support to more languages