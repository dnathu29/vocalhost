"""
Tool definitions for the VocalHost Agent.

Each tool is:
  1. A JSON schema (OpenAI function-calling format) sent to the LLM.
  2. A Python implementation that reads/writes db.json.

The orchestrator maps tool-call names → Python functions at runtime.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# db.json path (same as app.py uses)
# ---------------------------------------------------------------------------

DB_PATH = Path(__file__).resolve().parent.parent / "db.json"


def _load_db() -> dict:
    with open(DB_PATH, "r") as f:
        return json.load(f)


def _save_db(data: dict) -> None:
    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=2)


# =========================================================================
# Tool implementations  (pure Python, called by orchestrator)
# =========================================================================

def get_all_sessions() -> list[dict]:
    """Return every workshop with its sessions."""
    db = _load_db()
    result = []
    for ws in db["workshops"]:
        result.append({
            "workshop_id": ws["id"],
            "workshop_name": ws["name"],
            "location": ws.get("location", ""),
            "instructor": ws.get("instructor", ""),
            "sessions": ws["sessions"],
        })
    return result


def get_all_bookings() -> list[dict]:
    """Return every booking."""
    return _load_db()["bookings"]


def get_session_details(session_id: str) -> dict | None:
    """Return details for a single session (used by the Negotiator)."""
    db = _load_db()
    for ws in db["workshops"]:
        for sess in ws["sessions"]:
            if sess["session_id"] == session_id:
                return {
                    "session_id": sess["session_id"],
                    "workshop_name": ws["name"],
                    "location": ws.get("location", ""),
                    "instructor": ws.get("instructor", ""),
                    "time": sess["time"],
                    "current_pax": sess["current_pax"],
                    "min_pax": sess["min_pax"],
                    "status": sess["status"],
                }
    return None


def update_booking_time(booking_id: str, new_session_id: str) -> dict:
    """
    Move a booking to a new session.

    Steps:
      1. Find the booking → update its session_id.
      2. Decrement current_pax on the old session.
      3. Increment current_pax on the new session.
      4. Recalculate status for both sessions.
      5. Persist to db.json.

    Returns a summary dict the LLM can relay to the guest.
    """
    db = _load_db()

    # --- find booking ---
    booking = None
    for b in db["bookings"]:
        if b["booking_id"] == booking_id:
            booking = b
            break
    if booking is None:
        return {"success": False, "error": f"Booking {booking_id} not found."}

    old_session_id = booking["session_id"]
    pax = booking["pax"]

    if old_session_id == new_session_id:
        return {"success": False, "error": "Booking is already in this session."}

    # --- helpers to find sessions ---
    def _find_session(sid: str):
        for ws in db["workshops"]:
            for sess in ws["sessions"]:
                if sess["session_id"] == sid:
                    return sess
        return None

    old_sess = _find_session(old_session_id)
    new_sess = _find_session(new_session_id)

    if old_sess is None:
        return {"success": False, "error": f"Old session {old_session_id} not found."}
    if new_sess is None:
        return {"success": False, "error": f"New session {new_session_id} not found."}

    # --- update pax counts ---
    old_sess["current_pax"] = max(0, old_sess["current_pax"] - pax)
    new_sess["current_pax"] = new_sess["current_pax"] + pax

    # --- recalculate statuses ---
    def _status(sess):
        max_pax = sess.get("max_pax", sess["min_pax"] * 2)
        if sess["current_pax"] >= max_pax:
            return "full"
        elif sess["current_pax"] >= sess["min_pax"]:
            return "confirmed"
        else:
            return "warning"

    old_sess["status"] = _status(old_sess)
    new_sess["status"] = _status(new_sess)

    # --- move booking ---
    booking["session_id"] = new_session_id

    _save_db(db)

    return {
        "success": True,
        "booking_id": booking_id,
        "guest_name": booking["guest_name"],
        "old_session_id": old_session_id,
        "new_session_id": new_session_id,
        "new_time": new_sess["time"],
        "message": (
            f"Booking {booking_id} for {booking['guest_name']} "
            f"moved from session {old_session_id} to {new_session_id} "
            f"(new time: {new_sess['time']})."
        ),
    }


# =========================================================================
# Tool schemas  (OpenAI function-calling format for LiteLLM)
# =========================================================================

PLANNER_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_all_sessions",
            "description": (
                "Retrieve all workshops and their sessions from the database. "
                "Returns workshop name, location, instructor, and each session's "
                "time, current_pax, min_pax, and status."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_all_bookings",
            "description": (
                "Retrieve all guest bookings from the database. "
                "Returns booking_id, guest_name, session_id, pax, and phone."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
]

NEGOTIATOR_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_session_details",
            "description": (
                "Get detailed information about a specific session by its ID, "
                "including time, current attendees, minimum required, and status."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session ID to look up (e.g. 's1', 's2').",
                    },
                },
                "required": ["session_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_booking_time",
            "description": (
                "Move a guest's booking from their current session to a new one. "
                "Automatically updates pax counts and statuses in the database."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_id": {
                        "type": "string",
                        "description": "The booking to move (e.g. 'b1').",
                    },
                    "new_session_id": {
                        "type": "string",
                        "description": "The target session to move the booking to (e.g. 's2').",
                    },
                },
                "required": ["booking_id", "new_session_id"],
            },
        },
    },
]

# ---------------------------------------------------------------------------
# Dispatch map  (tool-name str → callable)
# ---------------------------------------------------------------------------

TOOL_DISPATCH: dict[str, callable] = {
    "get_all_sessions": lambda **_kw: get_all_sessions(),
    "get_all_bookings": lambda **_kw: get_all_bookings(),
    "get_session_details": lambda **kw: get_session_details(**kw),
    "update_booking_time": lambda **kw: update_booking_time(**kw),
}
