import os
import sys
import io
import wave
from pathlib import Path
from dotenv import load_dotenv
from openai import AzureOpenAI, RateLimitError

def create_dummy_wav():
    """Create a minimal, valid in-memory WAV file."""
    wav_io = io.BytesIO()
    with wave.open(wav_io, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(1)
        wav_file.setframerate(8000)
        wav_file.writeframes(b'\x00' * 8000)
    
    wav_io.seek(0)
    wav_io.name = "test_audio.wav"
    return wav_io

def check_env_and_apis():
    print("\n" + "="*50)
    print("🚀 Phase 1: Strict .env Validation")
    print("="*50)

    # Check if .env exists
    env_path = Path(".env")
    if not env_path.is_file():
        print("❌ CRITICAL ERROR: .env file not found in the root directory.")
        sys.exit(1)
    
    print("✅ .env file found.")
    
    # Load .env
    load_dotenv()
    
    # Check for variables
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    
    missing_vars = []
    if not api_key or not api_key.strip():
        missing_vars.append("AZURE_OPENAI_API_KEY")
    if not endpoint or not endpoint.strip():
        missing_vars.append("AZURE_OPENAI_ENDPOINT")
        
    if missing_vars:
        print(f"❌ ERROR: The following required environment variables are missing or blank:")
        for var in missing_vars:
            print(f"   - {var}")
        sys.exit(1)
        
    print("✅ All required Azure environment variables are present.")

    print("\n" + "="*50)
    print("🌐 Phase 2: API Connection Testing")
    print("="*50)

    try:
        client = AzureOpenAI(
            api_key=str(api_key),
            api_version="2024-06-01",
            azure_endpoint=str(endpoint)
        )
        print("✅ AzureOpenAI client initialized.")
    except Exception as e:
        print(f"❌ Failed to initialize AzureOpenAI client: {e}")
        sys.exit(1)

    # 1. Test smartmove-gpt-4o
    print("\n--- Testing smartmove-gpt-4o ---")
    try:
        client.chat.completions.create(
            model="smartmove-gpt-4o",
            messages=[{"role": "user", "content": "Hello, this is a test."}],
            max_tokens=10
        )
        print("✅ smartmove-gpt-4o connected successfully.")
    except Exception as e:
        print(f"❌ smartmove-gpt-4o failed: {e}")

    # 2. Test text-embedding-3-small
    print("\n--- Testing text-embedding-3-small ---")
    try:
        client.embeddings.create(
            model="text-embedding-3-small",
            input="Test string for embeddings"
        )
        print("✅ text-embedding-3-small connected successfully.")
    except Exception as e:
        print(f"❌ smartmove-embeddings failed: {e}")

    # 3. Test smartmove-whisper
    print("\n--- Testing smartmove-whisper ---")
    try:
        dummy_wav = create_dummy_wav()
        client.audio.transcriptions.create(
            model="smartmove-whisper",
            file=dummy_wav
        )
        print("✅ smartmove-whisper connected successfully.")
    except RateLimitError:
        print("✅ Whisper connected successfully (Hit the 3 RPM limit bucket)")
    except Exception as e:
        print(f"❌ smartmove-whisper failed: {e}")

    print("\n" + "="*50)
    print("🎉 Diagnostics Complete")
    print("="*50)

if __name__ == "__main__":
    check_env_and_apis()
