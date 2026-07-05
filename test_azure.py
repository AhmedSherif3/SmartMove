import os
import io
import wave
from dotenv import load_dotenv
from openai import AzureOpenAI, RateLimitError

def create_dummy_wav():
    """Create a minimal, valid in-memory WAV file."""
    # 1 channel, 1 byte per sample, 8000 Hz
    wav_io = io.BytesIO()
    with wave.open(wav_io, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(1)
        wav_file.setframerate(8000)
        # Write some silence (zeroes)
        wav_file.writeframes(b'\x00' * 8000)
    
    wav_io.seek(0)
    wav_io.name = "test_audio.wav"
    return wav_io

def test_azure():
    load_dotenv()

    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")

    if not api_key or not endpoint:
        print("❌ AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT not found in environment variables.")
        return

    print("✅ Environment variables loaded.")

    try:
        client = AzureOpenAI(
            api_key=api_key,
            api_version="2024-06-01",
            azure_endpoint=endpoint
        )
        print("✅ AzureOpenAI client initialized.")
    except Exception as e:
        print(f"❌ Failed to initialize AzureOpenAI client: {e}")
        return

    # 1. Test smartmove-gpt-4o
    print("\n--- Testing smartmove-gpt-4o ---")
    try:
        response = client.chat.completions.create(
            model="smartmove-gpt-4o",
            messages=[{"role": "user", "content": "Hello, this is a test."}],
            max_tokens=10
        )
        print("✅ smartmove-gpt-4o connected successfully.")
    except Exception as e:
        print(f"❌ smartmove-gpt-4o failed: {e}")

    # 2. Test smartmove-embeddings
    print("\n--- Testing smartmove-embeddings ---")
    try:
        response = client.embeddings.create(
            model="smartmove-embeddings",
            input="Test string for embeddings"
        )
        print("✅ smartmove-embeddings connected successfully.")
    except Exception as e:
        print(f"❌ smartmove-embeddings failed: {e}")

    # 3. Test smartmove-whisper
    print("\n--- Testing smartmove-whisper ---")
    try:
        dummy_wav = create_dummy_wav()
        response = client.audio.transcriptions.create(
            model="smartmove-whisper",
            file=dummy_wav
        )
        print("✅ smartmove-whisper connected successfully.")
    except RateLimitError:
        print("✅ Whisper connected successfully, but hit the 3 RPM limit bucket.")
    except Exception as e:
        print(f"❌ smartmove-whisper failed: {e}")

if __name__ == "__main__":
    test_azure()
