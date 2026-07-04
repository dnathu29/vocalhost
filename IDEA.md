Here is a complete comprehensive document. You can copy all of this content and send it directly to the group chat or paste it into Google Docs/Notion for all 4 members to read and get to work immediately.
🚀 PROJECT KICKOFF: AI-AGENT WORKSHOP BOOKING PLATFORM
Target: Vultr Track | RAISE Summit Hackathon 2026
1. CORE CONCEPT (THE CONCEPT)
A booking management platform for Hosts organizing small-scale Workshops/Activities. Solves the problem of "empty sessions" (operational cost losses) using an Enterprise Voice Agent.
Instead of Hosts manually reviewing schedules and calling individual customers to apologize/reschedule, the AI Agent will:
Automatically scan schedules (Planning & Context-awareness).
Propose session consolidation scenarios to the Host.
Directly call/message customers with natural voice negotiation, offering incentives to secure new time slots.
Why will this project win the Vultr Track?
Solves the correct Revenue Management problem (Hospitality/Event) suggested by Vultr.
Clearly demonstrates Multi-step Agent workflow: Read data → Plan → Call Tool → Voice communication → Update Database.
It's NOT a boring RAG/Chatbot app.
2. SYSTEM ARCHITECTURE (TECH STACK)
The Brain (Reasoning): Vultr Serverless Inference (Required). Uses the VultronRetriever model for the Agent to understand each Host's rescheduling policies.
The Voice (I/O): Gradium API. Uses Text-to-Speech (TTS) for the Agent to speak, and Speech-to-Text (STT) to hear customer responses.
Backend & API Framework: Python (FastAPI) or Node.js (Express). Uses LangChain/LiteLLM for Tool Calling management.
Frontend (Demo UI): Next.js / React (Absolutely NO Streamlit). Minimal interface split into 2 views (Host Dashboard & Guest Phone).
Database (Mock): Simple db.json file to store information for the Agent to read/write (no complex DB setup to waste time).
3. WORKFLOW (MULTI-STEP WORKFLOW)
Phase 1: Planning (Host View)
System reads db.json and detects: "Pottery Workshop" at 14:00 today has only 2 customers, while 16:00 session has 4 customers.
Vultr Agent sends alert to Host UI: "14:00 session is losing money. Proposing consolidation to 16:00. Do you want AI to call and negotiate a 10% voucher incentive to reschedule?"
Host clicks [Authorize AI].
Phase 2: Negotiation (Guest View)
Guest phone screen displays incoming call. Guest clicks answer.
Agent (Gradium TTS): "Hello, I'm your virtual assistant from the pottery studio. Your 14:00 session is running a bit light. Would you like to switch to the busier 16:00 session and receive a drink voucher?"
Customer replies via Microphone (Gradium STT): "What time does the 16:00 session end?"
Vultr LLM processes the question, retrieves timing info, and responds via voice.
Customer confirms: "Ok, reschedule me."
Phase 3: Update (Tool Calling)
Vultr Agent automatically calls the update_booking_time() API.
Overwrites new information into db.json.
Notifies Host of completion.
4. TASK DIVISION (FOR 4 AI-CODERS)
(Hackathon started at 11:30 AM, applying parallel coding strategy)
🧠 Team Member 1: The Brain (Vultr + Agent Logic)
Set up Vultr Serverless Inference.
Write System Prompt: Clearly define Agent personality, rescheduling task, handling customer rejections.
Code Tool Calling workflow (LangChain/LiteLLM): Write mock functions for Agent to fetch data from db.json and update it.
🎙️ Team Member 2: The Voice (Gradium API)
Get API Key from gradium.ai.
Code 2 independent modules:
text_to_audio(): Receives string from Team Member 1, returns audio file or base64.
audio_to_text(): Receives recording from Frontend, returns string for Team Member 1.
Handle voice stream logic to ensure minimal latency.
🎨 Team Member 3: The UI (Frontend Developer)
Initialize Next.js/React project.
Code 2 Demo screens:
Host Dashboard: Table of workshop sessions, red alert button (low attendance), "Run AI Agent" button.
Guest Phone Call: Microphone button to record customer voice, speaker button to play AI response.
Implement browser recording (MediaRecorder API).
🎬 Team Member 4: Integrator & Demo Director
Create base db.json file (Mock Data) defining data structure for entire team (customer ID, session ID, attendee count, status).
Run Backend & Frontend integration.
Prepare Github Repo and write README (Required).
Prepare detailed script for 1-minute demo video (Worth 50% of judge's points).
5. MOCK DATA CONTRACT (UNIFIED API FOR ENTIRE TEAM)
To avoid errors during integration, everyone must follow this JSON structure:
JSON
{
  "workshops": [
    {
      "id": "w1",
      "name": "Weekend Pottery Workshop",
      "sessions": [
        {
          "session_id": "s1",
          "time": "14:00",
          "current_pax": 2,
          "min_pax": 4,
          "status": "warning"
        },
        {
          "session_id": "s2",
          "time": "16:00",
          "current_pax": 4,
          "min_pax": 4,
          "status": "confirmed"
        }
      ]
    }
  ],
  "bookings": [
    {
      "booking_id": "b1",
      "guest_name": "Nguyen Van A",
      "session_id": "s1",
      "pax": 2,
      "phone": "+33 7 1234 5678"
    }
  ]
}


Goal by 6:00 PM today: Successfully integrate Text-to-Text between UI and Vultr Agent. Voice (Gradium) will be added right after dinner. Let's gear up and get started! 🚀

