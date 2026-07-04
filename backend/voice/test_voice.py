"""
Standalone smoke test for the Gradium voice service (Member 2).

Run it to verify TTS + STT work with your GRADIUM_API_KEY, independently of
the FastAPI app / frontend.

Usage (from backend/):
    export GRADIUM_API_KEY=gd_...        # or put it in backend/.env
    python -m voice.test_voice

What it does:
    1. TTS: turns a sentence into speech and writes voice_demo.wav
    2. STT: feeds that same WAV back to Gradium and prints the transcript
       (a round-trip check — the transcript should roughly match the input)
"""

import asyncio
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

from voice import GradiumError, audio_to_text, text_to_audio

SAMPLE_TEXT = (
    "Hi! This is the VocalHost assistant from the pottery studio. "
    "Your two p.m. session is a little empty. "
    "Would you like to switch to the four p.m. session and get a free drink voucher?"
)


async def main() -> None:
    if not os.getenv("GRADIUM_API_KEY", "").strip():
        raise SystemExit("Set GRADIUM_API_KEY (env var or backend/.env) first.")

    out_path = Path(__file__).parent / "voice_demo.wav"

    # 1) TTS ----------------------------------------------------------------
    print("[TTS] synthesizing speech...")
    try:
        wav_bytes = await asyncio.to_thread(text_to_audio, SAMPLE_TEXT)
    except GradiumError as e:
        raise SystemExit(f"TTS failed: {e}")
    out_path.write_bytes(wav_bytes)
    print(f"[TTS] ok — wrote {len(wav_bytes):,} bytes to {out_path}")

    # 2) STT (round-trip) ---------------------------------------------------
    print("[STT] transcribing the generated audio...")
    try:
        transcript = await audio_to_text(wav_bytes)
    except GradiumError as e:
        raise SystemExit(f"STT failed: {e}")
    print(f"[STT] transcript: {transcript!r}")

    print("\n✅ Voice round-trip complete.")


if __name__ == "__main__":
    asyncio.run(main())
