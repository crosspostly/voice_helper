"""
Creativity Expert persona.

Specializes in innovation, brainstorming, and creative problem-solving.
"""

import logging
from typing import Dict, List, Optional, Any
import re

from .base import BasePersona
from .prompts import get_persona_metadata


logger = logging.getLogger(__name__)


class CreativityExpert(BasePersona):
    """
    Creativity Expert specializing in innovation, brainstorming, and creative problem-solving.
    
    Focuses on expanding possibilities and thinking outside conventional boundaries.
    Helps users tap into their creative potential and find innovative approaches.
    """
    
    def __init__(
        self,
        memory_service=None,
        rag_service=None
    ):
        """Initialize the Creativity Expert."""
        creativity_meta = get_persona_metadata("creativity")
        super().__init__(
            name=creativity_meta.name,
            description=creativity_meta.description,
            routing_keywords=creativity_meta.routing_keywords,
            memory_service=memory_service,
            rag_service=rag_service
        )
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for the creativity expert."""
        return get_persona_metadata("creativity").system_prompt
    
    def get_expertise_areas(self) -> List[str]:
        """Get the creativity expert's expertise areas."""
        return get_persona_metadata("creativity").expertise_areas
    
    def preprocess_input(self, user_input: str, context: Dict[str, Any]) -> str:
        """
        Preprocess input to identify creative needs and opportunities.
        
        Args:
            user_input: Raw user input
            context: Additional context
            
        Returns:
            Preprocessed input with creativity analysis
        """
        # Identify creative context
        creative_indicators = []
        
        # Check for creative process needs
        creative_needs = {
            "brainstorming": ["brainstorm", "ideas", "generate", "come up with"],
            "problem_solving": ["solve", "problem", "challenge", "obstacle", "issue"],
            "innovation": ["innovate", "new", "different", "breakthrough", "invent"],
            "inspiration": ["inspire", "inspiration", "creative block", "stuck", "blocked"],
            "design": ["design", "create", "make", "build", "develop"],
            "improvement": ["improve", "enhance", "better", "optimize", "refine"]
        }
        
        for need_type, keywords in creative_needs.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                creative_indicators.append(need_type)
        
        # Check for creative constraints
        constraint_indicators = []
        if "limited" in user_input.lower() or "constraint" in user_input.lower():
            constraint_indicators.append("constraints")
        if "budget" in user_input.lower() or "money" in user_input.lower():
            constraint_indicators.append("budget")
        if "time" in user_input.lower() or "deadline" in user_input.lower():
            constraint_indicators.append("time")
        
        # Check for creative domain
        domain_indicators = []
        domains = {
            "art": ["art", "artistic", "painting", "drawing", "sculpture"],
            "writing": ["write", "writing", "story", "poem", "novel", "content"],
            "music": ["music", "song", "melody", "compose", "lyrics"],
            "business": ["business", "startup", "entrepreneur", "company"],
            "technology": ["tech", "software", "app", "digital", "technology"],
            "education": ["teach", "learn", "education", "training", "curriculum"]
        }
        
        for domain, keywords in domains.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                domain_indicators.append(domain)
        
        # Add creative context to the input
        context_elements = []
        if creative_indicators:
            context_elements.append(f"creative_needs: {', '.join(creative_indicators)}")
        if constraint_indicators:
            context_elements.append(f"constraints: {', '.join(constraint_indicators)}")
        if domain_indicators:
            context_elements.append(f"domain: {', '.join(domain_indicators)}")
        
        if context_elements:
            context_prefix = f"[Creative context: {'; '.join(context_elements)}] "
            return context_prefix + user_input
        
        return user_input
    
    def postprocess_response(self, response: str, context: Dict[str, Any]) -> str:
        """
        Postprocess response to enhance creative thinking and innovation.
        
        Args:
            response: Raw response from AI model
            context: Additional context
            
        Returns:
            Enhanced response with creativity tips
        """
        # Add creativity tips if relevant
        original_input = context.get("original_input", "")
        
        # Check if user is asking for creative help
        help_patterns = [
            r"how to (be|become|get).*(creative|innovative)",
            r"help me (think|create|innovate)",
            r"(boost|enhance|improve).*(creativity|innovation)"
        ]
        
        if any(re.search(pattern, original_input.lower()) for pattern in help_patterns):
            # Add a practical creativity tip
            tip = self._get_creativity_tip(original_input)
            if tip:
                response = f"{response}\n\n🎨 **Creativity Tip:** {tip}"
        
        return response
    
    def _get_creativity_tip(self, user_input: str) -> str:
        """
        Generate a relevant creativity tip based on user input.
        
        Args:
            user_input: The user's input
            
        Returns:
            Relevant creativity tip
        """
        input_lower = user_input.lower()
        
        if "block" in input_lower or "stuck" in input_lower:
            return "Break creative blocks by changing your environment, taking a walk, or working on a completely different task. Creativity often flows when you stop trying to force it."
        
        if "brainstorm" in input_lower or "ideas" in input_lower:
            return "Try reverse brainstorming: Instead of asking 'How can we solve this?', ask 'How could we make this worse?' Then reverse those ideas. Also try the SCAMPER technique: Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse."
        
        if "innovate" in input_lower or "new" in input_lower:
            return "Practice connecting unrelated concepts. Take two random objects or ideas and find 3 ways they're similar. Innovation often comes from making novel connections between existing ideas."
        
        if "problem" in input_lower or "solve" in input_lower:
            return "Reframe your problem by asking 'What would this look like if it were easy?' or 'How would a child solve this?' Changing your perspective often reveals hidden solutions."
        
        if "creative" in input_lower and "habit" in input_lower:
            return "Build a creativity habit with the 'two-minute rule': Spend just two minutes daily on a creative activity with no expectations. Small, consistent practices build creative momentum."
        
        if "design" in input_lower or "create" in input_lower:
            return "Use the 'Yes, and...' principle from improv. Accept initial ideas without judgment and build upon them. The best ideas often emerge from iteration, not instant perfection."
        
        return "Practice divergent thinking by challenging assumptions. Ask 'What if the opposite were true?' or 'What if we removed this constraint entirely?' Constraints can actually spark creativity by forcing novel approaches."