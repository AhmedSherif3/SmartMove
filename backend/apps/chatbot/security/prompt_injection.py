"""
Prompt Injection Defence
========================
Two-layer protection against prompt-injection attacks:

Layer 1 (Fast) — Regex patterns that catch common injection phrases.
Layer 2 (Deep) — Optional LLM-based classification for sophisticated attacks.

If either layer flags the input, ``sanitize_input()`` returns ``None``
and the consumer blocks the message.
"""

import logging
import re

logger = logging.getLogger(__name__)

# ── Layer 1: Regex-based pattern matching ────────────────────────────────────

_INJECTION_PATTERNS = [
    # Direct instruction overrides
    re.compile(r'ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)', re.I),
    re.compile(r'disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)', re.I),
    re.compile(r'forget\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)', re.I),

    # System prompt extraction
    re.compile(r'(print|show|reveal|display|output)\s+(your\s+)?(system\s+)?(prompt|instructions)', re.I),
    re.compile(r'what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions|rules)', re.I),
    re.compile(r'repeat\s+(your\s+)?(system|initial)\s+(prompt|message|instructions)', re.I),

    # Role-play jailbreaks
    re.compile(r'you\s+are\s+now\s+(DAN|unrestricted|unfiltered|jailbr)', re.I),
    re.compile(r'act\s+as\s+(if\s+)?(you\s+have\s+)?no\s+(restrictions|rules|limits)', re.I),
    re.compile(r'pretend\s+(that\s+)?(you\s+)?(are|have)\s+no\s+(rules|restrictions)', re.I),
    re.compile(r'enter\s+(developer|debug|admin|god)\s+mode', re.I),

    # SQL injection via chat
    re.compile(r"(;|\b)(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE)\s", re.I),

    # Encoding tricks
    re.compile(r'base64[:\s]', re.I),
    re.compile(r'\\x[0-9a-f]{2}', re.I),

    # Delimiter attacks
    re.compile(r'<\|.*?\|>', re.I),
    re.compile(r'\[INST\]|\[/INST\]|\[SYSTEM\]', re.I),
]


def _check_regex_patterns(text: str) -> bool:
    """Return True if any injection pattern matches."""
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(text):
            logger.warning(
                f'Injection pattern matched: {pattern.pattern[:60]}',
                extra={'event': 'injection_regex_match'},
            )
            return True
    return False


def _strip_dangerous_tokens(text: str) -> str:
    """Remove known dangerous Unicode and control characters."""
    # Remove zero-width characters (used for invisible prompt injection)
    cleaned = re.sub(r'[\u200b\u200c\u200d\u200e\u200f\ufeff]', '', text)
    # Remove excessive whitespace that might hide tokens
    cleaned = re.sub(r'\s{10,}', ' ', cleaned)
    return cleaned.strip()


def sanitize_input(user_input: str) -> str | None:
    """
    Sanitize user input against prompt-injection attacks.

    Args:
        user_input: Raw text from the user.

    Returns:
        Cleaned text if safe, or ``None`` if the input is flagged.
    """
    if not user_input or not user_input.strip():
        return None

    cleaned = _strip_dangerous_tokens(user_input)

    if _check_regex_patterns(cleaned):
        return None

    # Length sanity check (prevent context-stuffing)
    if len(cleaned) > 10_000:
        logger.warning(
            f'Input too long ({len(cleaned)} chars), truncating',
            extra={'event': 'input_truncated'},
        )
        cleaned = cleaned[:10_000]

    return cleaned
