"""
Personas module for linguistics package.

Provides persona management capabilities for defining, customizing,
and switching between different AI personality profiles.
"""

from .base import BasePersona
from .coordinator import LinguisticsCoordinator
from .communication import CommunicationExpert
from .rapport import RapportExpert
from .emotions import EmotionsExpert
from .creativity import CreativityExpert
from .strategy import StrategyExpert
from .fears import FearsExpert
from .appearance import AppearanceExpert
from .practice import PracticeExpert
from .integrator import IntegratorExpert
from .prompts import (
    get_persona_metadata,
    get_all_personas_metadata,
    get_persona_routing_keywords,
    get_persona_by_keyword,
    PERSONAS_METADATA
)

__all__ = [
    "BasePersona",
    "LinguisticsCoordinator",
    "CommunicationExpert", 
    "RapportExpert",
    "EmotionsExpert",
    "CreativityExpert",
    "StrategyExpert",
    "FearsExpert",
    "AppearanceExpert",
    "PracticeExpert",
    "IntegratorExpert",
    "get_persona_metadata",
    "get_all_personas_metadata", 
    "get_persona_routing_keywords",
    "get_persona_by_keyword",
    "PERSONAS_METADATA"
]
