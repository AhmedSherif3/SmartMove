"""
Unified settings and constants for the Multi-Agent Swarm routing layout.
"""

# AI Model Deployments Mapping
AI_MODEL_ROUTING = {
    "SUPERVISOR": {
        "role": "Project Manager & Task Delegator",
        "provider": "azure",
        "model_name": "gemini-2.5-flash",  
        "temperature": 0.2
    },
    "DATA_ENGINEER": {
        "role": "Read-Only SQL Generator",
        "provider": "azure",
        "model_name": "gemini-2.5-flash",  
        "temperature": 0.0
    },
    "RAG_POLICY_AGENT": {
        "role": "Document & Legal Researcher",
        "provider": "azure",
        "model_name": "gemini-2.5-flash",  
        "temperature": 0.1
    },
    "UI_DESIGNER": {
        "role": "JSON Frontend Formatter",
        "provider": "azure",
        "model_name": "gemini-2.5-flash",  
        "temperature": 0.1
    },
    "EMBEDDER": {
        "role": "Text-to-Vector Translator",
        "provider": "azure",
        "model_name": "text-embedding-3-small",  
        "temperature": 0.0
    }
}

ALLOWED_REGIONS = ["Egypt", "Dubai", "England"]