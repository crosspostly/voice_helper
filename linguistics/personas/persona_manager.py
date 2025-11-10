"""
Persona management for linguistics package.

Provides functionality to manage AI personality profiles, allowing
customization of behavior, tone, and response patterns.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..config import config

logger = logging.getLogger(__name__)


class Persona:
    """Represents an AI persona with specific characteristics and behavior."""
    
    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        traits: Dict[str, Any],
        response_style: Dict[str, Any],
        capabilities: List[str]
    ):
        """Initialize a persona."""
        self.id = id
        self.name = name
        self.description = description
        self.traits = traits
        self.response_style = response_style
        self.capabilities = capabilities
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Persona":
        """Create a persona from a dictionary."""
        return cls(
            id=data["id"],
            name=data["name"],
            description=data["description"],
            traits=data.get("traits", {}),
            response_style=data.get("response_style", {}),
            capabilities=data.get("capabilities", [])
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert persona to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "traits": self.traits,
            "response_style": self.response_style,
            "capabilities": self.capabilities
        }


class PersonaManager:
    """Manages AI personas and their configurations."""
    
    def __init__(self):
        """Initialize persona manager."""
        self.personas: Dict[str, Persona] = {}
        self.default_persona_id = "assistant"
        self._load_personas()
    
    def _load_personas(self) -> None:
        """Load personas from configuration files."""
        try:
            # Ensure personas directory exists
            config.ensure_directories()
            
            # Load default personas
            self._register_default_personas()
            
            # Load custom personas from files
            personas_dir = config.PERSONAS_DIR
            if personas_dir.exists():
                for persona_file in personas_dir.glob("*.json"):
                    try:
                        with open(persona_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        persona = Persona.from_dict(data)
                        self.personas[persona.id] = persona
                        logger.debug(f"Loaded persona '{persona.id}' from {persona_file}")
                    except Exception as e:
                        logger.error(f"Failed to load persona from {persona_file}: {e}")
            
            logger.info(f"Loaded {len(self.personas)} personas")
            
        except Exception as e:
            logger.error(f"Failed to load personas: {e}")
            self._register_default_personas()
    
    def _register_default_personas(self) -> None:
        """Register default built-in personas."""
        default_personas = [
            {
                "id": "assistant",
                "name": "Helpful Assistant",
                "description": "A friendly, helpful AI assistant that provides clear and accurate information.",
                "traits": {
                    "friendliness": 0.9,
                    "formality": 0.3,
                    "helpfulness": 0.9,
                    "patience": 0.8
                },
                "response_style": {
                    "tone": "friendly",
                    "verbosity": "medium",
                    "structure": "clear",
                    "empathy": 0.7
                },
                "capabilities": ["conversation", "information", "assistance"]
            },
            {
                "id": "tutor",
                "name": "Language Tutor",
                "description": "An educational AI tutor specializing in language learning and linguistics.",
                "traits": {
                    "friendliness": 0.8,
                    "formality": 0.5,
                    "helpfulness": 0.9,
                    "patience": 0.9,
                    "encouragement": 0.8
                },
                "response_style": {
                    "tone": "encouraging",
                    "verbosity": "detailed",
                    "structure": "educational",
                    "empathy": 0.8
                },
                "capabilities": ["tutoring", "language_learning", "explanation", "feedback"]
            },
            {
                "id": "expert",
                "name": "Linguistics Expert",
                "description": "A specialized AI expert in linguistics, grammar, and language theory.",
                "traits": {
                    "friendliness": 0.6,
                    "formality": 0.7,
                    "helpfulness": 0.8,
                    "patience": 0.6,
                    "precision": 0.9
                },
                "response_style": {
                    "tone": "professional",
                    "verbosity": "detailed",
                    "structure": "analytical",
                    "empathy": 0.4
                },
                "capabilities": ["expert_analysis", "linguistics", "grammar", "theory"]
            }
        ]
        
        for persona_data in default_personas:
            persona = Persona.from_dict(persona_data)
            self.personas[persona.id] = persona
    
    def get_persona(self, persona_id: str) -> Optional[Persona]:
        """Get a persona by ID."""
        return self.personas.get(persona_id)
    
    def get_default_persona(self) -> Persona:
        """Get the default persona."""
        return self.personas.get(self.default_persona_id, self.personas["assistant"])
    
    def list_personas(self) -> List[Persona]:
        """List all available personas."""
        return list(self.personas.values())
    
    def register_persona(self, persona: Persona) -> None:
        """Register a new persona."""
        self.personas[persona.id] = persona
        logger.info(f"Registered persona '{persona.id}'")
    
    def save_persona(self, persona: Persona) -> None:
        """Save a persona to file."""
        try:
            config.ensure_directories()
            persona_file = config.PERSONAS_DIR / f"{persona.id}.json"
            
            with open(persona_file, 'w', encoding='utf-8') as f:
                json.dump(persona.to_dict(), f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved persona '{persona.id}' to {persona_file}")
            
        except Exception as e:
            logger.error(f"Failed to save persona '{persona.id}': {e}")
            raise
    
    def get_persona_for_context(
        self,
        context: Dict[str, Any],
        preferred_persona: Optional[str] = None
    ) -> Persona:
        """Select the most appropriate persona for a given context."""
        if preferred_persona:
            persona = self.get_persona(preferred_persona)
            if persona:
                return persona
        
        # Context-based persona selection logic
        domain = context.get("domain", "general")
        user_intent = context.get("intent", "conversation")
        
        if domain == "education" or user_intent == "learning":
            return self.get_persona("tutor")
        elif domain == "linguistics" or user_intent == "analysis":
            return self.get_persona("expert")
        else:
            return self.get_default_persona()


# Global persona manager instance
_persona_manager: Optional[PersonaManager] = None


def get_persona_manager() -> PersonaManager:
    """Get the global persona manager instance."""
    global _persona_manager
    if _persona_manager is None:
        _persona_manager = PersonaManager()
    return _persona_manager


def reset_persona_manager() -> None:
    """Reset the global persona manager instance."""
    global _persona_manager
    _persona_manager = None