# Oracle Cloud document fetcher
import io
import json
import pandas as pd
from django.conf import settings
from apps.smartmove_cloud.models import UserFolder, UserFile
from apps.smartmove_cloud.utils import get_s3_client
from apps.agentic_ai.exceptions import AgenticBaseException

# We use PyPDF2 or pdfplumber to extract text from PDFs in memory
try:
    import PyPDF2 # type: ignore
except ImportError:
    PyPDF2 = None

class MinIOWorkspaceTool:
    """
    Allows the AI Swarm to retrieve and read physical files (PDFs, CSVs, JSONs) 
    stored in the user's secure MinIO workspace.
    Enforces strict tenant isolation by checking user ownership.
    """

    @classmethod
    def extract_text_from_workspace_pdfs(cls, workspace_id: str, user) -> str:
        """
        Downloads all PDFs in a given workspace directly into RAM,
        extracts the raw text, and returns a single concatenated string.
        """
        if not PyPDF2:
            raise AgenticBaseException("PDF parsing library (PyPDF2) is not installed.")

        try:
            workspace = UserFolder.objects.get(id=workspace_id, user=user)
            s3_client = get_s3_client()
            bucket_name = getattr(settings, 'MINIO_BUCKET_NAME', 'smartmove-bucket')
            
            combined_text = []

            for file_obj in UserFile.objects.filter(folder=workspace, extension__iexact='pdf'):
                response = s3_client.get_object(Bucket=bucket_name, Key=file_obj.minio_object_key)
                pdf_stream = io.BytesIO(response['Body'].read())
                reader = PyPDF2.PdfReader(pdf_stream)
                
                file_text = f"--- Document: {file_obj.filename} ---\n"
                for page in reader.pages:
                    file_text += page.extract_text() + "\n"
                    
                combined_text.append(file_text)

            if not combined_text:
                return "No PDF documents found in this workspace to analyze."

            return "\n\n".join(combined_text)

        except UserFolder.DoesNotExist:
            raise AgenticBaseException("Security Error: The requested workspace does not exist or access is denied.")
        except Exception as e:
            raise AgenticBaseException(f"MinIO Retrieval Failed: {str(e)}")

    @classmethod
    def extract_structured_data(cls, workspace_id: str, user) -> str:
        """
        Reads CSV and Excel files, generates mathematical metadata summaries 
        to protect the LLM context window, and returns the optimized text.
        """
        try:
            workspace = UserFolder.objects.get(id=workspace_id, user=user)
            s3_client = get_s3_client()
            bucket_name = getattr(settings, 'MINIO_BUCKET_NAME', 'smartmove-bucket')
            
            combined_summaries = []
            
            for file_obj in UserFile.objects.filter(folder=workspace, extension__iregex=r'^(csv|xlsx|xls)$'):
                response = s3_client.get_object(Bucket=bucket_name, Key=file_obj.minio_object_key)
                
                if file_obj.extension.lower() == 'csv':
                    df = pd.read_csv(response['Body'])
                else:
                    df = pd.read_excel(response['Body'])
                
                summary = f"--- Dataset: {file_obj.filename} ---\n"
                summary += f"Shape: {df.shape}\n"
                summary += f"Columns: {list(df.columns)}\n"
                summary += f"Missing Values: {df.isnull().sum().to_dict()}\n"
                summary += f"Summary Stats:\n{df.describe(include='all').to_string()}\n"
                summary += f"First 3 Rows:\n{df.head(3).to_string()}\n"
                
                combined_summaries.append(summary)
                
            if not combined_summaries:
                return "No structured data (CSV/Excel) found in this workspace."
                
            return "\n\n".join(combined_summaries)
            
        except UserFolder.DoesNotExist:
            raise AgenticBaseException("Security Error: The requested workspace does not exist or access is denied.")
        except Exception as e:
            raise AgenticBaseException(f"MinIO Retrieval Failed: {str(e)}")

    @classmethod
    def extract_json_dashboards(cls, workspace_id: str, user) -> list[dict]:
        """
        Reads AI-generated dashboard JSON configurations from MinIO for the Curator Agent.
        """
        try:
            workspace = UserFolder.objects.get(id=workspace_id, user=user)
            s3_client = get_s3_client()
            bucket_name = getattr(settings, 'MINIO_BUCKET_NAME', 'smartmove-bucket')
            
            dashboards = []
            
            # Fetch any individual JSON files uploaded to the workspace
            for file_obj in UserFile.objects.filter(folder=workspace, extension__iexact='json'):
                try:
                    response = s3_client.get_object(Bucket=bucket_name, Key=file_obj.minio_object_key)
                    dashboards.append(json.loads(response['Body'].read().decode('utf-8')))
                except Exception:
                    continue # Graceful degradation
                
            return dashboards

        except UserFolder.DoesNotExist:
            raise AgenticBaseException("Security Error: The requested workspace does not exist or access is denied.")
        except Exception as e:
            raise AgenticBaseException(f"MinIO Retrieval Failed: {str(e)}")