import os
import json
from openai import AzureOpenAI
from django.conf import settings
from apps.agentic_ai.utils.constants import AI_MODEL_ROUTING
from apps.agentic_ai.exceptions import AgenticBaseException, LLMHallucinationError

class UIDesignerAgent:
    """
    Takes raw data and formats it into the strict JSON UI Contract for Next.js.
    Powered by Azure OpenAI.
    """

    def __init__(self):
        self.client = AzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION
        )
        self.config = AI_MODEL_ROUTING["UI_DESIGNER"]

    def design_interface(self, raw_data: str, instructions: str) -> dict:
        """
        Forces the LLM to return a Next.js compatible JSON structure.
        """
        system_instruction = (
            "You are a strict Frontend UI JSON Formatter. "
            "Your job is to take raw data and map it to our Next.js component schema.\n"
            "You MUST return ONLY valid JSON. No markdown formatting, no explanations.\n"
            "Allowed components: 'BarChart', 'LineChart', 'StatCard', 'TextBlock'.\n"
            "Example format:\n"
            "{ 'ui_payload': { 'component': 'BarChart', 'title': '...', 'data': [ { 'label': '...', 'value': 123 } ] } }"
        )

        prompt = f"Instructions:\n{instructions}\n\nRaw Data:\n{raw_data}"

        messages: list[dict] = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt}
        ]

        try:
            response = self.client.chat.completions.create(
                model=self.config["model_name"],
                messages=messages,
                temperature=self.config["temperature"],
                response_format={ "type": "json_object" }
            )

            content = response.choices[0].message.content or "{}"
            ui_contract = json.loads(content)
            
            if "ui_payload" not in ui_contract:
                raise LLMHallucinationError("UI Designer failed to include the 'ui_payload' root key.")

            usage = response.usage

            return {
                "status": "success",
                "ui_contract": ui_contract,
                "usage": {
                    "prompt_tokens": usage.prompt_tokens if usage else 0,
                    "completion_tokens": usage.completion_tokens if usage else 0
                }
            }

        except json.JSONDecodeError:
            raise LLMHallucinationError("UI Designer generated invalid JSON that could not be parsed.")
        except Exception as e:
            raise AgenticBaseException(f"UI Designer failed: {str(e)}")