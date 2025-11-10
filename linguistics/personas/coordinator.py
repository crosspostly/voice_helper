"""
Linguistics Coordinator persona.

Orchestrates expert selection based on user intent, progress state, 
and conversation cues, falling back to default expert when confidence is low.
"""

import logging
from typing import Dict, List, Optional, Any
import re

from .base import BasePersona
from .prompts import get_persona_metadata, get_all_personas_metadata, get_persona_routing_keywords


logger = logging.getLogger(__name__)


class LinguisticsCoordinator(BasePersona):
    """
    Coordinator persona that manages expert selection and conversation flow.
    
    Analyzes user intent and routes to the most appropriate expert persona
    while maintaining conversation continuity and context.
    """
    
    def __init__(
        self,
        memory_service=None,
        rag_service=None,
        confidence_threshold: float = 0.1,
        fallback_expert: str = "communication"
    ):
        """
        Initialize the Linguistics Coordinator.
        
        Args:
            memory_service: Optional memory service for context management
            rag_service: Optional RAG service for knowledge retrieval
            confidence_threshold: Minimum confidence for expert selection
            fallback_expert: Default expert when confidence is low
        """
        coordinator_meta = get_persona_metadata("coordinator")
        super().__init__(
            name=coordinator_meta.name,
            description=coordinator_meta.description,
            routing_keywords=coordinator_meta.routing_keywords,
            memory_service=memory_service,
            rag_service=rag_service
        )
        
        self.confidence_threshold = confidence_threshold
        self.fallback_expert = fallback_expert
        self.all_personas_metadata = get_all_personas_metadata()
        self.routing_keywords = get_persona_routing_keywords()
        
        # Conversation state tracking
        self.current_expert: Optional[str] = None
        self.expert_history: List[str] = []
        self.conversation_context: Dict[str, Any] = {}
        
    def get_system_prompt(self) -> str:
        """Get the system prompt for the coordinator."""
        return get_persona_metadata("coordinator").system_prompt
    
    def get_expertise_areas(self) -> List[str]:
        """Get the coordinator's expertise areas."""
        return get_persona_metadata("coordinator").expertise_areas
    
    def analyze_user_intent(self, user_input: str, context: Dict[str, Any] = None) -> Dict[str, float]:
        """
        Analyze user input to determine intent and expert suitability.
        
        Args:
            user_input: The user's input text
            context: Additional context including conversation history
            
        Returns:
            Dictionary mapping persona IDs to confidence scores
        """
        if context is None:
            context = {}
            
        user_input_lower = user_input.lower()
        intent_scores = {}
        
        # Analyze keyword matches for each persona
        for persona_id, keywords in self.routing_keywords.items():
            if persona_id == "coordinator":  # Skip self
                continue
                
            keyword_matches = sum(1 for keyword in keywords if keyword in user_input_lower)
            keyword_score = keyword_matches / len(keywords) if keywords else 0
            
            # Boost score based on conversation context
            context_boost = self._calculate_context_boost(persona_id, context, user_input)
            
            # Calculate final confidence score
            final_score = min(1.0, keyword_score + context_boost)
            intent_scores[persona_id] = final_score
        
        return intent_scores
    
    def _calculate_context_boost(self, persona_id: str, context: Dict[str, Any], user_input: str) -> float:
        """
        Calculate context-based confidence boost for a persona.
        
        Args:
            persona_id: The persona ID to calculate boost for
            context: Conversation context
            user_input: Current user input
            
        Returns:
            Confidence boost value (0.0 to 0.3)
        """
        boost = 0.0
        
        # Boost if continuing same topic area
        if self.current_expert:
            current_meta = self.all_personas_metadata[self.current_expert]
            target_meta = self.all_personas_metadata[persona_id]
            
            # Check expertise overlap
            overlap = set(current_meta.expertise_areas) & set(target_meta.expertise_areas)
            if overlap:
                boost += 0.1
            
            # Check for continuation indicators
            continuation_indicators = ["continue", "more", "also", "additionally", "further"]
            if any(indicator in user_input.lower() for indicator in continuation_indicators):
                if persona_id == self.current_expert:
                    boost += 0.2
        
        # Boost based on recent expert usage (avoid rapid switching)
        if self.expert_history:
            recent_experts = self.expert_history[-3:]  # Last 3 experts
            if persona_id in recent_experts:
                boost += 0.05
        
        # Boost based on explicit transition requests
        transition_patterns = [
            r"switch to (\w+)",
            r"let's talk about (\w+)",
            r"what about (\w+)",
            r"can we discuss (\w+)",
        ]
        
        for pattern in transition_patterns:
            match = re.search(pattern, user_input.lower())
            if match:
                requested_topic = match.group(1)
                # Map topic to persona
                for pid, meta in self.all_personas_metadata.items():
                    if requested_topic in meta.routing_keywords or requested_topic in meta.expertise_areas:
                        if pid == persona_id:
                            boost += 0.3
                        break
        
        return min(0.3, boost)
    
    def select_best_expert(self, user_input: str, context: Dict[str, Any] = None) -> str:
        """
        Select the best expert for the given user input.
        
        Args:
            user_input: The user's input text
            context: Additional context
            
        Returns:
            Selected persona ID
        """
        intent_scores = self.analyze_user_intent(user_input, context)
        
        # Find the best scoring expert
        best_expert = None
        best_score = 0.0
        
        for persona_id, score in intent_scores.items():
            if score > best_score:
                best_score = score
                best_expert = persona_id
        
        # Use fallback if confidence is too low
        if best_score < self.confidence_threshold:
            logger.info(f"Low confidence ({best_score:.2f}), using fallback: {self.fallback_expert}")
            return self.fallback_expert
        
        logger.info(f"Selected expert: {best_expert} (confidence: {best_score:.2f})")
        return best_expert
    
    def should_handle_intent(self, user_input: str, confidence_threshold: float = 0.5) -> bool:
        """
        Determine if coordinator should handle the input directly.
        
        Args:
            user_input: The user's input text
            confidence_threshold: Minimum confidence to handle directly
            
        Returns:
            True if coordinator should handle the input
        """
        # Handle coordination-related requests
        coordination_keywords = [
            "which expert", "help me choose", "coordinate", "orchestrate",
            "switch expert", "change expert", "different perspective"
        ]
        
        user_input_lower = user_input.lower()
        coordination_matches = sum(1 for kw in coordination_keywords if kw in user_input_lower)
        
        # Also handle when multiple experts have similar confidence
        if coordination_matches > 0:
            return True
        
        intent_scores = self.analyze_user_intent(user_input)
        if len(intent_scores) == 0:
            return True
        
        # Check if there's a clear winner
        sorted_scores = sorted(intent_scores.values(), reverse=True)
        if len(sorted_scores) >= 2 and abs(sorted_scores[0] - sorted_scores[1]) < 0.1:
            return True  # Ambiguous, coordinator should clarify
        
        return False
    
    def update_conversation_state(self, selected_expert: str, user_input: str) -> None:
        """
        Update the conversation state after expert selection.
        
        Args:
            selected_expert: The expert that was selected
            user_input: The user's input that triggered the selection
        """
        # Update current expert
        if self.current_expert != selected_expert:
            self.expert_history.append(self.current_expert) if self.current_expert else None
            self.current_expert = selected_expert
            
            # Log expert transition
            logger.info(f"Expert transition: {self.expert_history[-1] if self.expert_history else 'None'} -> {selected_expert}")
    
    def get_expert_transition_message(self, from_expert: str, to_expert: str) -> str:
        """
        Generate a transition message when switching experts.
        
        Args:
            from_expert: The previous expert ID
            to_expert: The new expert ID
            
        Returns:
            Transition message string
        """
        from_meta = self.all_personas_metadata.get(from_expert)
        to_meta = self.all_personas_metadata.get(to_expert)
        
        if not to_meta:
            return "Let me help you with that..."
        
        transition_messages = [
            f"Let me bring in our {to_meta.name.lower()} for this.",
            f"I'd like to bring in our {to_meta.name.lower()} to better assist you.",
            f"For this, let me connect you with our {to_meta.name.lower()}.",
        ]
        
        # Add context if there was a previous expert
        if from_meta and from_meta != to_meta:
            transition_messages.append(
                f"Building on what we've discussed, let me bring in our {to_meta.name.lower()} for additional perspective."
            )
        
        return transition_messages[0]  # Return first message for simplicity
    
    def preprocess_input(self, user_input: str, context: Dict[str, Any]) -> str:
        """
        Preprocess input for coordinator-specific handling.
        
        Args:
            user_input: Raw user input
            context: Additional context
            
        Returns:
            Preprocessed input
        """
        # Add coordinator context if needed
        if self.should_handle_intent(user_input):
            coordinator_context = "As the Linguistics Coordinator, "
            return coordinator_context + user_input
        
        return user_input
    
    def postprocess_response(self, response: str, context: Dict[str, Any]) -> str:
        """
        Postprocess coordinator response.
        
        Args:
            response: Raw response from AI model
            context: Additional context
            
        Returns:
            Postprocessed response
        """
        # Add expert transition information if applicable
        selected_expert = context.get("selected_expert")
        if selected_expert and selected_expert != self.current_expert:
            transition_msg = self.get_expert_transition_message(
                self.current_expert or "none",
                selected_expert
            )
            response = f"{transition_msg}\n\n{response}"
        
        return response