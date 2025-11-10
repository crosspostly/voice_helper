"""
Appearance Expert persona.

Specializes in visual presentation, aesthetics, and style guidance.
"""

import logging
from typing import Dict, List, Optional, Any
import re

from .base import BasePersona
from .prompts import get_persona_metadata


logger = logging.getLogger(__name__)


class AppearanceExpert(BasePersona):
    """
    Appearance Expert specializing in visual presentation, aesthetics, and style guidance.
    
    Focuses on enhancing visual appeal and effective visual communication.
    Helps users present themselves and their ideas in the most aesthetically pleasing way.
    """
    
    def __init__(
        self,
        memory_service=None,
        rag_service=None
    ):
        """Initialize the Appearance Expert."""
        appearance_meta = get_persona_metadata("appearance")
        super().__init__(
            name=appearance_meta.name,
            description=appearance_meta.description,
            routing_keywords=appearance_meta.routing_keywords,
            memory_service=memory_service,
            rag_service=rag_service
        )
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for the appearance expert."""
        return get_persona_metadata("appearance").system_prompt
    
    def get_expertise_areas(self) -> List[str]:
        """Get the appearance expert's expertise areas."""
        return get_persona_metadata("appearance").expertise_areas
    
    def preprocess_input(self, user_input: str, context: Dict[str, Any]) -> str:
        """
        Preprocess input to identify appearance and aesthetic needs.
        
        Args:
            user_input: Raw user input
            context: Additional context
            
        Returns:
            Preprocessed input with appearance analysis
        """
        # Identify appearance context
        appearance_indicators = []
        
        # Check for appearance areas
        appearance_areas = {
            "clothing": ["clothes", "outfit", "dress", "wear", "fashion", "style"],
            "grooming": ["hair", "makeup", "grooming", "clean", "tidy", "neat"],
            "presentation": ["present", "presentation", "slides", "visual", "design"],
            "environment": ["room", "space", "environment", "decor", "layout"],
            "digital": ["website", "app", "interface", "digital", "online"],
            "body_language": ["posture", "stance", "gesture", "expression", "body"]
        }
        
        for area_type, keywords in appearance_areas.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                appearance_indicators.append(area_type)
        
        # Check for aesthetic goals
        aesthetic_goals = []
        goals = {
            "professional": ["professional", "business", "work", "office", "corporate"],
            "casual": ["casual", "relaxed", "everyday", "comfortable", "informal"],
            "elegant": ["elegant", "sophisticated", "classy", "refined", "formal"],
            "creative": ["creative", "artistic", "unique", "expressive", "bold"],
            "minimalist": ["minimal", "simple", "clean", "understated", "basic"],
            "trendy": ["trendy", "fashionable", "modern", "current", "stylish"]
        }
        
        for goal_type, keywords in goals.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                aesthetic_goals.append(goal_type)
        
        # Check for context/occasion
        occasion_contexts = []
        contexts = {
            "interview": ["interview", "job", "hiring", "recruiting"],
            "meeting": ["meeting", "conference", "presentation", "business"],
            "social": ["party", "social", "gathering", "event", "celebration"],
            "dating": ["date", "romantic", "attraction", "dating"],
            "daily": ["daily", "everyday", "routine", "regular"]
        }
        
        for context_type, keywords in contexts.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                occasion_contexts.append(context_type)
        
        # Check for specific concerns
        concerns = []
        if "improve" in user_input.lower() or "better" in user_input.lower():
            concerns.append("improvement")
        if "confidence" in user_input.lower() or "comfortable" in user_input.lower():
            concerns.append("confidence")
        if "impression" in user_input.lower() or "perception" in user_input.lower():
            concerns.append("first_impression")
        
        # Add appearance context to the input
        context_elements = []
        if appearance_indicators:
            context_elements.append(f"areas: {', '.join(appearance_indicators)}")
        if aesthetic_goals:
            context_elements.append(f"goals: {', '.join(aesthetic_goals)}")
        if occasion_contexts:
            context_elements.append(f"occasions: {', '.join(occasion_contexts)}")
        if concerns:
            context_elements.append(f"concerns: {', '.join(concerns)}")
        
        if context_elements:
            context_prefix = f"[Appearance context: {'; '.join(context_elements)}] "
            return context_prefix + user_input
        
        return user_input
    
    def postprocess_response(self, response: str, context: Dict[str, Any]) -> str:
        """
        Postprocess response to enhance appearance and aesthetic guidance.
        
        Args:
            response: Raw response from AI model
            context: Additional context
            
        Returns:
            Enhanced response with appearance tips
        """
        # Add appearance tips if relevant
        original_input = context.get("original_input", "")
        
        # Check if user is asking for appearance help
        help_patterns = [
            r"how to (dress|look|appear|present)",
            r"help me (dress|look|appear|present)",
            r"(improve|enhance|better).*(appearance|look|style)"
        ]
        
        if any(re.search(pattern, original_input.lower()) for pattern in help_patterns):
            # Add a practical appearance tip
            tip = self._get_appearance_tip(original_input)
            if tip:
                response = f"{response}\n\n✨ **Appearance Tip:** {tip}"
        
        return response
    
    def _get_appearance_tip(self, user_input: str) -> str:
        """
        Generate a relevant appearance tip based on user input.
        
        Args:
            user_input: The user's input
            
        Returns:
            Relevant appearance tip
        """
        input_lower = user_input.lower()
        
        if "interview" in input_lower or "professional" in input_lower:
            return "For professional settings, follow the 'dress one level up' rule: dress slightly more formal than the daily dress code. Classic fits in neutral colors (navy, gray, black) always convey competence."
        
        if "confidence" in input_lower or "comfortable" in input_lower:
            return "True confidence comes from wearing what makes you feel authentic. Start with well-fitting basics in colors you love, then add one piece that expresses your personality. Comfort and style aren't mutually exclusive."
        
        if "color" in input_lower or "colors" in input_lower:
            return "Use color psychology: blues and grays convey trust and professionalism, reds show confidence, greens suggest growth, and neutrals provide versatility. Choose colors that complement your skin tone and make you feel energized."
        
        if "presentation" in input_lower or "slides" in input_lower:
            return "For visual presentations, follow the 10-20-30 rule: 10 slides maximum, 20 minutes duration, 30-point font minimum. Use high contrast colors, one main idea per slide, and relevant images over text whenever possible."
        
        if "first impression" in input_lower:
            return "First impressions form in 7 seconds. Focus on the three C's: Clean (grooming), Consistent (coordinated style), and Confident (posture and eye contact). Your appearance should communicate the message you want to convey."
        
        if "body language" in input_lower or "posture" in input_lower:
            return "Stand with shoulders back, chin parallel to the floor, and weight evenly distributed. Power poses (taking up space) for 2 minutes before important events can increase confidence and improve how others perceive you."
        
        if "minimalist" in input_lower or "simple" in input_lower:
            return "Embrace the 'third piece' rule: Start with two basics (like pants and a shirt), then add one third piece (jacket, scarf, jewelry) that makes the outfit intentional. Quality basics in neutral colors create endless versatility."
        
        return "The goal of appearance isn't perfection, but authentic self-expression that aligns with your intentions. When you look like the person you want to be, you're more likely to act like that person too."