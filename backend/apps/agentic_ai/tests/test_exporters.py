from django.test import TestCase
from unittest.mock import patch, MagicMock
from apps.agentic_ai.tools.report_exporter import ReportExporterTool
from apps.agentic_ai.exceptions import AgenticBaseException

class MockUser:
    def __init__(self, role):
        self.role = role

class ReportExporterTests(TestCase):
    def test_generate_pdf(self):
        pdf_bytes = ReportExporterTool.generate_pdf_report({"some": "data"})
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    @patch('apps.agentic_ai.tools.report_exporter.get_s3_client')
    def test_get_download_link_generates_url(self, mock_get_s3):
        mock_s3 = MagicMock()
        mock_s3.generate_presigned_url.return_value = "https://example.com/download"
        mock_get_s3.return_value = mock_s3
        
        url = ReportExporterTool.get_download_link("file.pdf")
        self.assertEqual(url, "https://example.com/download")
