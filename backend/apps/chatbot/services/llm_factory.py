import os
import logging
from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore[import-not-found]
from langchain_openai import ChatOpenAI  # type: ignore[import-not-found]
from django.conf import settings

logger = logging.getLogger(__name__)

FALLBACK_CHAIN = [
    {"model": "gemini-2.5-flash", "provider": "google", "tier": "basic"},
    {"model": "gemini-2.5-pro", "provider": "google", "tier": "premium"},
    {"model": "deepseek/deepseek-r1:free", "provider": "openrouter", "tier": "fallback"},
    {"model": "meta-llama/llama-4-scout:free", "provider": "openrouter", "tier": "fallback"},
]

# Gemini models to use as fallbacks — each model has its own separate daily quota
# so if the primary is exhausted, the others likely still have quota
GEMINI_FALLBACK_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-pro",
    "gemini-3.1-flash-lite",
    "gemini-3-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
]

# OpenRouter models as absolute last resort (don't support tool-calling)
OPENROUTER_FALLBACK_MODELS = [
    "deepseek/deepseek-r1:free",
    "meta-llama/llama-4-scout:free",
]


def _build_openrouter_llm(model_name: str):
    """Build a ChatOpenAI instance pointing at OpenRouter."""
    api_key = os.getenv("OPENROUTER_API_KEY", getattr(settings, 'OPENROUTER_API_KEY', ''))
    if not api_key:
        raise ValueError("OpenRouter API key is not configured.")
    return ChatOpenAI(
        model=model_name,
        temperature=0.0,
        openai_api_key=api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        max_retries=1,
    )


def _build_gemini_llm(model_name: str, api_key: str):
    """Build a ChatGoogleGenerativeAI instance."""
    return ChatGoogleGenerativeAI(
        model=model_name,
        temperature=0.0,
        google_api_key=api_key,
        max_retries=1,
    )


def _is_openrouter_model(model_name: str) -> bool:
    """Check if a model name refers to an OpenRouter model."""
    return (
        "openrouter" in model_name
        or ":free" in model_name
        or model_name.startswith("deepseek/")
        or model_name.startswith("meta-llama/")
        or model_name.startswith("anthropic/")
    )


def get_llm(model_name: str = "gemini-2.5-flash", fallback: bool = True):
    """
    Initializes and returns the LLM model via LangChain.
    
    When fallback=True (default) and a Google model is requested,
    other Gemini models are automatically attached as fallbacks via
    LangChain's .with_fallbacks(). Each Gemini model has its own
    separate daily quota, so this effectively multiplies your free tier
    capacity across models.
    """
    # ── OpenRouter models (requested directly) ────────────────────────────
    if _is_openrouter_model(model_name):
        llm = _build_openrouter_llm(model_name)
        logger.info(f"LLM successfully initialized (OpenRouter): {model_name}")
        return llm

    # ── Google Gemini models ──────────────────────────────────────────────
    api_key = os.getenv("GEMINI_API_KEY", getattr(settings, 'GEMINI_API_KEY', ''))
    if not api_key:
        api_key = os.getenv("GOOGLE_API_KEY", getattr(settings, 'GOOGLE_API_KEY', ''))
        if not api_key:
            logger.critical("GEMINI_API_KEY is missing from environment variables.")
            raise ValueError("Gemini API key is not configured.")

    # Redirect legacy model names
    if model_name.startswith("gpt-") or model_name.startswith("smartmove"):
        model_name = "gemini-2.5-flash"

    primary_llm = _build_gemini_llm(model_name, api_key)
    logger.info(f"LLM successfully initialized: {model_name}")

    # ── Attach Gemini fallbacks (each has separate quota) ─────────────────
    if fallback:
        try:
            fallback_llms = []
            
            # Add other Gemini models as fallbacks (skip the primary)
            for fb_model in GEMINI_FALLBACK_MODELS:
                if fb_model != model_name:
                    try:
                        fb_llm = _build_gemini_llm(fb_model, api_key)
                        fallback_llms.append(fb_llm)
                    except Exception:
                        pass
            
            # Add OpenRouter as absolute last resort
            for fb_model in OPENROUTER_FALLBACK_MODELS:
                try:
                    fb_llm = _build_openrouter_llm(fb_model)
                    fallback_llms.append(fb_llm)
                except ValueError:
                    pass

            if fallback_llms:
                logger.info(
                    f"Attached {len(fallback_llms)} fallback(s) to {model_name}: "
                    f"{[getattr(fb, 'model_name', getattr(fb, 'model', '?')) for fb in fallback_llms]}"
                )
                return primary_llm.with_fallbacks(fallback_llms)
        except Exception as e:
            logger.warning(f"Could not attach fallbacks: {e}")

    return primary_llm

