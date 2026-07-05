import os
import sys
import io
import wave
from pathlib import Path
from dotenv import load_dotenv

def print_header(title):
    print("\n" + "="*50)
    print(f"🚀 {title}")
    print("="*50)

def print_success(msg):
    print(f"✅ {msg}")

def print_error(msg):
    print(f"❌ {msg}")

def create_dummy_wav():
    wav_io = io.BytesIO()
    with wave.open(wav_io, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(1)
        wav_file.setframerate(8000)
        wav_file.writeframes(b'\x00' * 8000)
    wav_io.seek(0)
    wav_io.name = "test_audio.wav"
    return wav_io

def test_azure():
    print_header("Azure OpenAI Models")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    
    if not api_key or not endpoint:
        print_error("Missing AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT.")
        return

    try:
        from openai import AzureOpenAI, RateLimitError
        client = AzureOpenAI(
            api_key=api_key,
            api_version="2024-06-01",
            azure_endpoint=endpoint
        )
    except Exception as e:
        print_error(f"Failed to initialize AzureOpenAI client: {e}")
        return

    # 1. GPT-4o
    print("\n--- Testing Azure GPT-4o ---")
    try:
        client.chat.completions.create(
            model="smartmove-gpt-4o",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=5
        )
        print_success("smartmove-gpt-4o connected successfully.")
    except Exception as e:
        print_error(f"smartmove-gpt-4o failed: {e}")

    # 2. Embeddings
    print("\n--- Testing Azure Embeddings ---")
    try:
        client.embeddings.create(
            model="text-embedding-3-small",
            input="Test"
        )
        print_success("text-embedding-3-small connected successfully.")
    except Exception as e:
        print_error(f"text-embedding-3-small failed: {e}")

    # 3. Whisper
    print("\n--- Testing Azure Whisper ---")
    try:
        client.audio.transcriptions.create(
            model="smartmove-whisper",
            file=create_dummy_wav()
        )
        print_success("smartmove-whisper connected successfully.")
    except RateLimitError:
        print_success("Whisper connected successfully (Hit the 3 RPM limit bucket)")
    except Exception as e:
        print_error(f"smartmove-whisper failed: {e}")

def test_gemini():
    print_header("Google Gemini Models")
    api_key = os.getenv("GOOGLE_API_KEY")
    
    if not api_key:
        print_error("Missing GOOGLE_API_KEY in backend/.env")
        return

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        
        gemini_models = [
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash"
        ]
        
        for model_name in gemini_models:
            print(f"\n--- Testing {model_name} ---")
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents='Say hi'
                )
                print_success(f"{model_name} connected successfully.")
            except Exception as e:
                print_error(f"{model_name} failed: {e}")
                
    except ImportError:
        print_error("google-genai is not installed. Run: pip install google-genai")
    except Exception as e:
        print_error(f"Google Gemini initialization failed: {e}")

def test_anthropic():
    print_header("Anthropic Claude Models")
    api_key = os.getenv("ANTHROPIC_API_KEY")
    
    if not api_key:
        print_error("Missing ANTHROPIC_API_KEY. It wasn't found in the Airflow .env either.")
        return

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        
        print("\n--- Testing Claude 3.5 Sonnet ---")
        message = client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=5,
            messages=[
                {"role": "user", "content": "Hello"}
            ]
        )
        print_success("claude-3-5-sonnet-latest connected successfully.")
    except ImportError:
        print_error("anthropic package is not installed. Run: pip install anthropic")
    except Exception as e:
        print_error(f"Anthropic Claude failed: {e}")

def main():
    # Load backend env variables
    load_dotenv(Path(".env"))
    
    # The Anthropic key is stored in the Airflow pipeline directory according to ai_models_status.md
    if not os.getenv("ANTHROPIC_API_KEY"):
        airflow_env = Path("../pipeline/Airflow/.env")
        if airflow_env.exists():
            load_dotenv(airflow_env)

    test_azure()
    test_gemini()
    test_anthropic()
    
    print("\n" + "="*50)
    print("🎉 All AI Models Diagnostics Complete")
    print("="*50)

if __name__ == "__main__":
    main()
