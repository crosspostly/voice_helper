"""
Practice Expert persona.

Specializes in skill development, learning strategies, and improvement techniques.
"""

import logging
from typing import Dict, List, Optional, Any
import re

from .base import BasePersona
from .prompts import get_persona_metadata


logger = logging.getLogger(__name__)


class PracticeExpert(BasePersona):
    """
    Practice Expert specializing in skill development, learning strategies, and improvement techniques.
    
    Focuses on practical skill development and continuous improvement.
    Helps users learn effectively and master new skills through deliberate practice.
    """
    
    def __init__(
        self,
        memory_service=None,
        rag_service=None
    ):
        """Initialize the Practice Expert."""
        practice_meta = get_persona_metadata("practice")
        super().__init__(
            name=practice_meta.name,
            description=practice_meta.description,
            routing_keywords=practice_meta.routing_keywords,
            memory_service=memory_service,
            rag_service=rag_service
        )
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for the practice expert."""
        return get_persona_metadata("practice").system_prompt
    
    def get_expertise_areas(self) -> List[str]:
        """Get the practice expert's expertise areas."""
        return get_persona_metadata("practice").expertise_areas
    
    def preprocess_input(self, user_input: str, context: Dict[str, Any]) -> str:
        """
        Preprocess input to identify learning needs and skill development contexts.
        
        Args:
            user_input: Raw user input
            context: Additional context
            
        Returns:
            Preprocessed input with practice analysis
        """
        # Identify practice context
        practice_indicators = []
        
        # Check for skill types
        skill_types = {
            "physical": ["sport", "athletic", "fitness", "instrument", "dance", "movement"],
            "mental": ["thinking", "analysis", "problem", "strategy", "memory", "focus"],
            "creative": ["art", "music", "writing", "design", "creative", "artistic"],
            "social": ["communication", "leadership", "teamwork", "negotiation", "public_speaking"],
            "technical": ["programming", "coding", "technical", "engineering", "mathematics"],
            "language": ["language", "speaking", "writing", "reading", "comprehension"]
        }
        
        for skill_type, keywords in skill_types.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                practice_indicators.append(skill_type)
        
        # Check for learning stages
        learning_stages = []
        stages = {
            "beginner": ["beginner", "new", "start", "learn", "beginning", "novice"],
            "intermediate": ["intermediate", "improve", "better", "progress", "develop"],
            "advanced": ["advanced", "master", "expert", "excellent", "professional"],
            "stuck": ["stuck", "plateau", "blocked", "frustrated", "not improving"]
        }
        
        for stage_type, keywords in stages.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                learning_stages.append(stage_type)
        
        # Check for practice needs
        practice_needs = []
        needs = {
            "technique": ["technique", "form", "method", "approach", "how to"],
            "consistency": ["consistent", "regular", "routine", "schedule", "habit"],
            "motivation": ["motivation", "discipline", "stick with it", "keep going"],
            "feedback": ["feedback", "improve", "correct", "fix", "evaluate"],
            "efficiency": ["efficient", "effective", "better way", "optimize", "smart"]
        }
        
        for need_type, keywords in needs.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                practice_needs.append(need_type)
        
        # Check for time constraints
        time_constraints = []
        if "time" in user_input.lower() or "busy" in user_input.lower():
            time_constraints.append("limited_time")
        if "daily" in user_input.lower() or "every day" in user_input.lower():
            time_constraints.append("daily_practice")
        if "week" in user_input.lower() or "weekly" in user_input.lower():
            time_constraints.append("weekly_practice")
        
        # Add practice context to the input
        context_elements = []
        if practice_indicators:
            context_elements.append(f"skill_types: {', '.join(practice_indicators)}")
        if learning_stages:
            context_elements.append(f"learning_stage: {', '.join(learning_stages)}")
        if practice_needs:
            context_elements.append(f"practice_needs: {', '.join(practice_needs)}")
        if time_constraints:
            context_elements.append(f"time_constraints: {', '.join(time_constraints)}")
        
        if context_elements:
            context_prefix = f"[Practice context: {'; '.join(context_elements)}] "
            return context_prefix + user_input
        
        return user_input
    
    def postprocess_response(self, response: str, context: Dict[str, Any]) -> str:
        """
        Postprocess response to enhance skill development guidance.
        
        Args:
            response: Raw response from AI model
            context: Additional context
            
        Returns:
            Enhanced response with practice tips
        """
        # Add practice tips if relevant
        original_input = context.get("original_input", "")
        
        # Check if user is asking for practice help
        help_patterns = [
            r"how to (practice|learn|improve|master)",
            r"help me (practice|learn|improve|master)",
            r"(better|best way to|effective).*(practice|learn)"
        ]
        
        if any(re.search(pattern, original_input.lower()) for pattern in help_patterns):
            # Add a practical practice tip
            tip = self._get_practice_tip(original_input)
            if tip:
                response = f"{response}\n\n🎯 **Practice Tip:** {tip}"
        
        return response
    
    def _get_practice_tip(self, user_input: str) -> str:
        """
        Generate a relevant practice tip based on user input.
        
        Args:
            user_input: The user's input
            
        Returns:
            Relevant practice tip
        """
        input_lower = user_input.lower()
        
        if "beginner" in input_lower or "new" in input_lower or "start" in input_lower:
            return "Start with micro-practice sessions of just 5-10 minutes. Focus on one fundamental element at a time. Success in small chunks builds momentum and prevents overwhelm."
        
        if "stuck" in input_lower or "plateau" in input_lower:
            return "Break through plateaus by changing your practice approach: try a different time of day, practice environment, or learning method. Sometimes the breakthrough comes from variation, not more repetition."
        
        if "consistency" in input_lower or "habit" in input_lower:
            return "Habit-stack your practice: attach it to an existing daily routine (like after morning coffee). Start so small it's impossible to fail - even 2 minutes counts toward building the habit."
        
        if "motivation" in input_lower or "discipline" in input_lower:
            return "Focus on identity-based motivation: instead of 'I have to practice,' think 'I am the type of person who practices daily.' Track your progress visually to see how far you've come."
        
        if "efficient" in input_lower or "effective" in input_lower:
            return "Use deliberate practice: identify specific weaknesses, target them with focused exercises, get immediate feedback, and push slightly beyond your comfort zone. Quality beats quantity every time."
        
        if "feedback" in input_lower or "improve" in input_lower:
            return "Record yourself practicing and review it weekly. Compare your current performance to recordings from 4 weeks ago. Objective feedback accelerates improvement more than subjective feelings."
        
        if "time" in input_lower or "busy" in input_lower:
            return "Use the '1% rule': practice just 1% of your day (14 minutes). The key is consistency, not duration. Five focused minutes daily beats one hour weekly for skill retention."
        
        if "master" in input_lower or "expert" in input_lower:
            return "Master skills through the 3-stage approach: 1) Learn the fundamentals consciously, 2) Practice until they become automatic, 3) Refine and adapt them to new contexts. Mastery takes thousands of deliberate repetitions."
        
        return "Remember the law of diminishing returns: practice intensity matters more than duration. 20 minutes of focused, challenging practice is more effective than 2 hours of mindless repetition."