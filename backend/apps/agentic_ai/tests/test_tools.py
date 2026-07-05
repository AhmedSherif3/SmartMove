from unittest.mock import patch, MagicMock
from django.test import TestCase
from apps.agentic_ai.tools.minio_workspace import MinIOWorkspaceTool
from apps.agentic_ai.exceptions import AgenticBaseException
from apps.analytics_pro_engine.models import AnalysisWorkspace

class MinIOWorkspaceToolTests(TestCase):
    
    @patch('apps.agentic_ai.tools.minio_workspace.AnalysisWorkspace.objects.get')
    @patch('apps.agentic_ai.tools.minio_workspace.get_s3_client')
    @patch('apps.agentic_ai.tools.minio_workspace.PyPDF2')
    def test_extract_text_from_workspace_pdfs_success(self, mock_pypdf2, mock_get_s3_client, mock_get_workspace):
        """
        Test 1: Successfully extracts and concatenates text from all PDFs in a workspace.
        """
        # Mock the workspace and its files
        mock_workspace = MagicMock()
        mock_file1 = MagicMock()
        mock_file1.filename = "doc1.pdf"
        mock_file1.minio_object_key = "path/to/doc1.pdf"
        
        mock_file2 = MagicMock()
        mock_file2.filename = "doc2.pdf"
        mock_file2.minio_object_key = "path/to/doc2.pdf"
        
        # Setup the filter to return our mock files
        mock_workspace.files.filter.return_value = [mock_file1, mock_file2]
        mock_get_workspace.return_value = mock_workspace
        
        # Mock S3 client response
        mock_s3 = MagicMock()
        mock_response = {'Body': MagicMock()}
        mock_response['Body'].read.return_value = b'fake_pdf_bytes'
        mock_s3.get_object.return_value = mock_response
        mock_get_s3_client.return_value = mock_s3
        
        # Mock PyPDF2 Reader
        mock_reader = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Extracted test text."
        mock_reader.pages = [mock_page]
        mock_pypdf2.PdfReader.return_value = mock_reader
        
        result = MinIOWorkspaceTool.extract_text_from_workspace_pdfs("fake-workspace-id")
        
        # Assertions
        self.assertIn("--- Document: doc1.pdf ---", result)
        self.assertIn("--- Document: doc2.pdf ---", result)
        self.assertIn("Extracted test text.", result)
        self.assertEqual(mock_s3.get_object.call_count, 2)

    @patch('apps.agentic_ai.tools.minio_workspace.AnalysisWorkspace.objects.get')
    def test_extract_text_no_pdfs_found(self, mock_get_workspace):
        """
        Test 2: Handles the case where the workspace exists but contains no PDFs.
        """
        # Mock a workspace with no PDF files
        mock_workspace = MagicMock()
        mock_workspace.files.filter.return_value = []
        mock_get_workspace.return_value = mock_workspace
        
        result = MinIOWorkspaceTool.extract_text_from_workspace_pdfs("fake-workspace-id")
        
        # Assertion
        self.assertEqual(result, "No PDF documents found in this workspace to analyze.")
        mock_workspace.files.filter.assert_called_once_with(extension__iexact='pdf')

    @patch('apps.agentic_ai.tools.minio_workspace.AnalysisWorkspace.objects.get')
    def test_extract_text_workspace_does_not_exist(self, mock_get_workspace):
        """
        Test 3: Handles security / not found error when the workspace does not exist.
        """
        # Make the query raise DoesNotExist
        mock_get_workspace.side_effect = AnalysisWorkspace.DoesNotExist
        
        with self.assertRaises(AgenticBaseException) as context:
            MinIOWorkspaceTool.extract_text_from_workspace_pdfs("invalid-workspace-id")
            
        self.assertIn("Security Error: The requested workspace does not exist or access is denied.", str(context.exception))
