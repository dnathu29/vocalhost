# 🚀 VocalHost - AI Agent Workshop Booking Platform
**RAISE Summit Hackathon 2026 | Vultr Track**

## 📋 Project Overview
An intelligent booking management platform that uses an Enterprise Voice Agent to consolidate underbooked workshop sessions. The AI automatically detects empty slots, contacts customers via voice, negotiates rescheduling, and updates the database.

## 🏗️ Project Structure
```
vocalhost/
├── backend/              # Python FastAPI backend
│   ├── app.py           # Main FastAPI app
│   ├── agent/           # Agent logic (Member 1)
│   ├── voice/           # Voice service (Member 2)
│   ├── db.json          # Mock database
│   ├── requirements.txt
│   └── .env.example
├── frontend/            # Next.js frontend
│   ├── app/            # App router
│   ├── components/     # React components
│   └── public/         # Static assets
├── docs/               # Documentation
│   ├── IDEA.md         # Project concept
│   └── PROJECT_TIMELINE.md  # Execution plan
└── README.md          # This file
```

## 🎯 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git
- ffmpeg (for voice/STT) — `brew install ffmpeg` on macOS

### One-command launch

```bash
git clone https://github.com/dnathu29/vocalhost.git
cd vocalhost
./start.sh
```

The script will:
1. Create `backend/.env` from `.env.example` if it doesn't exist
2. Set up the Python virtual environment and install dependencies
3. Install frontend Node modules if needed
4. Start both servers — frontend at **http://localhost:3000**, backend at **http://localhost:8000**

> **First run:** open `backend/.env` and add your `GRADIUM_API_KEY` to enable voice features.

### Manual setup (alternative)

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add your API keys
python -m uvicorn app:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## 📡 API Endpoints
- `POST /api/run-agent` - Trigger agent planning
- `POST /api/tts` - Text-to-speech
- `POST /api/stt` - Speech-to-text
- `GET /api/sessions` - List all sessions
- `GET /api/bookings` - List all bookings
- `PUT /api/bookings/{id}` - Update booking

## 👥 Team Roles
- **Member 1:** Agent Logic (Vultr + Tool Calling)
- **Member 2:** Voice Service (Gradium TTS/STT)
- **Member 3:** Frontend UI (Next.js/React)
- **Member 4:** Integration & Deployment (you are here!)

## 📅 Timeline
See [PROJECT_TIMELINE.md](docs/PROJECT_TIMELINE.md) for detailed task breakdown and synchronization points.

## 🔑 Environment Variables
```bash
VULTR_API_KEY=your_vultr_key
GRADIUM_API_KEY=your_gradium_key
FASTAPI_ENV=development
```

## 🧪 Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 📦 Deployment
TBD - Add GitHub Pages or Vercel deployment links here during submission.

## 📝 License
MIT License - RAISE Summit Hackathon 2026

---
**Start Time:** July 4, 2026, 11:30 AM
**Deadline:** July 4, 2026, 6:00 PM
