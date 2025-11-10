"""
Voice module for linguistics package.

Provides voice processing capabilities including speech-to-text,
text-to-speech, and audio stream management.
"""

from .tts_service import (
    TTSService,
    get_tts_service,
    reset_tts_service,
)

__all__ = [
    "TTSService",
    "get_tts_service",
    "reset_tts_service",
]
