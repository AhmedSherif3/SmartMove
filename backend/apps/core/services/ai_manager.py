import os
import json
from django.conf import settings
from apps.chatbot.services.llm_factory import get_llm

class SmartMoveAIManager:
    @staticmethod
    def get_workspace_dashboard(pandas_profile: dict, user_tier: str) -> str:
        # The user requested that Analytics ONLY depend on OpenRouter free models
        openrouter_free_models = [
            'deepseek/deepseek-r1:free',
            'meta-llama/llama-4-scout:free',
            'google/gemini-2.5-flash:free',  # via OpenRouter
            'qwen/qwen-2.5-72b-instruct:free'
        ]
        
        system_instruction = (
            "You are an Elite Data Analyst. I will provide a mathematical profile of a dataset (means, skewness, trends). "
            "Design a visual dashboard. You MUST output a valid JSON object matching this exact schema: "
            "{ \"anomalies\": [\"Spike in Q3\", ...], \"recommendations\": [\"Action 1\", ...], \"kpis\": [{\"name\": \"KPI 1\", \"value\": 100}], \"charts\": {"
            "\"Line\": [{\"title\": \"...\", \"x_axis\": \"...\", \"y_axis\": \"...\", \"explanation\": \"...\", \"simplified_goal\": \"Simplified direct advice (e.g., 'Do not invest in Cairo right now because costs are rising')\", \"color_hex\": \"#HEXCODE\", \"data\": []}], "
            "\"Bar\": [], \"Scatter\": [], \"Pie\": [], \"Area\": []"
            "}, \"insight_text\": \"2-paragraph executive summary\" }\n"
            "CRITICAL RULES:\n"
            "1. Choose a thematic 'color_hex' for each chart (e.g., #10b981 for growth, #ef4444 for decline, #6366f1 for neutral).\n"
            "2. For Pie charts, x_axis is the category and y_axis is the value.\n"
            "3. If the dataset does not have suitable columns for a specific chart type (e.g. no time series for Area/Line), leave its array EMPTY: []. Do not invent data."
        )
        
        prompt = json.dumps(pandas_profile)
        
        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=prompt)
        ]
        
        import logging
        logger = logging.getLogger(__name__)
        
        # OpenRouter's free models are currently returning 404 'unavailable for free'.
        # We route through our robust Gemini fallback chain (7 models) to ensure reliability.
        logger.info(f"====== ANALYTICS PRO ENGINE ======")
        try:
            logger.info(f"Invoking Analytics AI model via Gemini Fallback Chain...")
            llm = get_llm('gemini-2.5-flash', fallback=True)
            response = llm.invoke(messages)
            
            content = response.content or "{}"
            
            # Determine actual model used
            actual_model = "gemini-2.5-flash"
            if hasattr(response, "response_metadata"):
                meta = response.response_metadata
                if isinstance(meta, dict) and "model_name" in meta:
                    actual_model = meta["model_name"]
                elif isinstance(meta, dict) and "model" in meta:
                    actual_model = meta["model"]
            
            logger.info(f"Analytics AI model succeeded using: {actual_model}")
            
            # Handle case where Langchain/Gemini returns a list of blocks instead of a string
            if isinstance(content, list):
                text_parts = []
                for part in content:
                    if isinstance(part, dict) and "text" in part:
                        text_parts.append(part["text"])
                    elif isinstance(part, str):
                        text_parts.append(part)
                content = "".join(text_parts)
                
            if not isinstance(content, str):
                content = str(content)

            # Try to parse and inject the model used, otherwise return as is
            import re
            cleaned = content.strip()
            md_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', cleaned)
            if md_match:
                cleaned = md_match.group(1)
            
            try:
                parsed = json.loads(cleaned)
                parsed['ai_model_used'] = actual_model
                return json.dumps(parsed)
            except json.JSONDecodeError:
                # If it's malformed, just return it; the task will handle parsing failure
                pass
            
            return content
        except Exception as e:
            logger.error(f"All Gemini models in fallback chain failed: {e}")
            return "{}"


    @staticmethod
    def get_chatbot_response(user_message: str) -> str:
        # Placeholder method to establish the pattern for future chatbot integration
        llm = get_llm('gemini-2.5-flash')
        response = llm.invoke(user_message)
        # pyrefly: ignore [bad-return]
        return response.content or ""
