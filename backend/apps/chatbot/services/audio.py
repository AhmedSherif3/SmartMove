"""
Audio Service — OpenAI Whisper API Integration
===============================================
Transcribes raw audio bytes (from the WebSocket binary frame)
into text using the OpenAI Whisper API.
"""

import io
import logging
import os

logger = logging.getLogger(__name__)


async def transcribe_audio(audio_bytes: bytes) -> str | None:
    """
    Transcribe raw audio bytes to text via OpenAI Whisper.

    Args:
        audio_bytes: Raw audio data (WebM, WAV, or MP3).

    Returns:
        Transcribed text string, or None on failure.
    """
    import openai

    try:
        client = openai.AsyncOpenAI(
            api_key=os.getenv('AZURE_OPENAI_API_KEY', ''),
        )

        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = 'recording.webm'

        response = await client.audio.transcriptions.create(
            model='whisper-1',
            file=audio_file,
            language='en',
            response_format='text',
        )

        transcript = response.strip() if isinstance(response, str) else str(response).strip()

        if transcript:
            logger.info(
                f'Whisper transcription: {len(transcript)} chars',
                extra={'event': 'whisper_success', 'length': len(transcript)},
            )
        else:
            logger.warning('Whisper returned empty transcript')

        return transcript or None

    except Exception as exc:
        logger.exception(f'Whisper transcription failed: {exc}')
        raise
