"""
Fears Expert persona.

Specializes in anxiety management, risk assessment, and comfort building.
"""

import logging
from typing import Dict, List, Optional, Any
import re

from .base import BasePersona
from .prompts import get_persona_metadata


logger = logging.getLogger(__name__)


class FearsExpert(BasePersona):
    """
    Fears Expert specializing in anxiety management, risk assessment, and comfort building.
    
    Focuses on creating safety, building confidence, and helping users face their fears.
    Provides gentle guidance and practical tools for managing anxiety.
    """
    
    def __init__(
        self,
        memory_service=None,
        rag_service=None
    ):
        """Initialize the Fears Expert."""
        fears_meta = get_persona_metadata("fears")
        super().__init__(
            name=fears_meta.name,
            description=fears_meta.description,
            routing_keywords=fears_meta.routing_keywords,
            memory_service=memory_service,
            rag_service=rag_service
        )
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for the fears expert."""
        return get_persona_metadata("fears").system_prompt
    
    def get_expertise_areas(self) -> List[str]:
        """Get the fears expert's expertise areas."""
        return get_persona_metadata("fears").expertise_areas
    
    def preprocess_input(self, user_input: str, context: Dict[str, Any]) -> str:
        """
        Preprocess input to identify fear patterns and anxiety triggers.
        
        Args:
            user_input: Raw user input
            context: Additional context
            
        Returns:
            Preprocessed input with fear analysis
        """
        # Identify fear and anxiety indicators
        fear_indicators = []
        
        # Fear and anxiety keywords
        fear_keywords = {
            "anxiety": ["anxious", "anxiety", "nervous", "worried", "uneasy", "restless"],
            "fear": ["afraid", "scared", "fearful", "terrified", "panic", "phobia"],
            "stress": ["stressed", "overwhelmed", "pressure", "tense", "strained"],
            "doubt": ["doubt", "unsure", "uncertain", "insecure", "inadequate"],
            "avoidance": ["avoid", "procrastinate", "put off", "escape", "run away"]
        }
        
        detected_fears = []
        for fear_type, keywords in fear_keywords.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                detected_fears.append(fear_type)
        
        # Check for fear intensity
        intensity_indicators = {
            "high": ["very", "extremely", "overwhelmingly", "completely", "totally"],
            "moderate": ["quite", "rather", "somewhat", "pretty"],
            "low": ["a little", "slightly", "a bit", "kind of"]
        }
        
        fear_intensity = "moderate"  # default
        for intensity, keywords in intensity_indicators.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                fear_intensity = intensity
                break
        
        # Check for fear context
        fear_contexts = []
        contexts = {
            "social": ["people", "social", "public", "speaking", "meeting", "group"],
            "performance": ["performance", "test", "exam", "presentation", "interview"],
            "health": ["health", "illness", "disease", "pain", "injury", "death"],
            "financial": ["money", "financial", "job", "career", "debt", "future"],
            "safety": ["safe", "danger", "harm", "threat", "security"],
            "failure": ["fail", "failure", "mistake", "wrong", "embarrass", "judge"]
        }
        
        for context_type, keywords in contexts.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                fear_contexts.append(context_type)
        
        # Check for coping needs
        coping_needs = []
        if "help" in user_input.lower() or "support" in user_input.lower():
            coping_needs.append("support")
        if "manage" in user_input.lower() or "handle" in user_input.lower():
            coping_needs.append("management")
        if "overcome" in user_input.lower() or "face" in user_input.lower():
            coping_needs.append("confrontation")
        if "comfort" in user_input.lower() or "reassurance" in user_input.lower():
            coping_needs.append("comfort")
        
        # Add fear context to the input
        context_elements = []
        if detected_fears:
            context_elements.append(f"fear_types: {', '.join(detected_fears)}")
        if fear_intensity != "moderate":
            context_elements.append(f"intensity: {fear_intensity}")
        if fear_contexts:
            context_elements.append(f"contexts: {', '.join(fear_contexts)}")
        if coping_needs:
            context_elements.append(f"coping_needs: {', '.join(coping_needs)}")
        
        if context_elements:
            context_prefix = f"[Fear context: {'; '.join(context_elements)}] "
            return context_prefix + user_input
        
        return user_input
    
    def postprocess_response(self, response: str, context: Dict[str, Any]) -> str:
        """
        Postprocess response to enhance comfort and anxiety management.
        
        Args:
            response: Raw response from AI model
            context: Additional context
            
        Returns:
            Enhanced response with comfort and coping tips
        """
        # Add comfort and coping tips if relevant
        original_input = context.get("original_input", "")
        
        # Check if user is asking for help with fears
        help_patterns = [
            r"how to (deal with|handle|manage|overcome).*(fear|anxiety|worry)",
            r"help me (deal with|handle|manage|overcome)",
            r"(reduce|calm|soothe).*(anxiety|fear|stress)"
        ]
        
        if any(re.search(pattern, original_input.lower()) for pattern in help_patterns):
            # Add a practical coping tip
            tip = self._get_coping_tip(original_input)
            if tip:
                response = f"{response}\n\n🛡️ **Comfort & Coping Tip:** {tip}"
        
        return response
    
    def _get_coping_tip(self, user_input: str) -> str:
        """
        Generate a relevant coping tip based on user input.
        
        Args:
            user_input: The user's input
            
        Returns:
            Relevant coping tip
        """
        input_lower = user_input.lower()
        
        if "anxiety" in input_lower or "panic" in input_lower:
            return "Use box breathing: Inhale for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 4 times. This activates your parasympathetic nervous system and quickly reduces anxiety symptoms."
        
        if "fear" in input_lower or "afraid" in input_lower:
            return "Practice exposure gradually: Start with thinking about the fear, then looking at pictures, then approaching it from a distance. Each small step builds confidence and reduces fear intensity."
        
        if "worry" in input_lower or "overthinking" in input_lower:
            return "Schedule 'worry time': Set aside 10-15 minutes daily to write down all your worries. When worries arise outside this time, remind yourself to save them for your scheduled worry session."
        
        if "social" in input_lower or "people" in input_lower:
            return "Prepare conversation starters and practice deep breathing before social events. Remember that most people are focused on themselves, not judging you. Start with small, low-pressure interactions."
        
        if "failure" in input_lower or "mistake" in input_lower:
            return "Reframe failure as feedback: Ask 'What can I learn from this?' instead of 'What did I do wrong?' Every expert was once a beginner who made mistakes. Growth requires experimentation."
        
        if "stress" in input_lower or "overwhelmed" in input_lower:
            return "Use the 5-4-3-2-1 grounding technique: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. This brings you back to the present moment."
        
        if "confidence" in input_lower or "self-esteem" in input_lower:
            return "Keep a success journal: Write down 3 things you accomplished or handled well each day, no matter how small. This builds evidence of your competence and naturally boosts confidence."
        
        return "Remember that fear is a normal protective mechanism, not a character flaw. Your courage isn't the absence of fear, but taking action despite feeling afraid. Start small and celebrate each brave step."