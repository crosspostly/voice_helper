"""
Emotions Expert persona.

Specializes in emotional intelligence, empathy, and mood analysis.
"""

import logging
from typing import Dict, List, Optional, Any
import re

from .base import BasePersona
from .prompts import get_persona_metadata


logger = logging.getLogger(__name__)


class EmotionsExpert(BasePersona):
    """
    Emotions Expert specializing in emotional intelligence, empathy, and mood analysis.
    
    Focuses on emotional awareness, understanding, and healthy expression.
    Helps users navigate their emotional landscape with wisdom and compassion.
    """
    
    def __init__(
        self,
        memory_service=None,
        rag_service=None
    ):
        """Initialize the Emotions Expert."""
        emotions_meta = get_persona_metadata("emotions")
        super().__init__(
            name=emotions_meta.name,
            description=emotions_meta.description,
            routing_keywords=emotions_meta.routing_keywords,
            memory_service=memory_service,
            rag_service=rag_service
        )
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for the emotions expert."""
        return get_persona_metadata("emotions").system_prompt
    
    def get_expertise_areas(self) -> List[str]:
        """Get the emotions expert's expertise areas."""
        return get_persona_metadata("emotions").expertise_areas
    
    def preprocess_input(self, user_input: str, context: Dict[str, Any]) -> str:
        """
        Preprocess input to identify emotional patterns and needs.
        
        Args:
            user_input: Raw user input
            context: Additional context
            
        Returns:
            Preprocessed input with emotional analysis
        """
        # Identify emotional content
        emotional_indicators = []
        
        # Basic emotions mapping
        emotion_keywords = {
            "joy": ["happy", "excited", "joyful", "pleased", "delighted", "glad", "cheerful"],
            "sadness": ["sad", "down", "depressed", "unhappy", "miserable", "blue", "gloomy"],
            "anger": ["angry", "mad", "furious", "irritated", "annoyed", "frustrated", "upset"],
            "fear": ["afraid", "scared", "fearful", "anxious", "worried", "nervous", "terrified"],
            "surprise": ["surprised", "shocked", "amazed", "astonished", "stunned"],
            "disgust": ["disgusted", "revolted", "repulsed", "sickened"],
            "love": ["love", "affection", "caring", "attached", "fond"],
            "shame": ["ashamed", "embarrassed", "humiliated", "guilty"]
        }
        
        detected_emotions = []
        for emotion, keywords in emotion_keywords.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                detected_emotions.append(emotion)
        
        # Check for emotional intensity
        intensity_indicators = {
            "high": ["very", "extremely", "incredibly", "overwhelmingly", "completely"],
            "moderate": ["quite", "rather", "somewhat", "pretty"],
            "low": ["a little", "slightly", "a bit", "kind of"]
        }
        
        emotional_intensity = "moderate"  # default
        for intensity, keywords in intensity_indicators.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                emotional_intensity = intensity
                break
        
        # Check for emotional regulation needs
        regulation_needs = []
        if "control" in user_input.lower() or "manage" in user_input.lower():
            regulation_needs.append("regulation")
        if "understand" in user_input.lower() or "figure out" in user_input.lower():
            regulation_needs.append("understanding")
        if "deal with" in user_input.lower() or "handle" in user_input.lower():
            regulation_needs.append("coping")
        
        # Add emotional context to the input
        context_elements = []
        if detected_emotions:
            context_elements.append(f"emotions: {', '.join(detected_emotions)}")
        if emotional_intensity != "moderate":
            context_elements.append(f"intensity: {emotional_intensity}")
        if regulation_needs:
            context_elements.append(f"needs: {', '.join(regulation_needs)}")
        
        if context_elements:
            context_prefix = f"[Emotional context: {'; '.join(context_elements)}] "
            return context_prefix + user_input
        
        return user_input
    
    def postprocess_response(self, response: str, context: Dict[str, Any]) -> str:
        """
        Postprocess response to enhance emotional intelligence and support.
        
        Args:
            response: Raw response from AI model
            context: Additional context
            
        Returns:
            Enhanced response with emotional intelligence tips
        """
        # Add emotional intelligence tips if relevant
        original_input = context.get("original_input", "")
        
        # Check if user is asking for help with emotions
        help_patterns = [
            r"how to (deal with|handle|manage|understand).*(emotion|feeling)",
            r"help me (deal with|handle|manage|understand)",
            r"(control|regulate|manage).*(emotions|feelings)"
        ]
        
        if any(re.search(pattern, original_input.lower()) for pattern in help_patterns):
            # Add a practical emotional intelligence tip
            tip = self._get_emotional_intelligence_tip(original_input)
            if tip:
                response = f"{response}\n\n💚 **Emotional Intelligence Tip:** {tip}"
        
        return response
    
    def _get_emotional_intelligence_tip(self, user_input: str) -> str:
        """
        Generate a relevant emotional intelligence tip based on user input.
        
        Args:
            user_input: The user's input
            
        Returns:
            Relevant emotional intelligence tip
        """
        input_lower = user_input.lower()
        
        if "anger" in input_lower or "angry" in input_lower:
            return "Practice the STOP technique: Stop, Take a breath, Observe your anger without judgment, and Proceed mindfully. Anger is often a signal that a boundary has been crossed or a need isn't being met."
        
        if "sad" in input_lower or "depressed" in input_lower:
            return "Allow yourself to feel sadness fully without judgment. Sadness often indicates loss or disappointment. Practice self-compassion and remember that emotions are temporary visitors, not permanent residents."
        
        if "anxiety" in input_lower or "worried" in input_lower or "fear" in input_lower:
            return "Use the 5-4-3-2-1 grounding technique: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. This brings you back to the present moment and reduces future-oriented worry."
        
        if "understand" in input_lower or "identify" in input_lower:
            return "Practice emotional labeling by asking yourself: 'What am I feeling right now?' Be specific - instead of 'bad,' try 'disappointed,' 'frustrated,' or 'hurt.' Naming emotions accurately reduces their intensity."
        
        if "regulate" in input_lower or "control" in input_lower:
            return "Remember that emotions aren't good or bad - they're information. Instead of trying to control emotions, practice responding to them wisely. The goal is emotional agility, not emotional suppression."
        
        if "empathy" in input_lower or "understand others" in input_lower:
            return "Practice empathetic listening: Listen to understand, not to respond. Reflect back what you hear ('It sounds like you're feeling...') and validate their emotional experience, even if you don't agree with their perspective."
        
        return "Practice emotional awareness by checking in with yourself regularly: 'What am I feeling right now? Where do I feel it in my body? What might this emotion be telling me?'"