"""
FastAPI backend for VocalHost - AI Agent Workshop Booking Platform
Member 4 Bootstrap + Members 1, 2, 3 Integration Points
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from pathlib import Path

# Load environment variables from backend/.env (GRADIUM_API_KEY, etc.)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

# Voice service (Member 2 — The Voice / Gradium)
from voice import GradiumError, audio_to_text, text_to_audio_base64

# Initialize FastAPI
app = FastAPI(
    title="VocalHost API",
    description="AI Agent Workshop Booking Platform",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# DATA MODELS (Shared with Frontend)
# ============================================================================

class Session(BaseModel):
    session_id: str
    time: str
    current_pax: int
    min_pax: int
    status: str  # "warning", "confirmed", "full"

class Workshop(BaseModel):
    id: str
    name: str
    sessions: List[Session]

class Booking(BaseModel):
    booking_id: str
    guest_name: str
    session_id: str
    pax: int
    phone: str

class Database(BaseModel):
    workshops: List[Workshop]
    bookings: List[Booking]

# --- Voice request models (Member 2) ---

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None

class STTRequest(BaseModel):
    audio_data: str  # base64-encoded recording from the browser

class ApproveMoveRequest(BaseModel):
    from_session_id: str
    to_session_id: Optional[str] = None

class CallGuestRequest(BaseModel):
    booking_id: str
    guest_name: str

# ============================================================================
# DATABASE HELPERS
# ============================================================================

DB_PATH = Path(__file__).parent / "db.json"
ACTION_LOG_PATH = Path(__file__).parent / "action_log.json"
APPLIED_DB_PATH = Path(__file__).parent / "db.applied.json"
SNAPSHOT_DIR = Path(__file__).parent / "applied_snapshots"

def load_db() -> Database:
    """Load database from db.json"""
    with open(DB_PATH, 'r') as f:
        data = json.load(f)
    return Database(**data)

def save_db(db: Database):
    """Save database to db.json"""
    with open(DB_PATH, 'w') as f:
        json.dump(db.model_dump(), f, indent=2)

def load_action_log() -> list:
    """Load persistent action log for host decisions."""
    if not ACTION_LOG_PATH.exists():
        return []
    with open(ACTION_LOG_PATH, 'r') as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    return []

def save_action_log(items: list):
    """Save action log entries to disk."""
    with open(ACTION_LOG_PATH, 'w') as f:
        json.dump(items, f, indent=2)

def save_applied_db(db: Database):
    """Save a timestamped snapshot of the modified database to `applied_snapshots/` and update `db.applied.json` as latest."""
    try:
        SNAPSHOT_DIR.mkdir(exist_ok=True)
        # timestamp filename
        from datetime import datetime
        ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
        snap_path = SNAPSHOT_DIR / f"db.applied.{ts}.json"
        with open(snap_path, 'w') as f:
            json.dump(db.model_dump(), f, indent=2)

        # also write latest applied copy
        with open(APPLIED_DB_PATH, 'w') as f:
            json.dump(db.model_dump(), f, indent=2)
        return str(snap_path)
    except Exception:
        # fallback: write latest only
        with open(APPLIED_DB_PATH, 'w') as f:
            json.dump(db.model_dump(), f, indent=2)
        return str(APPLIED_DB_PATH)

def list_applied_snapshots():
    """Return list of snapshot filenames sorted by name (time)."""
    if not SNAPSHOT_DIR.exists():
        return []
    snaps = sorted([p.name for p in SNAPSHOT_DIR.iterdir() if p.is_file() and p.name.startswith('db.applied.')])
    return snaps

def restore_snapshot(name: str) -> bool:
    """Restore a named snapshot into `db.applied.json` (returns True on success)."""
    target = SNAPSHOT_DIR / name
    if not target.exists():
        return False
    with open(target, 'r') as f:
        data = json.load(f)
    with open(APPLIED_DB_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    return True

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "VocalHost API is running"}

# ============================================================================
# DATA ENDPOINTS
# ============================================================================

@app.get("/api/sessions")
async def get_sessions():
    """Get all workshop sessions"""
    db = load_db()
    sessions = []
    for workshop in db.workshops:
        sessions.append({
            "workshop_id": workshop.id,
            "workshop_name": workshop.name,
            "sessions": workshop.sessions
        })
    return sessions

@app.get("/api/bookings")
async def get_bookings():
    """Get all bookings"""
    db = load_db()
    return db.bookings

@app.put("/api/bookings/{booking_id}")
async def update_booking(booking_id: str, new_session_id: str):
    """Update booking to new session"""
    db = load_db()
    
    booking = next((b for b in db.bookings if b.booking_id == booking_id), None)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking.session_id = new_session_id
    save_db(db)
    
    return {"status": "success", "booking_id": booking_id, "new_session_id": new_session_id}

# ============================================================================
# AGENT ENDPOINTS (Member 1 integrates here)
# ============================================================================

@app.post("/api/run-agent")
async def run_agent():
    """
    Trigger the AI Agent to analyze sessions and plan consolidation.
    
    Returns:
    - Identified underbooked sessions
    - Recommended consolidation plan
    - Customers to contact
    
    TODO: Member 1 implements agent logic here
    """
    db = load_db()

    underbooked_sessions = []
    consolidation_plan = []
    customers_to_contact = []

    # Simple planning heuristic:
    # 1) Find sessions below min_pax.
    # 2) Suggest moving those bookings to the fullest session in the same workshop.
    for workshop in db.workshops:
        for session in workshop.sessions:
            if session.current_pax >= session.min_pax:
                continue

            underbooked_sessions.append({
                "workshop_id": workshop.id,
                "workshop_name": workshop.name,
                "session_id": session.session_id,
                "time": session.time,
                "current_pax": session.current_pax,
                "min_pax": session.min_pax,
                "pax_gap": session.min_pax - session.current_pax,
            })

            candidate_sessions = [
                s for s in workshop.sessions if s.session_id != session.session_id
            ]

            target_session = None
            if candidate_sessions:
                target_session = max(candidate_sessions, key=lambda s: s.current_pax)

            impacted_bookings = [
                b for b in db.bookings if b.session_id == session.session_id
            ]

            plan_item = {
                "workshop_id": workshop.id,
                "workshop_name": workshop.name,
                "from_session_id": session.session_id,
                "from_time": session.time,
                "impacted_bookings_count": len(impacted_bookings),
            }

            if target_session is not None:
                plan_item.update({
                    "to_session_id": target_session.session_id,
                    "to_time": target_session.time,
                    "action": "propose_reschedule",
                })
            else:
                plan_item.update({
                    "to_session_id": None,
                    "to_time": None,
                    "action": "manual_review_required",
                })

            consolidation_plan.append(plan_item)

            for booking in impacted_bookings:
                customers_to_contact.append({
                    "booking_id": booking.booking_id,
                    "guest_name": booking.guest_name,
                    "phone": booking.phone,
                    "current_session_id": session.session_id,
                    "proposed_session_id": target_session.session_id if target_session else None,
                })

    if not underbooked_sessions:
        return {
            "status": "success",
            "underbooked_sessions": [],
            "consolidation_plan": [],
            "customers_to_contact": [],
            "message": "No underbooked sessions found. No action required.",
        }

    return {
        "status": "success",
        "underbooked_sessions": underbooked_sessions,
        "consolidation_plan": consolidation_plan,
        "customers_to_contact": customers_to_contact,
        "message": f"Generated {len(consolidation_plan)} consolidation recommendation(s).",
    }

@app.get("/api/agent/actions")
async def get_agent_actions():
    """Return persisted host actions for demo traceability."""
    items = load_action_log()
    return {"status": "success", "items": items}

@app.post("/api/agent/actions/approve")
async def approve_reschedule(req: ApproveMoveRequest):
    """Persist host approval decision for a proposed move."""
    items = load_action_log()
    entry = {
        "type": "approve_reschedule",
        "from_session_id": req.from_session_id,
        "to_session_id": req.to_session_id,
    }
    items.append(entry)
    save_action_log(items)
    # Approval is audited only; applying moves is an explicit operation
    return {"status": "success", "entry": entry, "applied": False, "message": "Approval logged. Use /api/agent/actions/execute to apply."}


@app.post("/api/agent/actions/execute")
async def execute_move(req: ApproveMoveRequest):
    """Execute an approved move and write the applied snapshot to db.applied.json."""
    if not req.to_session_id:
        return {"status": "error", "message": "`to_session_id` required to execute move."}

    try:
        db = load_db()

        bookings_to_move = [b for b in db.bookings if b.session_id == req.from_session_id]
        if not bookings_to_move:
            return {"status": "success", "applied": False, "moved_bookings": [], "message": "No bookings to move."}

        total_pax_moved = 0
        moved_ids = []
        for b in bookings_to_move:
            total_pax_moved += getattr(b, 'pax', 1) or 1
            b.session_id = req.to_session_id
            moved_ids.append(b.booking_id)

        for workshop in db.workshops:
            for s in workshop.sessions:
                if s.session_id == req.from_session_id:
                    s.current_pax = max(0, s.current_pax - total_pax_moved)
                if s.session_id == req.to_session_id:
                    s.current_pax = s.current_pax + total_pax_moved

        snap = save_applied_db(db)
    except Exception as e:
        return {"status": "error", "message": f"Failed to execute move: {e}"}
    return {"status": "success", "applied": True, "moved_bookings": moved_ids, "total_pax_moved": total_pax_moved, "snapshot": snap}


@app.get("/api/agent/snapshots")
async def get_snapshots():
    """List applied snapshot files (timestamped)."""
    snaps = list_applied_snapshots()
    return {"status": "success", "snapshots": snaps}


@app.post("/api/agent/actions/undo")
async def undo_last_snapshot():
    """Undo last applied snapshot by restoring the previous snapshot (if available)."""
    snaps = list_applied_snapshots()
    if not snaps:
        return {"status": "error", "message": "No snapshots to undo."}

    # If only one snapshot exists, remove latest applied file
    if len(snaps) == 1:
        target = SNAPSHOT_DIR / snaps[0]
        try:
            # remove latest applied file
            if APPLIED_DB_PATH.exists():
                APPLIED_DB_PATH.unlink()
            return {"status": "success", "undone": snaps[0], "message": "Removed latest applied snapshot."}
        except Exception as e:
            return {"status": "error", "message": f"Failed to undo: {e}"}

    # restore previous snapshot (second last)
    prev = snaps[-2]
    ok = restore_snapshot(prev)
    if not ok:
        return {"status": "error", "message": "Failed to restore previous snapshot."}
    return {"status": "success", "restored": prev}

@app.post("/api/agent/actions/call")
async def log_call_guest(req: CallGuestRequest):
    """Persist call action made by host operator."""
    items = load_action_log()
    entry = {
        "type": "call_guest",
        "booking_id": req.booking_id,
        "guest_name": req.guest_name,
    }
    items.append(entry)
    save_action_log(items)
    return {"status": "success", "entry": entry}

# ============================================================================
# VOICE ENDPOINTS (Member 2 integrates here)
# ============================================================================

@app.post("/api/tts")
async def text_to_speech(req: TTSRequest):
    """
    Convert text to speech using Gradium TTS.

    Request body: {"text": "...", "voice_id": "optional"}
    Response: {"status": "success", "audio": "<base64 WAV>", "format": "wav"}
    The frontend plays it as a data URI: data:audio/wav;base64,<audio>.
    """
    import asyncio

    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="`text` must not be empty")

    try:
        # text_to_audio_base64 is a blocking HTTP call — run it off the event loop.
        audio_b64 = await asyncio.to_thread(
            text_to_audio_base64, req.text, req.voice_id
        )
    except GradiumError as e:
        raise HTTPException(status_code=502, detail=f"Gradium TTS failed: {e}")

    return {"status": "success", "audio": audio_b64, "format": "wav"}

@app.post("/api/stt")
async def speech_to_text(req: STTRequest):
    """
    Convert recorded speech to text using Gradium STT.

    Request body: {"audio_data": "<base64 recording from MediaRecorder>"}
    Response: {"status": "success", "text": "<transcript>"}
    """
    import base64

    if not req.audio_data:
        raise HTTPException(status_code=400, detail="`audio_data` must not be empty")

    try:
        audio_bytes = base64.b64decode(req.audio_data)
    except Exception:
        raise HTTPException(status_code=400, detail="`audio_data` is not valid base64")

    try:
        transcript = await audio_to_text(audio_bytes)
    except GradiumError as e:
        raise HTTPException(status_code=502, detail=f"Gradium STT failed: {e}")

    return {"status": "success", "text": transcript}

# ============================================================================
# STARTUP/SHUTDOWN
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Verify database exists and is valid"""
    if not DB_PATH.exists():
        raise FileNotFoundError(f"db.json not found at {DB_PATH}")
    
    try:
        load_db()
        print(f"✅ Database loaded from {DB_PATH}")
    except Exception as e:
        raise ValueError(f"❌ Invalid db.json: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
