"""
Gradium voice service — Member 2 (The Voice).

Two independent, self-contained modules the rest of the team consumes:

    text_to_audio(text)  -> bytes   (WAV audio spoken by the agent)   [TTS]
    audio_to_text(audio) -> str     (what the guest said)            [STT]

Design notes
------------
* TTS uses Gradium's simple HTTP POST endpoint with ``only_audio=true``,
  which returns raw WAV bytes — no streaming/websocket needed. Fast and
  reliable for a request/response backend.

* STT uses Gradium's realtime WebSocket ASR endpoint. Gradium expects raw
  PCM (24 kHz, 16-bit signed, mono). The browser's MediaRecorder produces a
  WebM/Opus (or similar) container, so we transcode the incoming bytes to PCM
  with ffmpeg before streaming them. This is the crucial glue that makes the
  frontend <-> Gradium handshake actually work.

Docs: https://docs.gradium.ai/guides/introduction
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
import shutil
import subprocess
from typing import Optional

import requests

try:  # websockets is only needed for STT; import lazily-friendly
    import websockets
except ImportError:  # pragma: no cover - surfaced with a clear message at call time
    websockets = None  # type: ignore


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

GRADIUM_TTS_URL = "https://api.gradium.ai/api/post/speech/tts"
GRADIUM_STT_URL = "wss://api.gradium.ai/api/speech/asr"

# Gradium's realtime ASR expects 24 kHz, 16-bit mono PCM.
STT_SAMPLE_RATE = 24_000
# 1920 samples * 2 bytes = 3840 bytes = one 80 ms chunk (Gradium's recommended size).
STT_CHUNK_BYTES = 3840

# Default voice from the Gradium docs; override with GRADIUM_VOICE_ID.
DEFAULT_VOICE_ID = "YTpq7expH9539ERJ"


def _api_key() -> str:
    key = os.getenv("GRADIUM_API_KEY", "").strip()
    if not key:
        raise GradiumError(
            "GRADIUM_API_KEY is not set. Add it to backend/.env "
            "(get a key at https://gradium.ai — Platform > API Keys)."
        )
    return key


def _voice_id() -> str:
    return os.getenv("GRADIUM_VOICE_ID", "").strip() or DEFAULT_VOICE_ID


class GradiumError(RuntimeError):
    """Raised when a Gradium request or audio transcode fails."""


# --------------------------------------------------------------------------- #
# TTS — text -> audio
# --------------------------------------------------------------------------- #

def text_to_audio(
    text: str,
    voice_id: Optional[str] = None,
    output_format: str = "wav",
    timeout: float = 30.0,
) -> bytes:
    """
    Convert ``text`` to speech via Gradium TTS and return raw audio bytes.

    Returns WAV bytes by default (``output_format="wav"``), ready to be
    wrapped in a data URI or written to a file.

    This is a blocking HTTP call; from async code use ``asyncio.to_thread``.
    """
    if not text or not text.strip():
        raise GradiumError("text_to_audio() received empty text.")

    payload = {
        "text": text,
        "voice_id": voice_id or _voice_id(),
        "output_format": output_format,
        "only_audio": True,  # -> raw audio bytes instead of a JSON stream
    }
    headers = {
        "x-api-key": _api_key(),
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(
            GRADIUM_TTS_URL, json=payload, headers=headers, timeout=timeout
        )
    except requests.RequestException as exc:
        raise GradiumError(f"Gradium TTS request failed: {exc}") from exc

    if resp.status_code != 200:
        raise GradiumError(
            f"Gradium TTS returned {resp.status_code}: {resp.text[:300]}"
        )

    # With only_audio=true the body is the raw audio file. Guard against the
    # API falling back to a JSON error body with a 200 (rare but cheap to check).
    content_type = resp.headers.get("Content-Type", "")
    if "application/json" in content_type:
        raise GradiumError(f"Gradium TTS returned JSON error: {resp.text[:300]}")

    if not resp.content:
        raise GradiumError("Gradium TTS returned an empty audio body.")

    return resp.content


def text_to_audio_base64(
    text: str,
    voice_id: Optional[str] = None,
    output_format: str = "wav",
) -> str:
    """Same as :func:`text_to_audio` but returns a base64 string for JSON APIs."""
    audio = text_to_audio(text, voice_id=voice_id, output_format=output_format)
    return base64.b64encode(audio).decode("ascii")


# --------------------------------------------------------------------------- #
# STT — audio -> text
# --------------------------------------------------------------------------- #

def _transcode_to_pcm(audio_bytes: bytes) -> bytes:
    """
    Transcode arbitrary browser audio (WebM/Opus, Ogg, WAV, MP4...) to raw
    16-bit signed mono PCM at 24 kHz using ffmpeg.

    Gradium's ASR needs raw PCM; the browser's MediaRecorder emits a container
    format, so this step is required for STT to work end-to-end.
    """
    if not audio_bytes:
        raise GradiumError("audio_to_text() received empty audio.")

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise GradiumError(
            "ffmpeg not found on PATH. Install it (macOS: `brew install ffmpeg`, "
            "Debian/Ubuntu: `apt-get install ffmpeg`) — it converts the browser's "
            "recording into the PCM format Gradium's ASR expects."
        )

    cmd = [
        ffmpeg,
        "-hide_banner",
        "-loglevel", "error",
        "-i", "pipe:0",          # read the uploaded audio from stdin
        "-f", "s16le",           # raw 16-bit little-endian PCM
        "-acodec", "pcm_s16le",
        "-ac", "1",              # mono
        "-ar", str(STT_SAMPLE_RATE),  # 24 kHz
        "pipe:1",                # write PCM to stdout
    ]
    proc = subprocess.run(cmd, input=audio_bytes, capture_output=True)
    if proc.returncode != 0:
        raise GradiumError(
            f"ffmpeg failed to decode the recording: "
            f"{proc.stderr.decode('utf-8', 'ignore')[:300]}"
        )
    if not proc.stdout:
        raise GradiumError("ffmpeg produced no audio (empty/corrupt recording).")

    return proc.stdout


async def _stream_pcm_to_gradium(pcm: bytes, timeout: float) -> str:
    """Open the ASR websocket, stream PCM chunks, and collect the transcript."""
    if websockets is None:
        raise GradiumError(
            "The `websockets` package is required for STT. "
            "Run `pip install websockets` (it's in requirements.txt)."
        )

    headers = {"x-api-key": _api_key()}
    connect_ctx = websockets.connect(GRADIUM_STT_URL, extra_headers=headers)

    segments: list[str] = []

    async with connect_ctx as ws:
        # 1) Setup
        await ws.send(json.dumps({
            "type": "setup",
            "model_name": "default",
            "input_format": "pcm",
        }))
        ready = json.loads(await asyncio.wait_for(ws.recv(), timeout))
        if ready.get("type") == "error":
            raise GradiumError(f"Gradium STT setup error: {ready.get('message')}")

        # 2) Stream the audio in 80 ms chunks
        for off in range(0, len(pcm), STT_CHUNK_BYTES):
            chunk = pcm[off:off + STT_CHUNK_BYTES]
            await ws.send(json.dumps({
                "type": "audio",
                "audio": base64.b64encode(chunk).decode("ascii"),
            }))

        # 3) Signal end of input
        await ws.send(json.dumps({"type": "end_of_stream"}))

        # 4) Collect transcript segments until the server closes the stream
        while True:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout)
            except asyncio.TimeoutError:
                break
            except websockets.ConnectionClosed:
                break

            msg = json.loads(raw)
            mtype = msg.get("type")
            if mtype == "text":
                segments.append(msg.get("text", ""))
            elif mtype == "error":
                raise GradiumError(f"Gradium STT error: {msg.get('message')}")
            elif mtype == "end_of_stream":
                break

    return " ".join(s.strip() for s in segments if s.strip()).strip()


async def audio_to_text(audio_bytes: bytes, timeout: float = 30.0) -> str:
    """
    Transcribe recorded audio (any browser-produced format) to text via Gradium.

    ``audio_bytes`` is the raw bytes of the recording. Transcoding runs in a
    worker thread so it doesn't block the event loop.
    """
    pcm = await asyncio.to_thread(_transcode_to_pcm, audio_bytes)
    return await _stream_pcm_to_gradium(pcm, timeout)


def audio_base64_to_text_sync(audio_b64: str, timeout: float = 30.0) -> str:
    """Convenience sync wrapper: decode base64 audio and transcribe it."""
    audio_bytes = base64.b64decode(audio_b64)
    return asyncio.run(audio_to_text(audio_bytes, timeout=timeout))
