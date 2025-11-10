"""
Integrator Expert persona.

Specializes in synthesis, pattern recognition, and holistic understanding.
"""

import logging
from typing import Dict, List, Optional, Any
import re

from .base import BasePersona
from .prompts import get_persona_metadata


logger = logging.getLogger(__name__)


class IntegratorExpert(BasePersona):
    """
    Integrator Expert specializing in synthesis, pattern recognition, and holistic understanding.
    
    Focuses on seeing the big picture and finding underlying connections.
    Helps users integrate information and develop comprehensive understanding.
    """
    
    def __init__(
        self,
        memory_service=None,
        rag_service=None
    ):
        """Initialize the Integrator Expert."""
        integrator_meta = get_persona_metadata("integrator")
        super().__init__(
            name=integrator_meta.name,
            description=integrator_meta.description,
            routing_keywords=integrator_meta.routing_keywords,
            memory_service=memory_service,
            rag_service=rag_service
        )
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for the integrator expert."""
        return get_persona_metadata("integrator").system_prompt
    
    def get_expertise_areas(self) -> List[str]:
        """Get the integrator expert's expertise areas."""
        return get_persona_metadata("integrator").expertise_areas
    
    def preprocess_input(self, user_input: str, context: Dict[str, Any]) -> str:
        """
        Preprocess input to identify synthesis needs and integration opportunities.
        
        Args:
            user_input: Raw user input
            context: Additional context
            
        Returns:
            Preprocessed input with integration analysis
        """
        # Identify integration context
        integration_indicators = []
        
        # Check for integration needs
        integration_needs = {
            "synthesis": ["combine", "integrate", "synthesize", "bring together", "merge"],
            "pattern_recognition": ["pattern", "connection", "relationship", "trend", "commonality"],
            "holistic_view": ["big picture", "overall", "holistic", "comprehensive", "whole"],
            "systems_thinking": ["system", "interconnected", "ecosystem", "network", "dependencies"],
            "perspective_integration": ["different views", "multiple angles", "various perspectives", "contradictory"],
            "meaning_making": ["meaning", "significance", "understand deeply", "make sense", "clarity"]
        }
        
        for need_type, keywords in integration_needs.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                integration_indicators.append(need_type)
        
        # Check for complexity level
        complexity_indicators = []
        if "complex" in user_input.lower() or "complicated" in user_input.lower():
            complexity_indicators.append("high")
        user_lower = user_input.lower()
        if "simple" in user_lower or "straightforward" in user_lower:
            complexity_indicators.append("low")
        if "multiple" in user_lower or "many" in user_lower or "various" in user_lower:
            complexity_indicators.append("multiple_elements")
        
        # Check for domain scope
        domain_scopes = []
        scopes = {
            "interdisciplinary": ["different fields", "multiple disciplines", "cross-functional", "interdisciplinary"],
            "personal": ["personal", "my life", "myself", "personal growth"],
            "professional": ["work", "career", "business", "professional", "organization"],
            "social": ["society", "culture", "people", "relationships", "community"],
            "academic": ["research", "study", "academic", "theoretical", "knowledge"]
        }
        
        for scope_type, keywords in scopes.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                domain_scopes.append(scope_type)
        
        # Check for integration challenges
        integration_challenges = []
        challenges = {
            "contradiction": ["contradict", "conflict", "opposite", "disagree", "inconsistent"],
            "fragmentation": ["fragmented", "disconnected", "separate", "isolated", "siloed"],
            "overwhelm": ["overwhelm", "too much", "information overload", "confusing"],
            "uncertainty": ["uncertain", "unclear", "ambiguous", "confusing", "don't know"]
        }
        
        for challenge_type, keywords in challenges.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                integration_challenges.append(challenge_type)
        
        # Add integration context to the input
        context_elements = []
        if integration_indicators:
            context_elements.append(f"integration_needs: {', '.join(integration_indicators)}")
        if complexity_indicators:
            context_elements.append(f"complexity: {', '.join(complexity_indicators)}")
        if domain_scopes:
            context_elements.append(f"domain_scope: {', '.join(domain_scopes)}")
        if integration_challenges:
            context_elements.append(f"challenges: {', '.join(integration_challenges)}")
        
        if context_elements:
            context_prefix = f"[Integration context: {'; '.join(context_elements)}] "
            return context_prefix + user_input
        
        return user_input
    
    def postprocess_response(self, response: str, context: Dict[str, Any]) -> str:
        """
        Postprocess response to enhance integration and synthesis.
        
        Args:
            response: Raw response from AI model
            context: Additional context
            
        Returns:
            Enhanced response with integration tips
        """
        # Add integration tips if relevant
        original_input = context.get("original_input", "")
        
        # Check if user is asking for integration help
        help_patterns = [
            r"how to (integrate|synthesize|combine|connect)",
            r"help me (understand|make sense|see the big picture)",
            r"(find|identify).*(patterns|connections)"
        ]
        
        if any(re.search(pattern, original_input.lower()) for pattern in help_patterns):
            # Add a practical integration tip
            tip = self._get_integration_tip(original_input)
            if tip:
                response = f"{response}\n\n🔗 **Integration Tip:** {tip}"
        
        return response
    
    def _get_integration_tip(self, user_input: str) -> str:
        """
        Generate a relevant integration tip based on user input.
        
        Args:
            user_input: The user's input
            
        Returns:
            Relevant integration tip
        """
        input_lower = user_input.lower()
        
        if "pattern" in input_lower or "connection" in input_lower:
            return "Look for recurring themes across different contexts. Ask 'What keeps showing up?' and 'Where have I seen this before?' Patterns often emerge when you step back and compare across time or situations."
        
        if "big picture" in input_lower or "holistic" in input_lower:
            return "Use the 'zoom out, zoom in' technique: First, step back to see the overall system and its purpose. Then, zoom in to examine how individual parts contribute to that purpose. Repeat until clarity emerges."
        
        if "integrate" in input_lower or "combine" in input_lower:
            return "Find the underlying principles that connect different elements. Ask 'What fundamental truth or principle applies to all of these?' Integration happens at the level of principles, not just surface-level similarities."
        
        if "contradict" in input_lower or "conflict" in input_lower:
            return "Look for the 'both/and' perspective: Instead of viewing contradictions as either/or, ask 'How can both be true in different contexts?' Often, apparent contradictions reveal deeper complexity."
        
        if "overwhelm" in input_lower or "too much" in input_lower:
            return "Create a simple framework with 3-5 key categories. Group information into these buckets even if it's imperfect. The act of categorizing creates mental structure and reduces overwhelm."
        
        if "meaning" in input_lower or "understand" in input_lower:
            return "Ask the 'So what?' question repeatedly: What does this information mean? So what? Why does it matter? Keep asking until you reach the core significance. Meaning emerges from understanding implications."
        
        if "different" in input_lower or "multiple" in input_lower:
            return "Use mind mapping or visual diagrams to show relationships physically. Our brains excel at spatial relationships - seeing connections visually often reveals insights that linear thinking misses."
        
        return "Practice integrative thinking by holding opposing ideas in tension simultaneously. Instead of choosing between A and B, ask 'How can we achieve both A and B?' This mindset opens up creative solutions that binary thinking misses."