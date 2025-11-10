"""
Communication Expert persona.

Specializes in language, clarity, and interpersonal dynamics.
"""

import logging
from typing import Dict, List, Optional, Any
import re

from .base import BasePersona
from .prompts import get_persona_metadata


logger = logging.getLogger(__name__)


class CommunicationExpert(BasePersona):
    """
    Communication Expert specializing in language, clarity, and interpersonal dynamics.
    
    Focuses on making interactions clearer, more precise, and more impactful.
    Helps users express themselves effectively and understand others deeply.
    """
    
    def __init__(
        self,
        memory_service=None,
        rag_service=None
    ):
        """Initialize the Communication Expert."""
        comm_meta = get_persona_metadata("communication")
        super().__init__(
            name=comm_meta.name,
            description=comm_meta.description,
            routing_keywords=comm_meta.routing_keywords,
            memory_service=memory_service,
            rag_service=rag_service
        )
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for the communication expert."""
        return get_persona_metadata("communication").system_prompt
    
    def get_expertise_areas(self) -> List[str]:
        """Get the communication expert's expertise areas."""
        return get_persona_metadata("communication").expertise_areas
    
    def preprocess_input(self, user_input: str, context: Dict[str, Any]) -> str:
        """
        Preprocess input to identify communication patterns and issues.
        
        Args:
            user_input: Raw user input
            context: Additional context
            
        Returns:
            Preprocessed input with communication analysis
        """
        # Identify potential communication issues
        communication_issues = []
        
        # Check for clarity issues
        vague_words = ["thing", "stuff", "something", "maybe", "sort of", "kind of"]
        vague_count = sum(1 for word in vague_words if word in user_input.lower())
        if vague_count > 2:
            communication_issues.append("clarity")
        
        # Check for passive voice indicators
        passive_indicators = ["was done by", "is being", "has been", "were made"]
        if any(indicator in user_input.lower() for indicator in passive_indicators):
            communication_issues.append("active_voice")
        
        # Check for emotional context needs
        emotional_words = ["feel", "angry", "sad", "happy", "frustrated", "confused"]
        if any(word in user_input.lower() for word in emotional_words):
            communication_issues.append("emotional_context")
        
        # Add communication context to the input
        if communication_issues:
            context_prefix = f"[Communication focus: {', '.join(communication_issues)}] "
            return context_prefix + user_input
        
        return user_input
    
    def postprocess_response(self, response: str, context: Dict[str, Any]) -> str:
        """
        Postprocess response to enhance communication effectiveness.
        
        Args:
            response: Raw response from AI model
            context: Additional context
            
        Returns:
            Enhanced response with communication tips
        """
        # Add communication tips if relevant
        original_input = context.get("original_input", "")
        
        # Check if user is asking for help with communication
        help_patterns = [
            r"how to (communicate|talk|speak|explain)",
            r"help me (communicate|talk|speak|explain)",
            r"improve my (communication|speaking|writing)"
        ]
        
        if any(re.search(pattern, original_input.lower()) for pattern in help_patterns):
            # Add a practical communication tip
            tip = self._get_communication_tip(original_input)
            if tip:
                response = f"{response}\n\n💡 **Communication Tip:** {tip}"
        
        return response
    
    def _get_communication_tip(self, user_input: str) -> str:
        """
        Generate a relevant communication tip based on user input.
        
        Args:
            user_input: The user's input
            
        Returns:
            Relevant communication tip
        """
        input_lower = user_input.lower()
        
        if "explain" in input_lower or "clarify" in input_lower:
            return "Use the 'What-So What-Now What' framework: What happened, what it means, and what to do next."
        
        if "listen" in input_lower or "understand" in input_lower:
            return "Practice active listening: paraphrase what you heard, ask clarifying questions, and validate emotions."
        
        if "conflict" in input_lower or "disagreement" in input_lower:
            return "Use 'I' statements to express your feelings without blaming others, and focus on interests rather than positions."
        
        if "presentation" in input_lower or "public speaking" in input_lower:
            return "Structure your message with a clear opening, 2-3 key points, and a memorable conclusion. Use stories to illustrate concepts."
        
        if "writing" in input_lower or "email" in input_lower:
            return "Start with your main point, use clear headings, and include a specific call to action. Keep sentences under 20 words when possible."
        
        return "Be specific, use concrete examples, and check for understanding by asking 'Does that make sense?'"