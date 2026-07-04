"""
VocalHost Voice Package (Member 2 — The Voice).

Wraps the Gradium speech API to provide two independent modules:
  - text_to_audio(): text  -> spoken audio (base64 WAV)  [Gradium TTS]
  - audio_to_text(): audio -> transcript (str)           [Gradium STT]

See gradium_service.py for the implementation.
"""

from .gradium_service import (
    GradiumError,
    audio_to_text,
    text_to_audio,
    text_to_audio_base64,
)

__all__ = [
    "GradiumError",
    "text_to_audio",
    "text_to_audio_base64",
    "audio_to_text",
]
