"""
VocalHost Agent Package (Member 1 — The Brain).

Wraps Vultr Serverless Inference with a multi-step tool-calling agent that:
  1. Scans workshop sessions and detects underbooked ones.
  2. Proposes a consolidation plan to the Host.
  3. Negotiates with guests via voice (delegates TTS/STT to Member 2).
  4. Updates bookings in db.json when a guest agrees.

Public interface consumed by app.py:
  - run_planning_agent()   → Phase 1: analyse sessions, return consolidation plan
  - run_negotiation_agent() → Phase 2: converse with a guest (one turn)
"""

from .orchestrator import (
    run_planning_agent,
    run_negotiation_agent,
    get_conversation_history,
    reset_conversation,
)

__all__ = [
    "run_planning_agent",
    "run_negotiation_agent",
    "get_conversation_history",
    "reset_conversation",
]
