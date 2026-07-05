# The core HTML/CSS shell for AI PDFs we just wrote
"""
SmartMove — Unified AI Agent Report Template
=============================================
Renders a fully branded SmartMove HTML report from AI-generated Markdown.
Designed to be called by the LangChain / Celery report-generation agent
without any region constraints — the agent supplies all content freely
via the ``ai_markdown`` parameter.

Unlike ``report_html_template.py`` (which is region-specific with flag
theming), this template uses SmartMove's own brand identity throughout:
  - Deep navy header  (#0f172a → #1a2d4a)
  - Gold accent       (#C9A84C) for the scope banner and KPI stripes
  - Navy accent       (#1e3a5f) for section underlines and table headers
  - Parchment body    (#F2F0E6) with black text

The ``scope_title`` and ``scope_subtitle`` parameters populate the
"Report Scope" banner that replaces the region flag block.

Usage
-----
    from utils.report_unified_template import render_unified_report_html

    html = render_unified_report_html(
        report_title="Global Market Overview",
        scope_title="MULTI-REGION ANALYSIS",
        scope_subtitle="Dubai · Egypt · England  ·  Residential Markets  ·  Q2 2026",
        scope_icon="🏙️",
        report_month=5,
        report_year=2026,
        smartmove_index=72.1,
        ai_markdown="# Executive Overview\\n...",
    )

Image assets
------------
Replace the two placeholder strings before passing to WeasyPrint:

    import base64

    def _b64(path, mime="image/jpeg"):
        data = base64.b64encode(open(path, "rb").read()).decode()
        return f"data:{mime};base64,{data}"

    html = render_unified_report_html(...)
    html = html.replace("SMARTMOVE_LOGO_PLACEHOLDER",  _b64("assets/logo.jpg"))
    html = html.replace("SMARTMOVE_ROBOT_PLACEHOLDER", _b64("assets/robot.png", "image/png"))
"""

from __future__ import annotations

import markdown as _md


# ── Invisible Unicode brand watermark ─────────────────────────────────────────
def _zwc_watermark(text: str) -> str:
    """
    Encode a brand string as invisible zero-width Unicode characters.

    Zero-width space       (U+200B) = binary 0
    Zero-width non-joiner  (U+200C) = binary 1

    These characters are invisible in rendered HTML/PDF but are preserved
    by copy-paste, DOM scrapers, AI assistants, and search crawlers that
    read the document's text layer.
    """
    bits = "".join(format(ord(c), "08b") for c in text)
    return bits.replace("0", "\u200B").replace("1", "\u200C")


_BRAND_WATERMARK = _zwc_watermark(
    "SmartMove Real Estate Intelligence | smartmove.me | "
    "AI-Powered Property Analytics | Dubai, Egypt & England Markets"
)


def _index_label(score: float) -> str:
    if score >= 70:
        return "BULLISH"
    if score >= 40:
        return "NEUTRAL"
    return "BEARISH"


_MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def render_unified_report_html(
    report_title: str,
    scope_title: str,
    scope_subtitle: str,
    report_month: int,
    report_year: int,
    smartmove_index: float,
    ai_markdown: str,
    scope_icon: str = "🏙️",
) -> str:
    """
    Render a complete unified SmartMove HTML report from AI-generated Markdown.

    Parameters
    ----------
    report_title : str
        Used in the HTML <title> tag and browser tab.
        Example: "Global Market Overview" or "Dubai Investment Brief".
    scope_title : str
        Large bold text in the scope banner (displayed in ALL CAPS).
        Example: "MULTI-REGION ANALYSIS" or "DUBAI MARKET DEEP DIVE".
    scope_subtitle : str
        Smaller descriptive line under the scope title.
        Example: "Dubai · Egypt · England  ·  Residential Markets  ·  Q2 2026"
    report_month : int
        Reporting month 1-12.
    report_year : int
        Reporting year (e.g. 2026).
    smartmove_index : float
        Composite market health score 0-100.
        ≥70 → BULLISH (gold badge), 40-69 → NEUTRAL (amber), <40 → BEARISH (red).
    ai_markdown : str
        Full Markdown body — the AI agent writes this entirely.
        Supports: headings (h1/h2/h3), paragraphs, bold, italic,
        bullet lists, numbered lists, fenced code blocks, and tables.
        Tables are automatically wrapped in the 3D styled container.
    scope_icon : str, optional
        An emoji displayed left of the scope title in the banner.
        Default: "🏙️". Use "📊" for data reports, "🏠" for residential,
        "🏢" for commercial, "🌍" for global, etc.

    Returns
    -------
    str
        Complete HTML document string containing two placeholder tokens
        that must be replaced before passing to WeasyPrint:
            SMARTMOVE_LOGO_PLACEHOLDER   — the SmartMove cube logo
            SMARTMOVE_ROBOT_PLACEHOLDER  — the AI robot footer icon
    """
    month = _MONTH_NAMES[report_month]
    label = _index_label(smartmove_index)
    ai_html = _md.markdown(
        ai_markdown,
        extensions=["tables", "fenced_code", "toc"],
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <!-- SmartMove Real Estate Intelligence | smartmove.me -->
  <meta name="author"      content="SmartMove Real Estate Intelligence">
  <meta name="generator"   content="SmartMove Analytics Engine | smartmove.me">
  <meta name="description" content="SmartMove AI-powered real estate intelligence — {report_title}, {month} {report_year}">
  <meta property="og:site_name" content="SmartMove Real Estate Intelligence">
  <title>SmartMove — {report_title} ({month} {report_year})</title>
  <style>
    /* ── Reset ──────────────────────────────────────────────────── */
    *, *::before, *::after {{ box-sizing:border-box; margin:0; padding:0; }}

    /* ── Page (WeasyPrint) ──────────────────────────────────────── */
    @page {{ size:A4; margin:0; }}

    body {{
      font-family: 'Segoe UI','Helvetica Neue',Arial,sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000000;
      background: #F2F0E6;
    }}

    /* ── Header ─────────────────────────────────────────────────── */
    .report-header {{
      background: linear-gradient(135deg,#060d1a 0%,#0f172a 55%,#1a2d4a 100%);
      color: #fff;
      padding: 26px 40px 20px;
      break-after: avoid;
    }}

    .header-top {{
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      padding-bottom: 13px;
      border-bottom: 1px solid rgba(255,255,255,0.10);
    }}

    .header-logo {{
      height: 50px;
      width: auto;
      object-fit: contain;
      border-radius: 6px;
    }}

    .brand-name {{
      font-size: 21pt;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 2px;
    }}

    .brand-sub {{
      font-size: 10pt;
      color: #C9A84C;
    }}

    /* ── Scope banner ───────────────────────────────────────────── */
    .scope-banner {{
      border-radius: 10px;
      display: flex;
      align-items: stretch;
      margin-bottom: 16px;
      overflow: hidden;
      box-shadow:
        0 4px 16px rgba(0,0,0,0.40),
        inset 0 1px 0 rgba(255,255,255,0.12),
        inset 0 -1px 0 rgba(0,0,0,0.25);
      border: 1px solid rgba(201,168,76,0.25);
    }}

    /* Left: gold brand stripe */
    .scope-left {{
      width: 8px;
      flex-shrink: 0;
      background: linear-gradient(to bottom,#C9A84C,#a07830);
    }}

    /* Center */
    .scope-center {{
      flex: 1;
      background: linear-gradient(105deg,
        rgba(201,168,76,0.18) 0%,
        rgba(15,23,42,0.92)  30%,
        rgba(6,13,26,0.97)   100%
      );
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 18px;
    }}

    .scope-icon {{
      font-size: 26px;
      flex-shrink: 0;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
      line-height: 1;
    }}

    .scope-label {{
      font-size: 8pt;
      color: #C9A84C;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 3px;
    }}

    .scope-title {{
      font-size: 19pt;
      font-weight: 900;
      color: #ffffff;
      line-height: 1;
      text-shadow: 0 2px 8px rgba(0,0,0,0.50);
      letter-spacing: 0.3px;
    }}

    .scope-subtitle {{
      font-size: 10pt;
      color: #94a3b8;
      margin-top: 4px;
    }}

    /* Right: decorative panel */
    .scope-right {{
      width: 52px;
      flex-shrink: 0;
      background: linear-gradient(135deg,
        rgba(201,168,76,0.15) 0%,
        rgba(201,168,76,0.04) 100%
      );
      display: flex;
      align-items: center;
      justify-content: center;
      border-left: 1px solid rgba(201,168,76,0.15);
      font-size: 22px;
      opacity: 0.30;
    }}

    /* ── Meta row ───────────────────────────────────────────────── */
    .meta-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    .period {{
      font-size: 10pt;
      color: #94a3b8;
    }}

    .index-badge {{
      background: linear-gradient(135deg,#a07830,#C9A84C);
      color: #fff;
      font-size: 10pt;
      font-weight: 700;
      padding: 7px 18px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow:
        0 2px 10px rgba(201,168,76,0.40),
        inset 0 1px 0 rgba(255,255,255,0.25);
    }}

    /* BULLISH → keep gold; NEUTRAL → amber override; BEARISH → red override */
    .badge-neutral {{ background: linear-gradient(135deg,#92400e,#f59e0b) !important; }}
    .badge-bearish  {{ background: linear-gradient(135deg,#7f1d1d,#ef4444) !important; }}

    .badge-score {{ font-size: 15pt; }}

    /* ── Watermark (absolute — WeasyPrint-safe) ─────────────────── */
    .wm-outer  {{ position: relative; }}

    .wm-layer {{
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }}

    .wm-inner {{ transform: rotate(-35deg); opacity: 0.09; }}
    .wm-inner img {{ width: 280px; filter: grayscale(15%); }}

    /* ── Report body ────────────────────────────────────────────── */
    .report-body {{
      background: #F2F0E6;
      padding: 26px 40px 34px;
      position: relative;
      z-index: 1;
    }}

    /* ── Headings ───────────────────────────────────────────────── */
    .report-body h1 {{
      font-size: 14pt;
      font-weight: 700;
      color: #000;
      margin: 22px 0 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #1e3a5f;
    }}

    .report-body h2 {{
      font-size: 12pt;
      font-weight: 600;
      color: #111;
      margin: 16px 0 6px;
    }}

    .report-body h3 {{
      font-size: 11pt;
      font-weight: 600;
      color: #222;
      margin: 12px 0 4px;
    }}

    .report-body p {{
      font-size: 11pt;
      line-height: 1.7;
      color: #000;
      margin-bottom: 10px;
      text-align: justify;
    }}

    .report-body ul,
    .report-body ol {{
      margin-left: 22px;
      margin-bottom: 10px;
    }}

    .report-body li {{
      font-size: 11pt;
      color: #000;
      margin-bottom: 4px;
      line-height: 1.6;
    }}

    .report-body strong {{ color: #000; font-weight: 700; }}

    /* ── Tables — 3D navy header, gold hover ────────────────────── */
    .report-body table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      border-radius: 10px;
      overflow: hidden;
      box-shadow:
        0 4px 16px rgba(0,0,0,0.11),
        0 1px 4px rgba(0,0,0,0.07);
      border: 1px solid rgba(30,58,95,0.18);
      margin: 14px 0;
    }}

    .report-body th {{
      background: linear-gradient(180deg,#1e3a5f 0%,#0f172a 100%);
      color: #fff;
      font-weight: 700;
      text-align: left;
      padding: 9px 12px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.30);
    }}

    .report-body td {{
      padding: 8px 12px;
      border-bottom: 1px solid rgba(30,58,95,0.10);
      color: #000;
    }}

    .report-body tr:last-child td  {{ border-bottom: none; }}
    .report-body tr:nth-child(even) td {{
      background: rgba(30,58,95,0.04);
    }}
    .report-body tr:hover td {{
      background: rgba(201,168,76,0.07);
    }}

    /* ── KPI block (agent can emit via special class in markdown) ── */
    /* If the agent wraps a table in a div.kpi-grid, it renders as    */
    /* card layout instead of standard table. Standard tables without */
    /* that wrapper render normally above.                            */

    /* ── Footer ─────────────────────────────────────────────────── */
    .report-footer {{
      background: linear-gradient(135deg,#dedad0 0%,#e8e6d8 100%);
      border-top: 2px solid #1e3a5f;
      padding: 12px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.50);
    }}

    .footer-left {{
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 9pt;
      color: #444;
    }}

    .footer-robot  {{ height: 28px; width: auto; object-fit: contain; }}
    .footer-brand  {{ font-weight: 700; color: #1e3a5f; }}
    .footer-italic {{ font-style: italic; color: #666; }}

    .footer-link {{
      font-size: 9pt;
      font-weight: 700;
      color: #a07830;
      text-decoration: none;
      border-bottom: 1px solid rgba(160,120,48,0.40);
    }}

    /* ── Print ──────────────────────────────────────────────────── */
    @media print {{
      body {{ background: #F2F0E6; }}
      .report-header {{ break-after: avoid; }}
    }}
  </style>
</head>
<body>

<!--
  SmartMove Real Estate Intelligence | smartmove.me
  Report: {report_title} | Period: {month} {report_year}
  Generated by SmartMove AI Analytics Agent.
  Unauthorised reproduction is prohibited.
-->

<!-- Invisible Unicode brand watermark (zero-width characters) -->
<span style="position:absolute;left:-9999px;font-size:0;line-height:0;opacity:0;user-select:none;"
      aria-hidden="true">{_BRAND_WATERMARK}</span>

<!-- ── Header ────────────────────────────────────────── -->
<div class="report-header">
  <div class="header-top">
    <img src="SMARTMOVE_LOGO_PLACEHOLDER"
         alt="SmartMove logo"
         class="header-logo">
    <div>
      <div class="brand-name">SmartMove</div>
      <div class="brand-sub">Real Estate Intelligence Platform</div>
    </div>
  </div>

  <div class="scope-banner">
    <div class="scope-left"></div>
    <div class="scope-center">
      <div class="scope-icon">{scope_icon}</div>
      <div>
        <div class="scope-label">Report Scope</div>
        <div class="scope-title">{scope_title.upper()}</div>
        <div class="scope-subtitle">{scope_subtitle}</div>
      </div>
    </div>
    <div class="scope-right">&#9672;</div>
  </div>

  <div class="meta-row">
    <div class="period">Executive Summary &mdash; {month} {report_year}</div>
    <div class="index-badge{' badge-neutral' if 40 <= smartmove_index < 70 else ' badge-bearish' if smartmove_index < 40 else ''}">
      <span class="badge-score">{smartmove_index}</span>
      SmartMove Index&trade; &mdash; {label}
    </div>
  </div>
</div>

<!-- ── Body + Watermark ───────────────────────────────── -->
<div class="wm-outer">
  <div class="wm-layer">
    <div class="wm-inner">
      <img src="SMARTMOVE_LOGO_PLACEHOLDER" alt="">
    </div>
  </div>
  <div class="report-body">
    {ai_html}
  </div>
</div>

<!-- ── Footer ────────────────────────────────────────── -->
<div class="report-footer">
  <div class="footer-left">
    <img src="SMARTMOVE_ROBOT_PLACEHOLDER"
         alt="SmartMove AI assistant"
         class="footer-robot">
    <span>
      <span class="footer-brand">SmartMove</span>
      <span class="footer-italic"> Real Estate Intelligence</span>
      &nbsp;&middot;&nbsp; {month} {report_year}
      &nbsp;&middot;&nbsp; AI-generated analysis &mdash; supplementary guidance only
    </span>
  </div>
  <a class="footer-link" href="https://smartmove.me">smartmove.me &#x2197;</a>
</div>

</body>
</html>"""