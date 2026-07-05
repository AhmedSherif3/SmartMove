"""
SmartMove Reports — PDF Engine (WeasyPrint)

Converts an HTML string into a PDF byte buffer using WeasyPrint.

System dependencies (installed in the Dockerfile):
    libpango-1.0-0  libpangoft2-1.0-0  libpangocairo-1.0-0
    libgdk-pixbuf2.0-0  libffi-dev  libcairo2  shared-mime-info

Usage:
    from apps.reports.services.pdf_engine import html_to_pdf

    pdf_bytes = html_to_pdf("<html><body><h1>Report</h1></body></html>")
"""

import logging

logger = logging.getLogger('apps.reports.services.pdf_engine')


def html_to_pdf(html_content: str) -> bytes:
    """
    Convert an HTML string into PDF bytes.

    Parameters
    ----------
    html_content : str
        Complete HTML document (including ``<html>``, ``<head>``, ``<body>``).

    Returns
    -------
    bytes
        The rendered PDF as a byte string.

    Raises
    ------
    ImportError
        If WeasyPrint or its system-level dependencies are not installed.
    RuntimeError
        If the PDF rendering fails for any reason.
    """
    try:
        from weasyprint import HTML  # type: ignore[import-untyped]
    except ImportError as exc:
        logger.error(
            "WeasyPrint is not installed or missing system dependencies. "
            "Run: apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 "
            "libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libcairo2 libffi-dev "
            "shared-mime-info && pip install weasyprint"
        )
        raise ImportError(
            "WeasyPrint is unavailable. Ensure system dependencies are installed."
        ) from exc

    try:
        logger.info("Rendering HTML → PDF (%d chars of HTML)", len(html_content))
        pdf_bytes: bytes = HTML(string=html_content).write_pdf()
        logger.info("PDF generated successfully (%d bytes)", len(pdf_bytes))
        return pdf_bytes
    except Exception as exc:
        logger.exception("PDF rendering failed: %s", exc)
        raise RuntimeError(f"PDF rendering failed: {exc}") from exc
