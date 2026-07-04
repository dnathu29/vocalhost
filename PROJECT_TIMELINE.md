# 🗓️ HACKATHON PROJECT TIMELINE & SYNCHRONIZATION PLAN
**Event:** RAISE Summit Hackathon 2026 | Vultr Track
**Duration:** 11:30 AM - 6:00 PM (6.5 hours)
**Team Size:** 4 AI-Coders

---

## 📊 MASTER TIMELINE

### Phase 0: Foundation (11:30 AM - 12:15 PM) | 45 mins
**All Members Sync - Setup & Data Contract Finalization**

| Time | Milestone | Owner | Task |
|------|-----------|-------|------|
| 11:30-11:45 | Repository & Environment Setup | Member 4 | Create GitHub repo, clone locally, init folder structure |
| 11:45-12:00 | Data Contract Finalized | Member 4 | Commit base db.json to repo; all members review & acknowledge |
| 12:00-12:15 | API Keys & Credentials | Members 1, 2 | Obtain Vultr API key and Gradium API key; store securely in .env |

**Checkpoint 1 (12:15 PM):** All repos ready, data schema locked, APIs accessible. ✅

---

### Phase 1: Parallel Development (12:15 PM - 3:45 PM) | 3.5 hours
**Each member works independently on isolated components**

#### 🧠 MEMBER 1: The Brain (Vultr + Agent Logic)
| Time | Task | Deliverable |
|------|------|-------------|
| 12:15-1:00 | Vultr Serverless Inference Setup | Working Vultr endpoint + test request/response |
| 1:00-2:00 | System Prompt & Agent Personality Design | Finalized prompt (saved as system_prompt.txt) |
| 2:00-3:15 | Tool Calling Workflow (LangChain/LiteLLM) | 3 mock functions: `get_sessions()`, `get_bookings()`, `update_booking()` |
| 3:15-3:45 | Agent Logic Loop | Complete agent orchestration script (agent.py) that can: read db.json, plan, decide, call tools |
| **3:45 PM** | **Ready to Integrate** | FastAPI endpoint `/run-agent` returns JSON plan |

**Key Functions to Implement:**
```python
# agent.py
- init_agent(vultr_api_key, system_prompt)
- get_sessions_from_db()
- get_bookings_from_db()
- plan_consolidation(sessions, bookings)
- update_booking_in_db(booking_id, new_session_id)
- run_agent_workflow()
```

**Dependencies:** db.json schema (from Member 4)

---

#### 🎙️ MEMBER 2: The Voice (Gradium API)
| Time | Task | Deliverable |
|------|------|-------------|
| 12:15-1:00 | Gradium API Integration Setup | Auth working, test endpoint responding |
| 1:00-2:15 | TTS Module: `text_to_audio()` | Function returns base64 audio from text input |
| 2:15-3:30 | STT Module: `audio_to_text()` | Function accepts base64 audio, returns transcribed text |
| 3:30-3:45 | Voice Error Handling & Fallbacks | Retry logic, timeout handling, text-only fallback mode |
| **3:45 PM** | **Ready to Integrate** | FastAPI endpoints `/tts` and `/stt` live |

**Key Functions to Implement:**
```python
# voice_service.py
- init_gradium(api_key)
- text_to_audio(text, language="en")
- audio_to_text(base64_audio)
- validate_audio_quality()
- fallback_to_text_mode()
```

**Dependencies:** Gradium API credentials (from Member 1)

---

#### 🎨 MEMBER 3: The UI (Frontend)
| Time | Task | Deliverable |
|------|------|-------------|
| 12:15-1:00 | Next.js Project Init + Folder Structure | Running dev server on localhost:3000 |
| 1:00-2:00 | Host Dashboard Screen (UI only) | Static mockup with session table, red warning button, "Run Agent" button |
| 2:00-3:00 | Guest Phone Screen (UI + Recording) | Phone frame mockup, microphone button (MediaRecorder), speaker button (audio playback) |
| 3:00-3:30 | API Client Integration | Connect to Backend endpoints (placeholder URLs) |
| 3:30-3:45 | Mock Event Handlers | Button clicks trigger console logs; prepare for integration |
| **3:45 PM** | **Ready to Integrate** | 2 screens rendering correctly, buttons responding to clicks |

**UI Components to Build:**
- `HostDashboard.tsx` - Shows sessions, alerts, run button
- `GuestPhoneCall.tsx` - Phone UI, record/playback controls
- `api-client.ts` - Fetch calls to backend endpoints
- `useAudioRecorder.ts` - Custom hook for MediaRecorder

**Dependencies:** API schema (from Member 4)

---

#### 🎬 MEMBER 4: Integrator & Data
| Time | Task | Deliverable |
|------|------|-------------|
| 12:15-1:00 | GitHub Repo Setup + README Template | Repo live, cloned by all members |
| 1:00-2:00 | Mock Data & db.json Finalization | Complete db.json with 3 workshops, 5 bookings (various statuses) |
| 2:00-3:00 | API Documentation & Contracts | Swagger/OpenAPI spec for all endpoints (shared Google Doc) |
| 3:00-3:30 | Backend Scaffold (FastAPI/Express) | Boilerplate routes, CORS enabled, ready for members to plug in |
| 3:30-3:45 | Integration Checklist Prep | Document all touchpoints between Member 1, 2, 3 |
| **3:45 PM** | **Ready to Integrate** | Backend routes stubbed, db.json in repo, API docs available |

**Deliverables:**
- db.json (finalized)
- API spec (endpoint contracts)
- Backend scaffold (main.py or index.js)
- Integration checklist

**Dependencies:** None (parallel track)

---

### Phase 2: Integration & Testing (3:45 PM - 5:15 PM) | 1.5 hours
**Synchronization starts; members work in pairs**

#### 🔗 Integration Points

| Time | Integration | Members | Task | Success Criteria |
|------|-------------|---------|------|------------------|
| 3:45-4:15 | Text-to-Text Flow | 1 + 4 | Connect Agent to Backend API | Agent `/run-agent` endpoint returns session plan |
| 4:00-4:30 | Frontend to Backend | 3 + 4 | Connect Host Dashboard buttons to `/run-agent` | Clicking "Run Agent" shows plan on dashboard |
| 4:15-4:45 | Voice Integration (TTS) | 2 + 3 | Wire TTS to Guest Phone screen | "Agent speaks" button plays audio |
| 4:30-5:00 | Voice Integration (STT) | 2 + 3 | Wire STT to microphone recording | Guest recording converts to text |
| 5:00-5:15 | End-to-End Test | All | Run full workflow: plan → guest call → negotiate → update | See booking updated in db.json |

**Checkpoint 2 (5:15 PM):** Core workflow functional end-to-end ✅

---

### Phase 3: Polish & Demo Prep (5:15 PM - 6:00 PM) | 45 mins
**Testing, edge cases, demo script**

| Time | Task | Owner | Deliverable |
|------|------|-------|-------------|
| 5:15-5:30 | Bug Fixes & Voice Latency Tuning | Members 2 + 3 | Latency < 2 seconds for TTS/STT |
| 5:30-5:45 | Demo Script & Dry Run | Member 4 | Record 1-minute demo video (canned scenario) |
| 5:45-6:00 | Final Checks & Submission | All | Repo clean, README complete, demo ready |

**Checkpoint 3 (6:00 PM):** Submission ready ✅

---

## 🔄 SYNCHRONIZATION POINTS (CRITICAL)

### Daily Standup Checkins
- **12:15 PM** - All members confirm Phase 0 complete
- **3:45 PM** - All members showcase isolated components (live demo or video)
- **5:15 PM** - All members test end-to-end workflow together
- **6:00 PM** - Final submission check

### Communication Protocol
- **Slack/Discord Channel:** `#dev` for real-time updates
- **Shared Google Doc:** API contract spec (Member 4 maintains)
- **GitHub Issues:** Bug reports and blockers

---

## ⚠️ RISK MITIGATION

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Vultr API authentication fails | Medium | Member 1 tests immediately at 12:15 PM; have fallback mock mode |
| Gradium TTS latency > 3 sec | Medium | Member 2 implements caching + local fallback text |
| Frontend-Backend CORS issues | High | Member 4 pre-configures CORS; all members test early |
| Audio not working on demo day | High | Pre-record agent audio; have text-only demo ready |
| Integration takes longer than 1.5 hrs | High | Prioritize Text-to-Text first; voice is optional polish |
| db.json schema mismatch | Medium | Member 4 locks schema at 12:00; all members use it as gospel |

---

## 📋 DEPENDENCY GRAPH

```
Phase 0 (All) ──────┐
                    ├── Member 1: Agent Logic ────┐
                    ├── Member 2: Voice Service ──┤
                    ├── Member 3: Frontend UI ────┼── Phase 2: Integration
                    └── Member 4: Backend Scaffold┘
                                 (locked data schema)
```

**Key Dependency:** Everything depends on Member 4 finalizing db.json schema by 12:00 PM.

---

## 🎯 GOALS BY TIME

| Time | Must-Have | Nice-to-Have |
|------|-----------|--------------|
| 3:45 PM | Each component works in isolation | All tests passing |
| 5:15 PM | Text-to-Text integration works; demo scenario runs | Voice working smoothly |
| 6:00 PM | Submission ready; 1-min demo video recorded | Polished UI; handling all edge cases |

---

## 📝 DAILY CHECKLIST

### By 12:15 PM
- [ ] Repo cloned locally (all members)
- [ ] db.json in repo & locked (Member 4)
- [ ] Vultr API key working (Member 1)
- [ ] Gradium API key working (Member 2)

### By 3:45 PM
- [ ] Agent logic loop complete & tested (Member 1)
- [ ] TTS + STT endpoints responding (Member 2)
- [ ] 2 UI screens rendering (Member 3)
- [ ] Backend scaffold with routes (Member 4)

### By 5:15 PM
- [ ] Text-to-text workflow end-to-end (All)
- [ ] Voice working (Members 2 + 3)
- [ ] db.json updates working (Member 1 + 4)

### By 6:00 PM
- [ ] Demo video recorded (Member 4)
- [ ] README complete (Member 4)
- [ ] GitHub pushed (All)
- [ ] Presentation slides ready (if required)

---

## 🚀 DEMO SCENARIO (Canned Workflow)

**Script for 1-minute video:**

1. **(0-5 sec)** Host Dashboard shows: "Weekend Pottery - 14:00 session (2/4 pax) - RED ALERT"
2. **(5-10 sec)** Host clicks "Run AI Agent"
3. **(10-20 sec)** Agent planning: "Detected underbooking. Proposing consolidation. Calling customers..."
4. **(20-35 sec)** Guest Phone screen: AI says "Would you switch to 16:00 + get 10% voucher?"
5. **(35-45 sec)** Guest records: "What time does it end?"
6. **(45-55 sec)** AI responds with timing; Guest confirms "Ok, reschedule me"
7. **(55-60 sec)** Backend updates db.json; Host sees "Booking updated ✓"

**Action Items for Member 4:**
- Write exact dialogue script
- Test with pre-recorded audio if voice fails
- Plan camera angles (screen capture software)

---

## ✅ SUCCESS DEFINITION

**Minimum Viable Demo (MVP):**
- [ ] Agent detects underbooked session
- [ ] Agent calls customer (simulated or real voice)
- [ ] Customer responds (text or voice)
- [ ] Booking updated in database
- [ ] Host sees confirmation

**Bonus Points:**
- [ ] Smooth voice conversation with < 2 sec latency
- [ ] Multiple booking scenarios handled
- [ ] Beautiful UI/UX
- [ ] Well-documented README
- [ ] Deployed to GitHub with live link

---

## 📞 ESCALATION

**If Member X gets stuck:**
1. Post in Slack with specific error
2. Another member jumps to help (5-10 min max)
3. If critical blocker, pivot to fallback (text-only mode, mock data, etc.)

**Example Blockers & Fallbacks:**
- Voice API fails? → Use pre-recorded audio files
- Database updates fail? → Log to console instead
- Frontend can't connect? → Test with curl/Postman first

---

**Created:** July 4, 2026, 11:30 AM
**Last Updated:** [During hackathon]
**Status:** Ready for Execution 🚀
