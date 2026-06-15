"""Shared Gemini LLM factory with explicit credential resolution."""
import json
import os
import re

from langchain_google_genai import ChatGoogleGenerativeAI

from src.debug_log import agent_log


def get_google_api_key() -> str | None:
    """Resolve API key from GEMINI_API_KEY or GOOGLE_API_KEY."""
    for env_var in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
        value = os.environ.get(env_var, "").strip()
        if value:
            return value
    return None


def create_gemini_llm(model: str, temperature: float = 0.2):
    """Factory that returns an LLM instance.
    If the environment variable ``FORCE_OSS_MODEL`` is set to ``true`` (case‑insensitive),
    an Open‑source ``ChatOpenAI`` client is returned instead of the Google Gemini client.
    This enables the system to run completely offline without a Gemini API key.
    """
    # OSS override ----------------------------------------------------------
    force_oss = os.getenv("FORCE_OSS_MODEL", "").lower() in ("true", "1", "yes")
    if force_oss:
        # The OSS model name can be overridden via OSS_MODEL env var; default to the bundled 120B model.
        oss_model = os.getenv("OSS_MODEL", "gpt-oss-120b")
        try:
            from langchain_openai import ChatOpenAI
        except Exception:
            # Define a minimal stub that mimics the ChatOpenAI interface.
            class OSSChatLLM:
                def __init__(self, model: str, temperature: float = 0.2):
                    self.model = model
                    self.temperature = temperature

                def invoke(self, prompt: str):
                    # Simple echo response – useful for testing the pipeline.
                    return f"[OSS fallback] {prompt.split(',')[-1].strip()}"

                def __repr__(self):
                    return f"OSSChatLLM(model={self.model}, temperature={self.temperature})"

            return OSSChatLLM(model=model, temperature=temperature)
        # If the import succeeded, return the actual OpenAI client.
        oss_model = os.getenv("OSS_MODEL", "gpt-oss-120b")
        return ChatOpenAI(model=oss_model, temperature=temperature)

    # Default Gemini mode ---------------------------------------------------
    api_key = get_google_api_key()
    if not api_key:
        agent_log(
            "gemini_client.py:create_gemini_llm",
            "missing_api_key",
            {"model": model, "checked_env": ["GEMINI_API_KEY", "GOOGLE_API_KEY"]},
            "E",
        )
        raise ValueError(
            "Missing GEMINI_API_KEY or GOOGLE_API_KEY environment variable"
        )

    agent_log(
        "gemini_client.py:create_gemini_llm",
        "gemini_client_ready",
        {"model": model, "key_source": "env", "key_length": len(api_key)},
        "E",
    )
    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature,
        google_api_key=api_key,
    )


def extract_llm_text(response) -> str:
    if hasattr(response, "content"):
        return response.content
    return str(response)


def parse_llm_json(content: str) -> dict:
    """Parse JSON from raw LLM output, stripping markdown fences if present."""
    text = content.strip()
    fence_match = re.match(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()
    return json.loads(text)
