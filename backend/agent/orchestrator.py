"""
Agent orchestrator — the multi-step tool-calling loop.

Uses LiteLLM to talk to Vultr Serverless Inference (OpenAI-compatible)
and iterates until the model produces a final text response (no more
tool calls).

Two public entry points:
  run_planning_agent()    → Phase 1  (returns consolidation plan)
  run_negotiation_agent() → Phase 2  (one conversational turn)
"""

from __future__ import annotations

import json
import logging
from typing import Any

import litellm

from .config import VULTR_BASE_URL, get_model_id, get_vultr_api_key
from .prompts import (
    NEGOTIATOR_SYSTEM_PROMPT,
    PLANNER_SYSTEM_PROMPT,
    build_negotiator_context,
)
from .tools import (
    NEGOTIATOR_TOOLS,
    PLANNER_TOOLS,
    TOOL_DISPATCH,
)

logger = logging.getLogger("vocalhost.agent")

# Maximum tool-call iterations to prevent infinite loops
MAX_ITERATIONS = 10

# ---------------------------------------------------------------------------
# In-memory conversation store  (keyed by booking_id for demo simplicity)
# ---------------------------------------------------------------------------

_conversations: dict[str, list[dict]] = {}


def get_conversation_history(booking_id: str) -> list[dict]:
    """Return the current message history for a negotiation call."""
    return _conversations.get(booking_id, [])


def reset_conversation(booking_id: str) -> None:
    """Clear the conversation for a booking (e.g. when the call ends)."""
    _conversations.pop(booking_id, None)


# ---------------------------------------------------------------------------
# LiteLLM helper
# ---------------------------------------------------------------------------

def _call_llm(
    messages: list[dict],
    tools: list[dict] | None = None,
) -> Any:
    """
    Single LLM call via LiteLLM → Vultr Serverless Inference.

    Uses the ``openai/`` model prefix so LiteLLM routes through the
    OpenAI-compatible provider and we set ``api_base`` to Vultr.
    """
    model_id = get_model_id()
    api_key = get_vultr_api_key()

    kwargs: dict[str, Any] = {
        "model": f"openai/{model_id}",
        "messages": messages,
        "api_base": VULTR_BASE_URL,
        "api_key": api_key,
        "temperature": 0.4,
        "max_tokens": 2048,
    }
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"

    logger.info("LLM call → model=%s, msgs=%d, tools=%s",
                model_id, len(messages), bool(tools))

    response = litellm.completion(**kwargs)
    return response


def _execute_tool_calls(tool_calls: list) -> list[dict]:
    """
    Execute every tool the model requested and return tool-result messages.
    """
    results = []
    for tc in tool_calls:
        fn_name = tc.function.name
        try:
            args = json.loads(tc.function.arguments) if tc.function.arguments else {}
        except json.JSONDecodeError:
            args = {}

        logger.info("Tool call: %s(%s)", fn_name, args)

        handler = TOOL_DISPATCH.get(fn_name)
        if handler is None:
            output = {"error": f"Unknown tool: {fn_name}"}
        else:
            try:
                output = handler(**args)
            except Exception as exc:
                logger.exception("Tool %s raised", fn_name)
                output = {"error": str(exc)}

        results.append({
            "role": "tool",
            "tool_call_id": tc.id,
            "content": json.dumps(output, default=str),
        })
    return results


# =========================================================================
# Phase 1 — Planning Agent
# =========================================================================

async def run_planning_agent() -> dict:
    """
    Analyse today's sessions and return a consolidation plan.

    Runs the full tool-calling loop:
      system prompt → LLM → [tool calls → execute → feed back] … → final text
    """
    import asyncio

    messages: list[dict] = [
        {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
        {"role": "user", "content": (
            "Scan today's workshop schedule. "
            "Find underbooked sessions and propose a consolidation plan."
        )},
    ]

    for iteration in range(MAX_ITERATIONS):
        response = await asyncio.to_thread(_call_llm, messages, PLANNER_TOOLS)
        choice = response.choices[0]
        msg = choice.message

        # Append the assistant message (may contain tool_calls or text)
        assistant_msg: dict[str, Any] = {"role": "assistant"}
        if msg.content:
            assistant_msg["content"] = msg.content
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments or "",
                    },
                }
                for tc in msg.tool_calls
            ]
        messages.append(assistant_msg)

        # If the model wants to call tools, execute and loop
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            tool_results = _execute_tool_calls(msg.tool_calls)
            messages.extend(tool_results)
            continue

        # Otherwise the model returned its final text answer
        final_text = msg.content or ""

        # Try to extract structured JSON from the response
        plan = _extract_plan_json(final_text)
        return {
            "status": "completed",
            "raw_response": final_text,
            **plan,
        }

    # If we exhausted iterations
    return {
        "status": "error",
        "message": "Agent exceeded maximum iterations without producing a plan.",
    }


def _extract_plan_json(text: str) -> dict:
    """Best-effort extraction of the JSON block from the planner's response."""
    import re
    # Try to find a JSON code block
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    # Try to parse the whole text as JSON
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass
    # Return empty — the raw_response still has the info
    return {}


# =========================================================================
# Phase 2 — Negotiation Agent (conversational, one turn at a time)
# =========================================================================

async def run_negotiation_agent(
    booking_id: str,
    guest_message: str | None = None,
    *,
    guest_name: str = "",
    from_session_id: str = "",
    from_time: str = "",
    to_session_id: str = "",
    to_time: str = "",
    workshop_name: str = "",
    incentive: str = "a complimentary drink voucher",
) -> dict:
    """
    One turn of the negotiation conversation.

    On the first call (no existing conversation), the agent introduces
    itself and makes the offer.  On subsequent calls, ``guest_message``
    contains what the guest just said (from STT).

    Returns:
        {
            "agent_message": str,   # text for TTS
            "tool_results": [...],  # any tools that were called
            "call_ended": bool,     # True when agent decides call is over
        }
    """
    import asyncio

    # --- initialise or resume conversation ---
    if booking_id not in _conversations:
        context = build_negotiator_context(
            guest_name=guest_name,
            booking_id=booking_id,
            from_session_id=from_session_id,
            from_time=from_time,
            to_session_id=to_session_id,
            to_time=to_time,
            workshop_name=workshop_name,
            incentive=incentive,
        )
        system_prompt = NEGOTIATOR_SYSTEM_PROMPT.replace("{context}", context)
        _conversations[booking_id] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": (
                "[SYSTEM] The call has just connected. "
                "Greet the guest and make your offer."
            )},
        ]
    else:
        if guest_message:
            _conversations[booking_id].append({
                "role": "user",
                "content": guest_message,
            })

    messages = _conversations[booking_id]
    tool_results_log: list[dict] = []

    for iteration in range(MAX_ITERATIONS):
        response = await asyncio.to_thread(
            _call_llm, messages, NEGOTIATOR_TOOLS
        )
        choice = response.choices[0]
        msg = choice.message

        # Build assistant message for conversation history
        assistant_msg: dict[str, Any] = {"role": "assistant"}
        if msg.content:
            assistant_msg["content"] = msg.content
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments or "",
                    },
                }
                for tc in msg.tool_calls
            ]
        messages.append(assistant_msg)

        if hasattr(msg, "tool_calls") and msg.tool_calls:
            results = _execute_tool_calls(msg.tool_calls)
            messages.extend(results)
            for r in results:
                tool_results_log.append(json.loads(r["content"]))
            continue

        # Final text response
        agent_text = msg.content or ""
        call_ended = _detect_call_end(agent_text)

        return {
            "agent_message": agent_text,
            "tool_results": tool_results_log,
            "call_ended": call_ended,
        }

    return {
        "agent_message": "I'm sorry, I seem to be having technical difficulties. Let me transfer you to a human. Goodbye!",
        "tool_results": tool_results_log,
        "call_ended": True,
    }


def _detect_call_end(text: str) -> bool:
    """Heuristic: did the agent say goodbye?"""
    farewell_phrases = [
        "goodbye", "bye", "have a great day", "have a wonderful",
        "take care", "end the call", "hanging up",
    ]
    lower = text.lower()
    return any(phrase in lower for phrase in farewell_phrases)
