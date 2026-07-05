from unittest.mock import patch, MagicMock
from django.test import TestCase
from apps.agentic_ai.memory.summarizer import ContextWindowSummarizer
from apps.agentic_ai.exceptions import AgenticBaseException

class ContextWindowSummarizerTests(TestCase):

    @patch('apps.agentic_ai.memory.summarizer.genai.Client')
    def test_compress_history_success(self, mock_genai_client):
        """
        Test 1: History is successfully compressed via Gemini.
        """
        mock_client_instance = MagicMock()
        mock_genai_client.return_value = mock_client_instance
        
        mock_response = MagicMock()
        mock_response.text = "User wants a house in Dubai. Budget is $1M."
        mock_client_instance.models.generate_content.return_value = mock_response
        
        conversation = "User: I want a house in Dubai. Assistant: What's your budget? User: 1 million dollars."
        result = ContextWindowSummarizer.compress_history(conversation)
        
        self.assertEqual(result, "User wants a house in Dubai. Budget is $1M.")
        mock_client_instance.models.generate_content.assert_called_once()

    @patch('apps.agentic_ai.memory.summarizer.genai.Client')
    def test_compress_history_empty_response(self, mock_genai_client):
        """
        Test 2: API returns an empty text block, ensuring the fallback handles it gracefully.
        """
        mock_client_instance = MagicMock()
        mock_genai_client.return_value = mock_client_instance
        
        mock_response = MagicMock()
        mock_response.text = "" # Or None
        mock_client_instance.models.generate_content.return_value = mock_response
        
        result = ContextWindowSummarizer.compress_history("Some logs")
        
        self.assertEqual(result, "Previous context compressed.")

    @patch('apps.agentic_ai.memory.summarizer.genai.Client')
    def test_compress_history_exception(self, mock_genai_client):
        """
        Test 3: Checks that Google SDK exceptions are caught and re-raised as AgenticBaseException.
        """
        mock_client_instance = MagicMock()
        mock_genai_client.return_value = mock_client_instance
        
        mock_client_instance.models.generate_content.side_effect = Exception("API rate limit exceeded")
        
        with self.assertRaises(AgenticBaseException) as context:
            ContextWindowSummarizer.compress_history("logs")
            
        self.assertIn("Memory compression failed: API rate limit exceeded", str(context.exception))
