
Participant Resources
Thank you for being part of RAISE Summit Hackathon 2026 as a hacker 👋 This document contains all the key details you’ll need to make the most of the event.
1. Join the Event Discord Server
Join the RAISE Summit Hackathon Discord server, where we will be posting announcements and you’ll be able to find teammates (in-person teams must have a total of 5 participants; remote teams have a maximum of 5).
 https://discord.com/invite/N26eKqmR42
2. Location
The RAISE Hackathon takes place across two venues in central Paris: Neon Noir and La Maison whilst also operating as a Remote event.
La Maison (2 Rue des Mathurins, 75009, Paris, France)
This venue is host to the Cursor track and will accept 90 participants. 
Neon Noir (14 rue Le Peletier 75009 Paris)
This venue is host to the Vultr, Google, Crusoe tracks and will accept 150 participants – 50 per track.
Teams must be either entirely in person or entirely remote. 
3. Wifi Information
La Maison
Username: CURSOR AT HACK
Password: Cursor@RAISE2026
Neon Noir
Username: [TBD]
Password: [TBD]
4. Hackathon Schedule
Saturday, July 4th
8:30AM: Doors Open, Breakfast Provided
10:00AM: Welcome Ceremony & Opening Talks
11:30AM: Hacking Starts
12:00PM: Track Sponsor Workshops
1:45PM: Lunch Served
14:30PM: Open Hacking / Mentor Sessions / Team Building
6:00PM: Dinner Served
10:00PM: Doors Close 
Sunday, July 5th
7:00AM: Doors Open, Breakfast Provided
12:00PM: Submissions Due
1:00PM: Lunch Served
12:15PM – 1:45PM First Round Judging
2:00PM – 3:00PM: Final Round Judging
3:15PM: Closing remarks, winners announced
5:00PM: Networking, Social Evening
8:00PM: Doors Closes
5. Hackathon Rules
To keep things fair and aligned with our goals, all teams must follow these rules:
Team Size: In-Person teams must have 5 members; Remote teams must have between 1 and 5 members.
Open Source: Repositories must be public.
Demo Requirements: Your demo must only highlight the specific features, code, and functionality that your team built during the hackathon. Judges must be able to clearly identify what was created during the event. Failure to clearly identify your original contributions will result in immediate disqualification.
New Work Only: You may not present an existing project as your own work. Failure to clearly distinguish your contributions will result in immediate disqualification.
Banned Projects: Projects will be disqualified if they: violate legal, ethical, or platform policies, use code, data, or assets you do not have the rights to. Furthermore, projects that are conceptually simplistic falling into one of the following categories will also be disqualified:
Mental health advisors
Basic RAG applications
Streamlit applications
Image analyzers
Job application screener
Nutrition coaches
Personality analyzers
Medical advice bots
Any project where a dashboard is the main feature
Sports analyzers or coaches
6. Problem Statement & Example Projects
Your project must build in at least one of the five required tracks.

Statement One: [Cursor]
Static design tokens and component libraries are brittle contracts: the moment a brand evolves, a new team ships a component, or an interaction grows past its fortieth branching state, the system quietly fractures. Build an AI-native design system that reasons about consistency across a product's visual and interactive surface — detecting drift, proposing reconciliation, and keeping designers and engineers aligned without a synchronization meeting. The question isn't whether the model can read your tokens or trace a state graph; it's whether the system has enough taste to know when something is wrong.
Example projects
A CLI that diffs your Figma token file against your deployed CSS and surfaces semantic mismatches with proposed fixes.
A visual regression tool that classifies diffs as intentional redesigns, accidental regressions, or platform-imposed constraints — explaining its reasoning and drafting a fix for anything flagged as a regression.
A chat interface where a designer describes an intent and the system shows which existing tokens and components satisfy it versus which ones conflict.


Statement Two: [Vultr]
Build a web-based Enterprise Agent for a real-world workflow that grounds its decisions in documents. The keyword is agent. A single retrieve-then-answer call is not enough. Show a multi-step workflow where the system plans, retrieves more than once when it needs to, calls tools, makes decisions, and produces an outcome a real enterprise team could actually use. Transform agentic operations and future of work in industries like Telecommunications, Healthcare, Finance, Hospitality.

Example Projects
Telecommunications: A network operations agent that ingests tower maintenance logs, outage reports, and vendor SLAs, then plans repair dispatch sequences, retrieves historical incident data to predict root causes, calls scheduling tools to book field crews, and generates a prioritized action report with cited documentation.
Healthcare: A healthcare clinical-trial matching agent that reads a patient's chart, checks each eligibility criterion against the record, and — where a required record or test result is missing or outdated — retrieves the most recent version if one exists or flags it as an outstanding item to request, calls a drug-interaction tool to check exclusions, and ranks eligible trials with per-criterion citations.
Finance: A finance covenant-monitoring agent that flags loan ratios drifting toward breach, retrieves the credit agreement and prior filings to check trend, calls a calculation tool to re-verify the ratio, cross-checks recent transactions for a cause, and outputs an escalation memo with a citation trail and a confidence score reflecting how many of the flagged transactions were matched to a clear cause versus left unexplained.
Hospitality: A revenue management agent that reads booking patterns, competitor pricing sheets, and event calendars, plans dynamic rate adjustments, retrieves historical occupancy data, calls pricing tools to update rates across channels, flags anomalies like sudden demand spikes, and delivers a revenue strategy brief with cited market intelligence.


Statement Three: [Crusoe]
Agents deployed in physical or operational environments — warehouses, field sites, live events — must understand not just what is happening but where, when, and relative to what else is changing around it. Build an agent on Crusoe Managed Inference that constructs a live situational model from streaming inputs and uses that model to drive proactive, context-sensitive actions a non-technical operator can trust, question, and override in the moment. 
Example Projects
A festival operations agent that ingests live wristband scan rates, stage capacity sensors, and scheduled set times to model crowd flow in real time — flagging crush risk corridors to a site manager as a single plain-language advisory with a one-tap override that feeds back into the next recommendation.
A warehouse agent that tracks forklift positions and inventory status, flags predicted aisle conflicts, and pages a floor supervisor with a one-tap override before rerouting.
A GPU cluster agent that fuses power draw, cooling telemetry, and scheduler queues to predict rack-level thermal throttling before it hits specific racks — surfacing a one-tap migration recommendation to a shift engineer that learns from each override.


Statement Four: [Google Deepmind : In-Person]
Most agents work from a snapshot — a screenshot, a transcript, a paused moment — and forget it the second the task ends. Build one that can't get away with that: seeing and clicking through Gemini's Computer Use, holding state across a long task through the Interactions API's Antigravity agent, or talking across languages mid-conversation through Live Translate. The primitive you pick should be load-bearing — the thing the task can't work without — not a feature added on top of a normal chatbot. Stronger still if the second primitive only fires because the first is already running.
Example Projects
A construction-site agent that fuses live Swahili status calls via Live Translate with an Antigravity-held punch-list to model which tasks are blocked in real time — surfacing a single plain-language update to the site office as each call comes in, with a one-tap "mark resolved" that drives Gemini Computer Use to update the dashboard directly and queues the agent's next clarifying question to be spoken back to the engineer over the same Live Translate channel.
A security-audit agent whose scan priorities are set through a config the audit lead maintains, fusing that with Gemini Computer Use's crawl of a staged vulnerable test environment to flag likely vulnerable endpoints as it finds them — surfacing each one to the audit lead as a single plain-language finding with a one-tap "confirm/dismiss" that updates the Antigravity vulnerability log and retunes what the next overnight run prioritizes, resuming via environment ID each morning.


Statement Five: [Google Deepmind : Remote]
The Edge / On-Device Track: Best mobile, web, or edge application running Gemma  locally for offline, privacy-first inference.

Video:
What's new in Gemma 
7. Previous CV Hackathon Winners
Cerebral Valley
The premier ecosystem for AI builders, researchers, and founders. Join thousands of ML engineers and entrepreneurs shaping the future of artificial intelligence.
https://cerebralvalley.ai/hackathons

8. Partner Provided Resources
Here you'll find access details, credits, and documentation for all our hackathon partners. If you run into any issues or have questions, reach out in the Discord or speak to a partner rep in person at the event.


Cursor
Credits per developer: $300
How to access: Fill out the Google Form.
Google Form Application:
 https://forms.gle/djEGNfieyDtFuBBy6

Google Deepmind In-Person
Access: Temporary accounts provided, including credits
Google Form Application:
 https://forms.gle/Yb2vDh2GdT4dBU7n8
Google Deepmind Remote
Gemma 4 model card | Google AI for Developers
Gemma cookbook: A collection of guides and examples
Gemma Skills
Try Gemma 4 in Google AI Studio or in Google AI Edge Gallery
Official blogs
Gemma 4: Byte for byte, the most capable open models
Accelerating Gemma 4: faster inference with multi-token prediction drafters
Gemma 4 12B: The Developer Guide
Gemma 4 QAT models: Optimizing model compression for mobile and laptop efficiency
DiffusionGemma: The Developer Guide
A Visual Guide series
A Visual Guide to Gemma 4
A Visual Guide to Gemma 4 12B
A Visual Guide to DiffusionGemma
Crusoe
Credits per developer: 0.0 (Inference service is free for all participants)
Tech stack/solution: Crusoe Managed Inference — call the endpoint directly, or use open-source integrations including LangChain, MLflow, and LiteLLM
How to access: Sign up on the platform using your email for authentication; and fill out the Google Form.
Google Form Application:
 https://forms.gle/t2mhUt6bfHfBW89q8
Vultr
Credits per developer: $200
Platform & product documentation:
Product docs: docs.vultr.com/products
Platform docs: docs.vultr.com/platform
Support docs: docs.vultr.com/support
API & inference:
API endpoints: https://vultr.com/api
Serverless Inference docs: https://docs.vultr.com/products/compute/serverless-inference
VultronRetriever models (Hugging Face): https://huggingface.co/collections/vultr/vultronretriever — use these via Vultr Serverless Inference for your enterprise agent's core reasoning
How to access: Follow the Vultr Account Setup Guide to activate your credits — How to Claim Hackathon Credits
Note: Vultr GPUs are not available for this event — use Vultr Serverless Inference for all LLM workloads


Gradium
Credits per developer: 145,000
Tech stack/solution: Use any software/tech stack alongside Gradium APIs. Supports TTS (Text-to-Speech), STT (Speech-to-Text), Voice Cloning, Speech-to-Speech, and Translation APIs
Documentation: docs.gradium.ai · MCP: docs.gradium.ai/mcp
Instructions:
Go to gradium.ai and click "Start Free"
Sign up via OAuth or email
Name your organization
Navigate to API Keys in the Platform section and create a key
Start using it — you get 45,000 free credits to start
If you run out, use coupon code RAISE-2026 for an additional 100,000 credits
Support contact: Pratim Bhosale — +33 7 67 06 46 44


Mozilla AI
Credits per developer: 5.0
Tech stack/solution: Otari
Platform: otari.ai
Repository: github.com/mozilla-ai/otari-ai
Sign-up link (claim $5 free credit): otari.ai/?utm_source=hackathon&utm_medium=qr&utm_campaign=raise-2026
Documentation: docs.otari.ai/en/
9. Judging & Submissions
Judging will be taking place on Sunday, July 5th. These judges are evaluating your technical demos in the following categories. Show us what you have built to solve our problem statements. Please do not show us a presentation. We'll be checking to ensure your project was built entirely during the event; no previous work is allowed. 
| Teams should submit here when they have completed hacking. In the submission form, you will have to submit a short one minute demo video. This should be a video of what you have built, uploaded to Youtube, Loom, or somewhere else.
RAISE Summit Hackathon
Applications are open — RAISE Summit Hackathon The world's largest AI Hackathon, powered by Cursor In partnership with Cerebral Valley, the RAISE Summit Hack... | Saturday, July 4, 2026 • Paris, France
https://cerebralvalley.ai/e/raise-summit-hackathon/hackathon/submit

Judging Criteria
Impact (25%) — What is the project’s long-term potential for success, growth and impact? Does it fit into one of the problem statements listed above? Is the project useful, and for who?
Demo (50%) — How well has the team implemented the idea? Does it work?
Creativity (15%) — Is the project’s concept innovative? Is their demo unique?
Pitch (10%) — How effectively does the team present their project?
In-Person Judging Process
| Judging proceeds in two rounds:
Hackers will be assigned groups of judges; ~3 minutes to pitch followed by 1-2 minutes of Q/A
The top three teams in ranking, per track, will get to demo on stage to a panel of judges; ~3 minutes to pitch followed by 2-3 minutes for Q/A.
Remote Judging Process
| Teams will submit their projects, and teams of judges will review projects based on demo video submissions, project descriptions, Github repository, and more.
10. Prizes
Track Prizes
Cursor
🥇 1st: $30K Cursor credits total + iPad Pro & Magic Keyboard (one per team member)
🥈 2nd: $20K Cursor credits total + mechanical keyboard (one per team member)
🥉 3rd: $15K Cursor credits total + 30-min 1:1 chat with Lee Robinson (ML, Cursor)
Vultr
🥇 1st: $5,000 cash prize + $1,000 Vultr credits
🥈 2nd: $3,000 cash prize + $1,000 Vultr credits
🥉 3rd: $1,000 cash prize + $1,000 Vultr credits
Google DeepMind In-Person
🥇 1st: $3,000 cash prize
🥈 2nd: $2,000 cash prize
🥉 3rd: $1,000 cash prize
Google DeepMind Remote
🥇 1st: $2,000 cash prize
🥈 2nd: $1,000 cash prize
🥉 3rd: $1,000 cash prize
Crusoe
🥇 1st: $1,000 Apple Gift Card (per team member) + $1,000 API credits
🥈 2nd: AirPods Max 2 (per team member) + $1,000 API credits
🥉 3rd: AirPods Pro 3 (per team member) + $1,000 API credits
Bonus Prizes from Partners
Microsoft for Startups — $200K Azure credit offer (2 years)
NVIDIA — RTX 5080
Cloudflare — $5,000 Cloudflare credit
Nebius — $25,000 Nebius credit
OpenRouter — $5,000 credit
SUSE — $2,500 SUSE training
❓If you have any questions, please email alex@cv.inc or message on Discord.




On this page
Participant Resources
1. Join the Event Discord Server
2. Location
3. Wifi Information
La Maison
Neon Noir
4. Hackathon Schedule
5. Hackathon Rules
6. Problem Statement & Example Projects
7. Previous CV Hackathon Winners
8. Partner Provided Resources
9. Judging & Submissions
10. Prizes
Track Prizes
Bonus Prizes from Partners
❓If you have any questions, please email alex@cv.inc or message on Discord.


