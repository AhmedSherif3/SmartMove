"""
Chatbot Services Layer
======================
Internal service modules for the SmartMove Conversational AI.

Modules:
    llm_factory     — LLM provider initialisation with fallback chains.
    react_agent     — LangChain ReAct agent orchestrator.
    memory          — Redis-backed 5-turn conversation memory.
    semantic_cache  — pgvector cosine-similarity response cache.
    audio           — OpenAI Whisper speech-to-text integration.
"""
