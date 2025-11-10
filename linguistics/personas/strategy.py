"""
Strategy Expert persona.

Specializes in planning, decision-making, and systematic thinking.
"""

import logging
from typing import Dict, List, Optional, Any
import re

from .base import BasePersona
from .prompts import get_persona_metadata


logger = logging.getLogger(__name__)


class StrategyExpert(BasePersona):
    """
    Strategy Expert specializing in planning, decision-making, and systematic thinking.
    
    Focuses on logical analysis, systematic planning, and strategic thinking.
    Helps users create clear paths forward and make well-reasoned decisions.
    """
    
    def __init__(
        self,
        memory_service=None,
        rag_service=None
    ):
        """Initialize the Strategy Expert."""
        strategy_meta = get_persona_metadata("strategy")
        super().__init__(
            name=strategy_meta.name,
            description=strategy_meta.description,
            routing_keywords=strategy_meta.routing_keywords,
            memory_service=memory_service,
            rag_service=rag_service
        )
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for the strategy expert."""
        return get_persona_metadata("strategy").system_prompt
    
    def get_expertise_areas(self) -> List[str]:
        """Get the strategy expert's expertise areas."""
        return get_persona_metadata("strategy").expertise_areas
    
    def preprocess_input(self, user_input: str, context: Dict[str, Any]) -> str:
        """
        Preprocess input to identify strategic needs and decision contexts.
        
        Args:
            user_input: Raw user input
            context: Additional context
            
        Returns:
            Preprocessed input with strategic analysis
        """
        # Identify strategic context
        strategic_indicators = []
        
        # Check for strategic process needs
        strategic_needs = {
            "planning": ["plan", "planning", "schedule", "timeline", "roadmap"],
            "decision_making": ["decide", "decision", "choose", "select", "option"],
            "analysis": ["analyze", "analysis", "evaluate", "assess", "review"],
            "goal_setting": ["goal", "objective", "target", "aim", "outcome"],
            "risk_management": ["risk", "mitigate", "contingency", "backup", "prepare"],
            "optimization": ["optimize", "improve", "enhance", "streamline", "efficiency"]
        }
        
        for need_type, keywords in strategic_needs.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                strategic_indicators.append(need_type)
        
        # Check for time horizon
        time_horizons = {
            "short_term": ["now", "today", "week", "immediate", "urgent"],
            "medium_term": ["month", "quarter", "6 months", "year"],
            "long_term": ["years", "future", "long-term", "strategic", "vision"]
        }
        
        time_horizon = "medium_term"  # default
        for horizon, keywords in time_horizons.items():
            if any(keyword in user_input.lower() for keyword in keywords):
                time_horizon = horizon
                break
        
        # Check for complexity
        complexity_indicators = []
        if "complex" in user_input.lower() or "complicated" in user_input.lower():
            complexity_indicators.append("high")
        if "simple" in user_input.lower() or "straightforward" in user_input.lower():
            complexity_indicators.append("low")
        if "multiple" in user_input.lower() or "many" in user_input.lower():
            complexity_indicators.append("multiple_factors")
        
        # Check for stakeholder context
        stakeholder_indicators = []
        if "team" in user_input.lower() or "group" in user_input.lower():
            stakeholder_indicators.append("team")
        if "business" in user_input.lower() or "company" in user_input.lower():
            stakeholder_indicators.append("business")
        if "personal" in user_input.lower() or "my" in user_input.lower():
            stakeholder_indicators.append("personal")
        
        # Add strategic context to the input
        context_elements = []
        if strategic_indicators:
            context_elements.append(f"strategic_needs: {', '.join(strategic_indicators)}")
        if time_horizon != "medium_term":
            context_elements.append(f"time_horizon: {time_horizon}")
        if complexity_indicators:
            context_elements.append(f"complexity: {', '.join(complexity_indicators)}")
        if stakeholder_indicators:
            context_elements.append(f"stakeholders: {', '.join(stakeholder_indicators)}")
        
        if context_elements:
            context_prefix = f"[Strategic context: {'; '.join(context_elements)}] "
            return context_prefix + user_input
        
        return user_input
    
    def postprocess_response(self, response: str, context: Dict[str, Any]) -> str:
        """
        Postprocess response to enhance strategic thinking and planning.
        
        Args:
            response: Raw response from AI model
            context: Additional context
            
        Returns:
            Enhanced response with strategic tips
        """
        # Add strategic tips if relevant
        original_input = context.get("original_input", "")
        
        # Check if user is asking for strategic help
        help_patterns = [
            r"how to (plan|strategize|decide)",
            r"help me (plan|strategize|decide)",
            r"(create|develop|make).*(plan|strategy)"
        ]
        
        if any(re.search(pattern, original_input.lower()) for pattern in help_patterns):
            # Add a practical strategic tip
            tip = self._get_strategy_tip(original_input)
            if tip:
                response = f"{response}\n\n🎯 **Strategy Tip:** {tip}"
        
        return response
    
    def _get_strategy_tip(self, user_input: str) -> str:
        """
        Generate a relevant strategy tip based on user input.
        
        Args:
            user_input: The user's input
            
        Returns:
            Relevant strategy tip
        """
        input_lower = user_input.lower()
        
        if "plan" in input_lower or "planning" in input_lower:
            return "Use the SMART framework: Make goals Specific, Measurable, Achievable, Relevant, and Time-bound. Break large plans into smaller milestones with clear success criteria."
        
        if "decide" in input_lower or "decision" in input_lower:
            return "Apply the 10/10/10 rule: How will you feel about this decision in 10 minutes, 10 months, and 10 years? This helps balance short-term emotions with long-term consequences."
        
        if "risk" in input_lower or "uncertainty" in input_lower:
            return "Use a decision matrix: List your options as rows and key criteria as columns. Weight each criterion by importance and score each option. This transforms complex decisions into clear analysis."
        
        if "goal" in input_lower or "objective" in input_lower:
            return "Work backwards from your desired outcome. Start with your end goal and identify the major milestones needed to get there. Then break each milestone into actionable steps."
        
        if "complex" in input_lower or "complicated" in input_lower:
            return "Use systems thinking: Identify the key components, their relationships, and feedback loops. Map out cause and effect before taking action. Often the best leverage points aren't the most obvious ones."
        
        if "prioritize" in input_lower or "focus" in input_lower:
            return "Apply the Eisenhower Matrix: Categorize tasks by urgency and importance. Focus on important-but-not-urgent tasks first, as these drive long-term success."
        
        return "Think in scenarios: Consider best-case, worst-case, and most likely outcomes. This helps you prepare for uncertainty while making more robust decisions."