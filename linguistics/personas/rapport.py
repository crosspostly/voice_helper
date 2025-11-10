"""
Rapport Expert persona.

Specializes in relationship building, trust, and emotional connection.
"""

import logging
from typing import Dict, List, Optional, Any
import re

from .base import BasePersona
from .prompts import get_persona_metadata


logger = logging.getLogger(__name__)


class RapportExpert(BasePersona):
    """
    Rapport Expert specializing in relationship building, trust, and emotional connection.
    
    Focuses on creating warmth, authenticity, and genuine connection in interactions.
    Helps users build stronger, more meaningful relationships.
    """
    
    def __init__(
        self,
        memory_service=None,
        rag_service=None
    ):
        """Initialize the Rapport Expert."""
        rapport_meta = get_persona_metadata("rapport")
        super().__init__(
            name=rapport_meta.name,
            description=rapport_meta.description,
            routing_keywords=rapport_meta.routing_keywords,
            memory_service=memory_service,
            rag_service=rag_service
        )
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for the rapport expert."""
        return get_persona_metadata("rapport").system_prompt
    
    def get_expertise_areas(self) -> List[str]:
        """Get the rapport expert's expertise areas."""
        return get_persona_metadata("rapport").expertise_areas
    
    def preprocess_input(self, user_input: str, context: Dict[str, Any]) -> str:
        """
        Preprocess input to identify relationship dynamics and connection opportunities.
        
        Args:
            user_input: Raw user input
            context: Additional context
            
        Returns:
            Preprocessed input with rapport analysis
        """
        # Identify relationship context
        relationship_indicators = []
        
        # Check for relationship type indicators
        relationship_types = {
            "friend": ["friend", "friendship", "buddy", "pal"],
            "romantic": ["partner", "relationship", "dating", "boyfriend", "girlfriend", "spouse", "husband", "wife"],
            "family": ["family", "parent", "child", "sibling", "mother", "father", "brother", "sister"],
            "work": ["coworker", "colleague", "boss", "manager", "team", "professional"],
            "new": ["new", "just met", "stranger", "acquaintance"]
        }
        
        for rel_type, keywords in relationship_types.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                relationship_indicators.append(rel_type)
        
        # Check for connection needs
        connection_needs = []
        if "trust" in user_input.lower() or "distrust" in user_input.lower():
            connection_needs.append("trust")
        if "connect" in user_input.lower() or "connection" in user_input.lower():
            connection_needs.append("connection")
        if "close" in user_input.lower() or "intimacy" in user_input.lower():
            connection_needs.append("closeness")
        if "awkward" in user_input.lower() or "uncomfortable" in user_input.lower():
            connection_needs.append("comfort")
        
        # Add rapport context to the input
        context_elements = []
        if relationship_indicators:
            context_elements.append(f"relationship_type: {', '.join(relationship_indicators)}")
        if connection_needs:
            context_elements.append(f"connection_needs: {', '.join(connection_needs)}")
        
        if context_elements:
            context_prefix = f"[Rapport context: {'; '.join(context_elements)}] "
            return context_prefix + user_input
        
        return user_input
    
    def postprocess_response(self, response: str, context: Dict[str, Any]) -> str:
        """
        Postprocess response to enhance relationship-building effectiveness.
        
        Args:
            response: Raw response from AI model
            context: Additional context
            
        Returns:
            Enhanced response with rapport-building tips
        """
        # Add rapport-building tips if relevant
        original_input = context.get("original_input", "")
        
        # Check if user is asking for help with relationships
        help_patterns = [
            r"how to (connect|build|improve).*(relationship|trust|rapport)",
            r"help me (connect|build|improve)",
            r"(build|create|establish).*(trust|connection|rapport)"
        ]
        
        if any(re.search(pattern, original_input.lower()) for pattern in help_patterns):
            # Add a practical rapport-building tip
            tip = self._get_rapport_tip(original_input)
            if tip:
                response = f"{response}\n\n🤝 **Rapport-Building Tip:** {tip}"
        
        return response
    
    def _get_rapport_tip(self, user_input: str) -> str:
        """
        Generate a relevant rapport-building tip based on user input.
        
        Args:
            user_input: The user's input
            
        Returns:
            Relevant rapport-building tip
        """
        input_lower = user_input.lower()
        
        if "trust" in input_lower:
            return "Build trust through consistency: keep your promises, be reliable, and maintain confidentiality. Trust is built through small, consistent actions over time."
        
        if "new" in input_lower or "meet" in input_lower:
            return "Find common ground by asking open-ended questions about their interests, experiences, or opinions. Listen actively and show genuine curiosity about who they are."
        
        if "awkward" in input_lower or "uncomfortable" in input_lower:
            return "Break the tension with shared vulnerability or humor. Acknowledge the discomfort lightly ('Well, this is a bit awkward, but...') and focus on finding common interests."
        
        if "deep" in input_lower or "meaningful" in input_lower:
            return "Move beyond small talk by asking about values, dreams, or challenges. Share something authentic about yourself to create space for deeper connection."
        
        if "work" in input_lower or "professional" in input_lower:
            return "Build professional rapport by showing competence, reliability, and respect for others' time and expertise. Offer help and acknowledge others' contributions genuinely."
        
        if "conflict" in input_lower or "disagreement" in input_lower:
            return "Maintain connection during disagreements by focusing on understanding rather than winning. Validate their perspective even when you disagree: 'I can see why you feel that way...'"
        
        return "Create rapport by mirroring their communication style and energy level, finding common interests, and showing genuine appreciation for who they are."