from django.test import TestCase
from unittest.mock import MagicMock, patch
from apps.agentic_ai.tools.minio_workspace import MinIOWorkspaceTool
from apps.agentic_ai.exceptions import AgenticBaseException
from apps.smartmove_cloud.models import UserFolder
from django.contrib.auth import get_user_model

User = get_user_model()

class SecurityIsolationTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create(email="user1@test.com", username="user1")
        self.user2 = User.objects.create(email="user2@test.com", username="user2")
        self.workspace1 = UserFolder.objects.create(user=self.user1, name="WS 1")

    def test_tenant_isolation(self):
        # User 2 tries to access User 1's workspace
        with self.assertRaises(AgenticBaseException) as context:
            MinIOWorkspaceTool.extract_structured_data(str(self.workspace1.id), self.user2)
        
        self.assertIn("Security Error", str(context.exception))

    @patch('apps.agentic_ai.tools.minio_workspace.get_s3_client')
    def test_own_workspace_access(self, mock_get_s3):
        # User 1 tries to access User 1's workspace
        # It should return "No structured data" instead of Security Error since we mocked S3 but added no files
        result = MinIOWorkspaceTool.extract_structured_data(str(self.workspace1.id), self.user1)
        self.assertEqual(result, "No structured data (CSV/Excel) found in this workspace.")
