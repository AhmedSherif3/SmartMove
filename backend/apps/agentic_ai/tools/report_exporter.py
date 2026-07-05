import uuid
from django.conf import settings
from apps.agentic_ai.exceptions import AgenticBaseException
from apps.smartmove_cloud.utils import get_s3_client
from apps.smartmove_cloud.models import UserFolder, UserFile

class ReportExporterTool:
    """
    Takes a Hybrid Dashboard UI Contract and converts it into a PDF
    using the 'unified-report' file style template.
    Handles the Cloud Save and Download Link generation for Premium Users.
    """

    @classmethod
    def generate_pdf_report(cls, ui_contract: dict) -> bytes:
        """
        Generates a PDF using reportlab instead of WeasyPrint.
        """
        import io
        # pyrefly: ignore [missing-source-for-stubs]
        from reportlab.lib.pagesizes import letter
        # pyrefly: ignore [missing-source-for-stubs]
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        # pyrefly: ignore [missing-source-for-stubs]
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        # pyrefly: ignore [missing-source-for-stubs]
        from reportlab.lib import colors

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], textColor=colors.HexColor('#6c5ce7'), fontSize=24, spaceAfter=14)
        h2_style = ParagraphStyle('H2Style', parent=styles['Heading2'], textColor=colors.HexColor('#2d3436'), fontSize=18, spaceBefore=20, spaceAfter=10)
        body_style = styles['Normal']
        
        elements = []
        data = ui_contract.get('ui_payload', ui_contract)
        
        title = data.get('title', 'SmartMove Analytics Report')
        elements.append(Paragraph(title, title_style))
        
        if 'insight_text' in data:
            elements.append(Paragraph("Executive Summary", h2_style))
            elements.append(Paragraph(data['insight_text'], body_style))
            
        kpis = data.get('kpis', [])
        if kpis:
            elements.append(Paragraph("Key Performance Indicators", h2_style))
            kpi_data = [["KPI Name", "Value"]]
            for kpi in kpis:
                kpi_data.append([kpi.get('name', ''), str(kpi.get('value', ''))])
            t = Table(kpi_data, colWidths=[250, 150])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f2f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fafbfc')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dfe6e9'))
            ]))
            elements.append(t)
            
        panels = data.get('panels', [])
        for panel in panels:
            comp = panel.get('component')
            p_title = panel.get('title', '')
            if comp == "StatCard":
                elements.append(Paragraph(f"{p_title}: {panel.get('value', '')}", body_style))
            elif comp == "TextBlock":
                elements.append(Paragraph(p_title, h2_style))
                elements.append(Paragraph(panel.get('content', ''), body_style))
            elif comp == "DataTable":
                elements.append(Paragraph(p_title, h2_style))
                headers = panel.get('headers', [])
                rows = panel.get('rows', [])
                if headers and rows:
                    table_data = [headers] + rows
                    t = Table(table_data)
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f2f6')),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dfe6e9'))
                    ]))
                    elements.append(t)

        charts = data.get('charts', {})
        if isinstance(charts, dict):
            for chart_type, chart_list in charts.items():
                if isinstance(chart_list, list):
                    for chart in chart_list:
                        c_title = chart.get('title', f'{chart_type} Chart')
                        elements.append(Paragraph(c_title, h2_style))
                        
                        c_data = chart.get('data', [])
                        if c_data and isinstance(c_data, list) and isinstance(c_data[0], dict):
                            keys = list(c_data[0].keys())
                            table_data = [[str(k).title() for k in keys]]
                            for item in c_data:
                                table_data.append([str(item.get(k, '')) for k in keys])
                                
                            t = Table(table_data)
                            t.setStyle(TableStyle([
                                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f2f6')),
                                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dfe6e9'))
                            ]))
                            elements.append(t)
                            
        try:
            doc.build(elements)
            pdf_bytes = buffer.getvalue()
            buffer.close()
            return pdf_bytes
        except Exception as e:
            print(f"ReportLab generation failed: {e}")
            return b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" \
                   b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" \
                   b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n" \
                   b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n" \
                   b"5 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(SmartMove Report - Server Error) Tj\nET\nendstream\nendobj\n" \
                   b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000236 00000 n \n0000000305 00000 n \n" \
                   b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n400\n%%EOF"

    @classmethod
    def save_to_cloud(cls, pdf_bytes: bytes, user, workspace_id: str) -> str:
        """
        Saves the generated PDF to the user's MinIO workspace and creates a UserFile record.
        """
        try:
            s3_client = get_s3_client()
            bucket_name = getattr(settings, 'MINIO_BUCKET_NAME', 'smartmove-bucket')
            file_key = f"dashboards/workspace_{workspace_id}/report_{uuid.uuid4().hex[:6]}.pdf"

            # Get the actual folder to ensure it belongs to user
            folder = UserFolder.objects.get(id=workspace_id, user=user)

            s3_client.put_object(
                Bucket=bucket_name,
                Key=file_key,
                Body=pdf_bytes,
                ContentType='application/pdf'
            )

            UserFile.objects.create(
                user=user,
                folder=folder,
                filename="AI_Report.pdf",
                extension="pdf",
                file_size_bytes=len(pdf_bytes),
                minio_object_key=file_key
            )

            return file_key
        # pyrefly: ignore [missing-attribute]
        except UserFolder.DoesNotExist:
            raise AgenticBaseException("Security Error: The requested workspace does not exist or access is denied.")
        except Exception as e:
            raise AgenticBaseException(f"Cloud Save Failed: {str(e)}")

    @classmethod
    def get_download_link(cls, file_key: str) -> str:
        """
        Generates a pre-signed URL for downloading the PDF.
        """
        try:
            s3_client = get_s3_client()
            bucket_name = getattr(settings, 'MINIO_BUCKET_NAME', 'smartmove-bucket')
            
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': file_key},
                ExpiresIn=3600
            )
            return presigned_url
        except Exception as e:
            raise AgenticBaseException(f"Failed to generate download link: {str(e)}")
