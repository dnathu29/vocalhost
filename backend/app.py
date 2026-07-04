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

# ============================================================================
# DATABASE HELPERS
# ============================================================================

DB_PATH = Path(__file__).parent / "db.json"

def load_db() -> Database:
    """Load database from db.json"""
    with open(DB_PATH, 'r') as f:
        data = json.load(f)
    return Database(**data)

def save_db(db: Database):
    """Save database to db.json"""
    with open(DB_PATH, 'w') as f:
        json.dump(db.model_dump(), f, indent=2)

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
    
    # Placeholder response
    plan = {
        "status": "planning",
        "underbooked_sessions": [],
        "consolidation_plan": None,
        "customers_to_contact": [],
        "message": "Agent planning logic not yet implemented"
    }
    
    return plan

# ============================================================================
# VOICE ENDPOINTS (Member 2 integrates here)
# ============================================================================

@app.post("/api/tts")
async def text_to_speech(text: str):
    """
    Convert text to speech using Gradium API.
    
    TODO: Member 2 implements TTS here
    """
    return {
        "status": "pending",
        "message": "TTS not yet implemented",
        "audio": None
    }

@app.post("/api/stt")
async def speech_to_text(audio_data: str):
    """
    Convert speech to text using Gradium API.
    
    TODO: Member 2 implements STT here
    """
    return {
        "status": "pending",
        "message": "STT not yet implemented",
        "text": None
    }

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
