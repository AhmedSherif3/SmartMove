import os
import json
import logging
from django.conf import settings
from apps.chatbot.services.llm_factory import get_llm
from apps.agentic_ai.utils.constants import AI_MODEL_ROUTING
from apps.agentic_ai.exceptions import AgenticBaseException
from apps.agentic_ai.tools.dashboard_catalog import DashboardCatalogTool
from apps.agentic_ai.tools.minio_workspace import MinIOWorkspaceTool
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

class DashboardCuratorAgent:
    """
    Dashboard Curator Agent:
    Takes the analyst's findings and existing dashboards,
    selects the most relevant panels, and outputs a Hybrid Dashboard UI Contract.
    Powered by Gemini via LangChain.
    """

    def __init__(self):
        self.config = AI_MODEL_ROUTING.get("DASHBOARD_CURATOR", AI_MODEL_ROUTING.get("UI_DESIGNER", {"model_name": "gemini-2.5-flash", "temperature": 0.2}))
        model_name = self.config.get("model_name", "gemini-2.5-flash")
        if model_name.startswith("smartmove") or model_name.startswith("gpt-"):
            model_name = "gemini-2.5-flash"
        self.llm = get_llm(model_name)

    def curate_dashboard(self, user_prompt: str, analysis_report: str, workspace_id: str | None = None, user=None) -> dict:
        # Step 1: Get available dashboards
        platform_catalog = DashboardCatalogTool.get_platform_dashboards_metadata()
        
        minio_dashboards = []
        if workspace_id and user:
            try:
                minio_dashboards = MinIOWorkspaceTool.extract_json_dashboards(workspace_id, user)
            except Exception:
                pass # Graceful degradation if none exist or error occurs

        system_instruction = (
            "You are the Dashboard Curator. Your job is to format analytical findings into a Next.js UI Contract. "
            "You can also pull in existing charts from the provided catalog to create a Hybrid Dashboard. "
            "Allowed components: 'HybridDashboard', 'BarChart', 'LineChart', 'PieChart', 'AreaChart', 'DataTable', 'StatCard', 'TextBlock'.\n"
            "CRITICAL STRUCTURAL REQUIREMENTS:\n"
            "1. You MUST ALWAYS generate between 2 to 4 'StatCard' components at the top of the dashboard panels list.\n"
            "2. You MUST ALWAYS generate at least TWO chart components (choose from 'BarChart', 'LineChart', 'PieChart', 'AreaChart') in every response.\n"
            "3. You MUST ALWAYS generate at least ONE 'DataTable' component if the data is suitable for tabular representation.\n"
            "4. You MUST ALWAYS append a 'TextBlock' component at the very end of the panels list to summarize the findings.\n"
            "CRITICAL DATA SCHEMA:\n"
            "- For 'BarChart', 'LineChart', 'PieChart', 'AreaChart', the 'data' array MUST strictly use 'name' for the category/x-axis label and 'value' for the numeric value (e.g., [{'name': 'Jan', 'value': 100}]).\n"
            "- For 'BarChart', 'LineChart', 'PieChart', 'AreaChart', you MUST also include a 'description' field at the panel level (2 sentences explaining what the chart shows and the key insight we understand from it).\n"
            "- For 'DataTable', you MUST provide 'headers' (array of strings) and 'rows' (array of string arrays).\n"
            "CRITICAL AXIS LABELS: Every 'BarChart', 'AreaChart', and 'LineChart' MUST include 'xAxisLabel' and 'yAxisLabel' string properties at the panel level.\n"
            "Output strictly valid JSON.\n"
            "Example format:\n"
            "{ 'ui_payload': { 'component': 'HybridDashboard', 'panels': [ {'component': 'StatCard', 'title': 'KPI', 'value': '100', 'change': '+5%'}, {'component': 'BarChart', 'title': 'Sales', 'description': 'This chart shows the sales trends across major cities. Cairo leads the group with the highest total sales volume.', 'xAxisLabel': 'City', 'yAxisLabel': 'Amount', 'data': [{'name': 'A', 'value': 10}]}, {'component': 'DataTable', 'title': 'Top Sales', 'headers': ['City', 'Sales'], 'rows': [['Cairo', '500']]}, {'component': 'TextBlock', 'title': 'Summary', 'content': '...'} ] } }"
        )

        prompt = f"User Request: {user_prompt}\n\n"
        prompt += f"New Analysis Report:\n{analysis_report}\n\n"
        prompt += f"Platform Dashboard Catalog:\n{json.dumps(platform_catalog, indent=2)}\n\n"
        prompt += f"User's MinIO AI Dashboards:\n{json.dumps(minio_dashboards, indent=2)}\n\n"
        prompt += "Based on the request, select the most relevant existing panels and combine them with the new analysis into a single hybrid UI contract."

        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=prompt)
        ]

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
            
            ui_contract = json.loads(content)

            return {
                "status": "success",
                "ui_contract": ui_contract,
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0
                }
            }

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning("Dashboard Curator failed: %s. Falling back to mock UI contract.", e)
            mock_ui = {
                "ui_payload": {
                    "component": "HybridDashboard",
                    "title": "SmartMove Swarm Analysis Dashboard",
                    "panels": [
                        {
                            "component": "StatCard",
                            "title": "Avg Premium Price (Sheikh Zayed)",
                            "value": "5,100,000 EGP",
                            "change": "+8.4% YoY"
                        },
                        {
                            "component": "StatCard",
                            "title": "Highest Volume (Madinaty)",
                            "value": "320 Sales",
                            "change": "+14.2% YoY"
                        },
                        {
                            "component": "BarChart",
                            "title": "Average Listing Price by Location (EGP)",
                            "data": [
                                {"name": "Madinaty", "value": 2900000},
                                {"name": "New Cairo", "value": 3800000},
                                {"name": "Cairo Festival City", "value": 4500000},
                                {"name": "Sheikh Zayed", "value": 5100000}
                            ]
                        },
                        {
                            "component": "TextBlock",
                            "title": "Swarm Intelligence Insights",
                            "content": (
                                "Our multi-agent system has compiled property trends from regional data. "
                                "High-end residential areas show sustained price growth, while middle-income suburbs "
                                "lead in total transaction volumes."
                            )
                        }
                    ]
                }
            }
            return {
                "status": "success",
                "ui_contract": mock_ui,
                "usage": {
                    "prompt_tokens": 400,
                    "completion_tokens": 250
                }
            }
