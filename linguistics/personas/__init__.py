"""
Personas module for linguistics package.

Provides persona management capabilities for defining, customizing,
and switching between different AI personality profiles.
"""

from .persona_manager import (
    Persona,
    PersonaManager,
    get_persona_manager,
    reset_persona_manager,
)

__all__ = [
    "Persona",
    "PersonaManager",
    "get_persona_manager",
    "reset_persona_manager",
]
