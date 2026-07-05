# Token condensation loop
import os
from google import genai
from django.conf import settings
from apps.agentic_ai.utils.constants import AI_MODEL_ROUTING
from apps.agentic_ai.exceptions import AgenticBaseException

class ContextWindowSummarizer:
    """
    Compresses long conversation histories using the ultra-fast Gemini 3.5 Flash model
    to prevent OpenAI context windows from overflowing and ballooning costs.
    """

    @classmethod
    def compress_history(cls, conversation_log: str) -> str:
        api_key = getattr(settings, 'GEMINI_API_KEY', os.environ.get('GEMINI_API_KEY'))
        client = genai.Client(api_key=api_key)
        
        # We reuse the 3.5 Flash config here because summarizing text is exactly 
        # the kind of fast, cheap work this model is built for.
        config = AI_MODEL_ROUTING["UI_DESIGNER"] 

        system_instruction = (
            "You are an AI Memory Compressor for SmartMove. "
            "Summarize the user's goals and the AI's previous actions from the conversation log. "
            "Keep it under 3 sentences. You MUST retain critical facts like requested regions (Egypt, Dubai, UK) "
            "or specific metric filters. Do not add new information."
        )

        try:
            response = client.models.generate_content(
                model=config["model_name"],
                contents=f"Conversation Log:\n{conversation_log}",
                config=genai.types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.0 # Zero creativity, just factual compression
                )
            )
            
            return response.text or "Previous context compressed."
            
        except Exception as e:
            raise AgenticBaseException(f"Memory compression failed: {str(e)}")