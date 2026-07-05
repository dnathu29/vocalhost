"""
Vultr Serverless Inference configuration.

Reads VULTR_API_KEY and VULTR_MODEL_ID from the environment (loaded via
python-dotenv in app.py) and exposes them as module-level constants.
"""

from __future__ import annotations

import os


def _require_env(name: str) -> str:
    """Return an env var or raise with a helpful message."""
    val = os.getenv(name, "").strip()
    if not val:
        raise RuntimeError(
            f"{name} is not set.  Add it to backend/.env  "
            f"(see .env.example for guidance)."
        )
    return val


# ---------------------------------------------------------------------------
# Vultr Serverless Inference
# ---------------------------------------------------------------------------

VULTR_API_KEY: str = ""  # resolved lazily so import never crashes
VULTR_BASE_URL = "https://api.vultrinference.com/v1"

# Default model — override via VULTR_MODEL_ID in .env
# Using the normalizer proxy for robust tool-call parsing
DEFAULT_MODEL = "deepseek-ai/DeepSeek-V3-0324"


def get_vultr_api_key() -> str:
    global VULTR_API_KEY
    if not VULTR_API_KEY:
        VULTR_API_KEY = _require_env("VULTR_API_KEY")
    return VULTR_API_KEY


def get_model_id() -> str:
    return os.getenv("VULTR_MODEL_ID", "").strip() or DEFAULT_MODEL
