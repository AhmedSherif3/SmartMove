# Triggers WeasyPrint PDF generation
import os
import uuid
from django.conf import settings
from django.template.loader import render_to_string
from apps.agentic_ai.exceptions import AgenticBaseException

# Safe import for WeasyPrint to protect local development environments
try:
    from weasyprint import HTML # type: ignore
except ImportError:
    HTML = None

class AgenticPDFRenderer:
    """
    Generates enterprise real estate evaluation profiles using WeasyPrint
    triggered directly by Swarm request operations.
    """

    @classmethod
    def compile_investment_report(cls, report_data: dict, output_filename: str = "") -> str:
        """
        Renders raw agent analytics into a styled PDF structure.
        Returns the local absolute file path to the compiled document artifact.
        """
        if not HTML:
            raise AgenticBaseException(
                "PDF Compilation Engine Failure: WeasyPrint dependency is missing from the environment."
            )

        if not output_filename:
            output_filename = f"agent_briefing_{uuid.uuid4().hex[:8]}.pdf"

        # Build clean absolute storage paths using Django constants
        output_dir = os.path.join(settings.MEDIA_ROOT, 'generated_reports')
        os.makedirs(output_dir, exist_ok=True)
        pdf_destination_path = os.path.join(output_dir, output_filename)

        try:
            # Bind dataset keys to your unified report templates
            html_content = render_to_string(
                'reports/unified_report.html',
                {
                    "title": report_data.get("title", "SmartMove Swarm Briefing Profile"),
                    "sections": report_data.get("sections", []),
                    "regional_metrics": report_data.get("metrics", {}),
                    "generated_by": "SmartMove Agentic AI Engine"
                }
            )

            # Compile HTML to file storage targets via WeasyPrint engine layers
            HTML(string=html_content).write_pdf(target=pdf_destination_path)

            return pdf_destination_path

        except Exception as e:
            raise AgenticBaseException(f"Automated Report Execution aborted: {str(e)}")