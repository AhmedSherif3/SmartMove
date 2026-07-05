from django.test import TestCase
from unittest.mock import patch, MagicMock
from apps.agentic_ai.agents.dashboard_curator import DashboardCuratorAgent
from apps.agentic_ai.agents.data_engineer import DataEngineerAgent

class AgentPipelineTests(TestCase):
    @patch('apps.agentic_ai.agents.data_engineer.AzureOpenAI')
    @patch('apps.agentic_ai.tools.azure_sandbox.AzureSQLSandbox.execute_read_only_query')
    @patch('apps.agentic_ai.tools.azure_sandbox.AzureSQLSandbox.get_database_schema')
    def test_data_engineer_agent(self, mock_get_schema, mock_execute_query, MockAzureOpenAI):
        mock_get_schema.return_value = "Table: test_table\nColumns: id"
        mock_execute_query.return_value = [{"id": 1}, {"id": 2}]
        
        mock_client = MagicMock()
        MockAzureOpenAI.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices[0].message.content = '{"sql_query": "SELECT * FROM test_table"}'
        mock_response.usage.prompt_tokens = 10
        mock_response.usage.completion_tokens = 20
        mock_client.chat.completions.create.return_value = mock_response
        
        agent = DataEngineerAgent()
        result = agent.execute_task("get all tests")
        
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["executed_query"], "SELECT * FROM test_table")
        self.assertIn("Azure SQL Data Snapshot", result["azure_sql_metadata"])

    @patch('apps.agentic_ai.agents.dashboard_curator.genai.Client')
    def test_dashboard_curator_hybrid(self, MockClient):
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_response = MagicMock()
        mock_response.text = '{"ui_payload": {"component": "HybridDashboard", "panels": []}}'
        mock_response.usage_metadata.prompt_token_count = 10
        mock_response.usage_metadata.candidates_token_count = 20
        mock_client.models.generate_content.return_value = mock_response

        agent = DashboardCuratorAgent()
        result = agent.curate_dashboard("Make me a dashboard", "Data shows an upward trend")
        
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["ui_contract"]["ui_payload"]["component"], "HybridDashboard")
