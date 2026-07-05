import os
from openai import AzureOpenAI
from django.conf import settings
from apps.agentic_ai.utils.constants import AI_MODEL_ROUTING
from apps.agentic_ai.exceptions import AgenticBaseException

class RagPolicyAgent:
    """
    Reads complex legal and regulatory documents to answer user queries.
    Powered by Azure OpenAI.
    """

    def __init__(self):
        self.client = AzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION
        )
        self.config = AI_MODEL_ROUTING["RAG_POLICY_AGENT"]

    def answer_question(self, question: str, retrieved_documents: str) -> dict:
        """
        Analyzes the retrieved legal text and answers the user's question.
        """
        system_instruction = (
            "You are a Real Estate Legal & Regulatory Analyst for SmartMove. "
            "You will be provided with excerpts from legal documents. "
            "Answer the user's question accurately using ONLY the provided documents. "
            "If the answer is not in the documents, state that clearly."
        )

        prompt = f"Documents:\n{retrieved_documents}\n\nQuestion:\n{question}"

        messages: list[dict] = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt}
        ]

        try:
            response = self.client.chat.completions.create(
                model=self.config["model_name"],
                messages=messages,
                temperature=self.config["temperature"],
            )

            usage = response.usage
            
            return {
                "status": "success",
                "answer": response.choices[0].message.content,
                "usage": {
                    "prompt_tokens": usage.prompt_tokens if usage else 0,
                    "completion_tokens": usage.completion_tokens if usage else 0
                }
            }

        except Exception as e:
            raise AgenticBaseException(f"RAG Policy Agent failed: {str(e)}")