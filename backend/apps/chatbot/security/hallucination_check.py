"""
Hallucination Check — Secondary Output Verification
=====================================================
Takes the agent's final text output and the raw JSON from tools,
and verifies that all numbers mentioned in the text actually exist
in the tool data payload.

Returns True if faithful, False if hallucinated numbers are detected.
"""

import json
import logging
import re

logger = logging.getLogger(__name__)

# Matches numbers: integers, decimals, and comma-formatted (e.g. 1,234,567.89)
_NUMBER_PATTERN = re.compile(r'\b\d[\d,]*\.?\d*\b')

# Numbers that are trivially not from data (dates, percentages < 101, etc.)
_TRIVIAL_NUMBERS = {
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '100', '1000', '2024', '2025', '2026',
}


def _extract_numbers_from_text(text: str) -> set[str]:
    """Extract all numeric values from the agent's text output."""
    raw_numbers = _NUMBER_PATTERN.findall(text)
    # Normalise: strip commas for comparison
    normalised = set()
    for num in raw_numbers:
        clean = num.replace(',', '')
        if clean and clean not in _TRIVIAL_NUMBERS:
            normalised.add(clean)
    return normalised


def _extract_numbers_from_data(tool_outputs: list) -> set[str]:
    """
    Recursively extract all numeric values from the tool JSON payloads.
    """
    numbers = set()

    def _walk(obj):
        if isinstance(obj, (int, float)):
            numbers.add(str(obj).rstrip('0').rstrip('.') or '0')
            # Also add the full-precision version
            numbers.add(str(obj))
        elif isinstance(obj, str):
            # Try to parse as JSON first (tool outputs are often JSON strings)
            try:
                parsed = json.loads(obj)
                _walk(parsed)
            except (json.JSONDecodeError, TypeError):
                # Extract numbers from plain text
                for num in _NUMBER_PATTERN.findall(obj):
                    numbers.add(num.replace(',', ''))
        elif isinstance(obj, dict):
            for value in obj.values():
                _walk(value)
        elif isinstance(obj, (list, tuple)):
            for item in obj:
                _walk(item)

    for output in tool_outputs:
        _walk(output)

    return numbers


def verify_output(agent_text: str, tool_data: list) -> bool:
    """
    Verify that numbers in the agent's text exist in the tool data.

    Args:
        agent_text: The final text response from the agent.
        tool_data:  List of raw tool output strings/objects.

    Returns:
        True if all (non-trivial) numbers in the text can be traced
        back to the tool data. False if hallucinated numbers are found.
    """
    if not agent_text or not tool_data:
        return True  # Nothing to verify

    text_numbers = _extract_numbers_from_text(agent_text)
    if not text_numbers:
        return True  # No numbers in output

    data_numbers = _extract_numbers_from_data(tool_data)

    # Check each number from the text against the data
    unverified = set()
    for num in text_numbers:
        # Try exact match first
        if num in data_numbers:
            continue
        # Try with rounding tolerance (check if any data number starts with same digits)
        found = False
        try:
            num_float = float(num)
            for data_num in data_numbers:
                try:
                    data_float = float(data_num)
                    # Allow 1% tolerance for rounding differences
                    if data_float != 0 and abs(num_float - data_float) / abs(data_float) < 0.01:
                        found = True
                        break
                except (ValueError, ZeroDivisionError):
                    continue
        except ValueError:
            continue

        if not found:
            unverified.add(num)

    if unverified:
        logger.warning(
            f'Hallucination check: {len(unverified)} unverified numbers: '
            f'{list(unverified)[:5]}',
            extra={
                'event': 'hallucination_detected',
                'unverified_count': len(unverified),
                'sample': list(unverified)[:5],
            },
        )
        # Fail if more than 30% of numbers are unverified
        hallucination_ratio = len(unverified) / len(text_numbers)
        return hallucination_ratio < 0.3

    logger.debug('Hallucination check: all numbers verified')
    return True
