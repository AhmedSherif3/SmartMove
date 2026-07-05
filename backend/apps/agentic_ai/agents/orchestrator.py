import json
import logging
from apps.chatbot.services.llm_factory import get_llm
from apps.agentic_ai.utils.constants import AI_MODEL_ROUTING
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

class SupervisorAgent:
    """
    The Orchestrator. Analyzes user intent and routes the query.
    Supports a Compound Pipeline (DataEngineer -> DataAnalyst -> DashboardCurator -> Exporter).
    Powered by Gemini via LangChain.
    """
    
    def __init__(self):
        self.config = AI_MODEL_ROUTING["SUPERVISOR"]
        model_name = self.config.get("model_name", "gemini-2.5-flash")
        # Map legacy Azure model names to Gemini
        if model_name.startswith("smartmove") or model_name.startswith("gpt-"):
            model_name = "gemini-2.5-flash"
        self.llm = get_llm(model_name)

    def route_query(self, user_prompt: str, session_history: list) -> dict:
        system_prompt = (
            "You are the Supervisor for the SmartMove Real Estate Platform. "
            "Analyze the user's prompt and route it to ONE of the following execution paths:\n"
            "1. 'COMPOUND_PIPELINE': If the user asks for numbers, trends, charts, or cross-dashboard combinations requiring a full team (Engineer -> Analyst -> Curator -> Exporter).\n"
            "2. 'RAG_POLICY': If the user asks about laws, regulations, or text-based documents.\n"
            "3. 'UI_DESIGNER': If the user just wants to reformat existing generic data into a layout without analysis.\n"
            "Output strictly valid JSON: {\"target_agent\": \"AGENT_NAME\", \"instructions\": \"Detailed instructions for the pipeline or agent\"}"
        )

        messages = [SystemMessage(content=system_prompt)]
        for msg in session_history:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(SystemMessage(content=msg["content"]))
        messages.append(HumanMessage(content=user_prompt))

        try:
            response = self.llm.invoke(messages)
            content = response.content or "{}"
            
            if isinstance(content, list):
                content = "".join([c.get("text", "") for c in content if isinstance(c, dict)])
            
            # Strip markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            routing_decision = json.loads(content)
            
            # FORCE COMPOUND_PIPELINE AS REQUESTED BY USER
            routing_decision["target_agent"] = "COMPOUND_PIPELINE"
            
            return {
                "decision": routing_decision,
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0
                }
            }
            
        except Exception as e:
            logger.warning("Supervisor LLM failed: %s. Falling back to simulated routing.", e)
            return {
                "decision": {
                    "target_agent": "COMPOUND_PIPELINE",
                    "instructions": user_prompt
                },
                "usage": {
                    "prompt_tokens": 120,
                    "completion_tokens": 35
                }
            }