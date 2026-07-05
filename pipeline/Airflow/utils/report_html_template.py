"""
SmartMove — HTML Report Template Renderer
==========================================
Converts the AI-generated Markdown executive summary into a fully styled
HTML document suitable for WeasyPrint PDF conversion.

Three region themes are built in and auto-selected via the `region` parameter:
  - "Dubai"   → UAE flag colours (green #009A44, red #EF3340, black)
  - "Egypt"   → Egyptian flag colours (red #CE1126, white, black + gold eagle)
  - "England" → St George's Cross colours (navy #012169, red #CF142B)

Usage
-----
    from utils.report_html_template import render_report_html

    html = render_report_html(
        region="Dubai",
        report_month=5,
        report_year=2026,
        smartmove_index=78.4,
        ai_markdown="# Market Overview\\n...",
    )

Image assets
------------
Replace the two placeholder strings before passing to WeasyPrint:

    import base64

    def _b64(path, mime="image/jpeg"):
        data = base64.b64encode(open(path, "rb").read()).decode()
        return f"data:{mime};base64,{data}"

    html = render_report_html(...)
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

    These characters are:
    - Invisible to the human eye in rendered HTML / PDF
    - Preserved by copy-paste and DOM-reading tools (AI assistants,
      search crawlers, clipboard analysers, screen readers)
    - Embedded in the text layer — readable by any raw-Unicode inspector
    """
    bits = "".join(format(ord(c), "08b") for c in text)
    return bits.replace("0", "\u200B").replace("1", "\u200C")


_BRAND_WATERMARK = _zwc_watermark(
    "SmartMove Real Estate Intelligence | smartmove.me | "
    "AI-Powered Property Analytics | Dubai, Egypt & England Markets"
)


# ── Region theme definitions ───────────────────────────────────────────────────
_THEMES: dict[str, dict] = {

    # ── DUBAI ─────────────────────────────────────────────────────────────────
    "dubai": {
        "display_name":        "DUBAI",
        "region_sub":          "United Arab Emirates &nbsp;&middot;&nbsp; Residential Market",
        "brand_sub_color":     "#6ee7b7",
        "period_color":        "#a7f3d0",
        "label_color":         "#86efac",
        "sub_color":           "#a7f3d0",
        "link_color":          "#009A44",
        "footer_brand_color":  "#009A44",
        "footer_bg":           "linear-gradient(135deg,#dedad0 0%,#e8e6d8 100%)",
        "footer_border":       "#009A44",

        # Header
        "hdr_gradient": "linear-gradient(135deg,#051a0f 0%,#0a2e1a 60%,#0d3d22 100%)",

        # UAE flag: vertical red bar left + horizontal Green/White/Black bands
        "flag_html": """
            <div style="display:flex;flex-direction:row;width:60px;flex-shrink:0;">
              <div style="width:20px;background:#EF3340;"></div>
              <div style="display:flex;flex-direction:column;flex:1;">
                <div style="flex:1;background:#009A44;"></div>
                <div style="flex:1;background:#f5f5f5;"></div>
                <div style="flex:1;background:#111111;"></div>
              </div>
            </div>""",

        # Banner
        "banner_gradient": (
            "linear-gradient(105deg,"
            "rgba(0,154,68,0.55) 0%,rgba(10,46,26,0.85) 35%,"
            "rgba(10,30,20,0.92) 65%,rgba(239,51,64,0.35) 100%)"
        ),
        "banner_right_bg": "linear-gradient(to bottom,#EF3340,#b91c2e)",

        # Badge
        "badge_bg":     "linear-gradient(135deg,#047857,#009A44)",
        "badge_shadow": "0 2px 8px rgba(0,154,68,0.40),inset 0 1px 0 rgba(255,255,255,0.20)",
        "badge_border": "none",

        # Accents
        "accent":             "#009A44",
        "accent_dark":        "#007a36",
        "accent_alpha10":     "rgba(0,154,68,0.10)",
        "accent_alpha20":     "rgba(0,154,68,0.20)",
        "accent_alpha25":     "rgba(0,154,68,0.25)",
        "kpi_stripe":         "linear-gradient(90deg,#009A44,#047857)",
        "th_bg":              "linear-gradient(180deg,#009A44 0%,#007a36 100%)",
        "table_border":       "rgba(0,154,68,0.18)",
        "table_row_even":     "rgba(0,154,68,0.06)",
        "tab_active_color":   "#009A44",
        "tab_border_alpha":   "rgba(0,154,68,0.22)",
    },

    # ── EGYPT ─────────────────────────────────────────────────────────────────
    "egypt": {
        "display_name":        "EGYPT",
        "region_sub":          "Arab Republic of Egypt &nbsp;&middot;&nbsp; Residential Market",
        "brand_sub_color":     "#fca5a5",
        "period_color":        "#fca5a5",
        "label_color":         "#fca5a5",
        "sub_color":           "#fca5a5",
        "link_color":          "#CE1126",
        "footer_brand_color":  "#CE1126",
        "footer_bg":           "linear-gradient(135deg,#dedad0 0%,#e8e6d8 100%)",
        "footer_border":       "#CE1126",

        "hdr_gradient": "linear-gradient(135deg,#1a0305 0%,#3d0a0e 60%,#5a0f14 100%)",

        # Egypt flag: horizontal Red / White (eagle) / Black bands
        "flag_html": """
            <div style="display:flex;flex-direction:column;width:60px;flex-shrink:0;">
              <div style="flex:1;background:#CE1126;"></div>
              <div style="flex:1;background:#f5f5f5;display:flex;align-items:center;justify-content:center;">
                <img src="SMARTMOVE_EAGLE_PLACEHOLDER" style="height:14px; width:auto; opacity:0.9;" alt="Eagle">
              </div>
              <div style="flex:1;background:#111111;"></div>
            </div>""",

        "banner_gradient": (
            "linear-gradient(105deg,"
            "rgba(206,17,38,0.60) 0%,rgba(61,10,14,0.88) 35%,"
            "rgba(26,3,5,0.94) 65%,rgba(0,0,0,0.70) 100%)"
        ),
        "banner_right_bg": "linear-gradient(to bottom,#111111,#333333)",

        "badge_bg":     "linear-gradient(135deg,#9b0e1e,#CE1126)",
        "badge_shadow": "0 2px 8px rgba(206,17,38,0.45),inset 0 1px 0 rgba(255,255,255,0.20)",
        "badge_border": "none",

        "accent":             "#CE1126",
        "accent_dark":        "#9b0e1e",
        "accent_alpha10":     "rgba(206,17,38,0.10)",
        "accent_alpha20":     "rgba(206,17,38,0.20)",
        "accent_alpha25":     "rgba(206,17,38,0.25)",
        "kpi_stripe":         "linear-gradient(90deg,#CE1126,#9b0e1e)",
        "th_bg":              "linear-gradient(180deg,#CE1126 0%,#9b0e1e 100%)",
        "table_border":       "rgba(206,17,38,0.18)",
        "table_row_even":     "rgba(206,17,38,0.05)",
        "tab_active_color":   "#CE1126",
        "tab_border_alpha":   "rgba(206,17,38,0.22)",
    },

    # ── ENGLAND ───────────────────────────────────────────────────────────────
    "england": {
        "display_name":        "ENGLAND",
        "region_sub":          "United Kingdom &nbsp;&middot;&nbsp; Residential Market",
        "brand_sub_color":     "#93c5fd",
        "period_color":        "#93c5fd",
        "label_color":         "#93c5fd",
        "sub_color":           "#93c5fd",
        "link_color":          "#012169",
        "footer_brand_color":  "#012169",
        "footer_bg":           "linear-gradient(135deg,#dedad0 0%,#e8e6d8 100%)",
        "footer_border":       "#012169",

        "hdr_gradient": "linear-gradient(135deg,#010d2e 0%,#012169 60%,#01287a 100%)",

        # England: St George's Cross rendered via CSS grid
        "flag_html": """
            <div style="
              width:68px;flex-shrink:0;background:#ffffff;
              display:grid;
              grid-template-columns:1fr 10px 1fr;
              grid-template-rows:1fr 10px 1fr;">
              <div style="background:#fff;"></div>
              <div style="background:#CF142B;grid-row:1/-1;"></div>
              <div style="background:#fff;"></div>
              <div style="background:#CF142B;grid-column:1/-1;"></div>
              <div style="background:#fff;"></div>
              <div style="background:#CF142B;grid-row:1/-1;"></div>
              <div style="background:#fff;"></div>
            </div>""",

        "banner_gradient": (
            "linear-gradient(105deg,"
            "rgba(1,33,105,0.75) 0%,rgba(1,20,65,0.92) 40%,"
            "rgba(1,13,46,0.96) 65%,rgba(207,20,43,0.30) 100%)"
        ),
        "banner_right_bg": "linear-gradient(to bottom,#CF142B,#9a0f1f)",

        "badge_bg":     "linear-gradient(135deg,#010d2e,#012169)",
        "badge_shadow": "0 2px 8px rgba(1,33,105,0.50),inset 0 1px 0 rgba(255,255,255,0.20)",
        "badge_border": "1px solid rgba(207,20,43,0.50)",

        "accent":             "#012169",
        "accent_dark":        "#010d2e",
        "accent_alpha10":     "rgba(1,33,105,0.10)",
        "accent_alpha20":     "rgba(1,33,105,0.20)",
        "accent_alpha25":     "rgba(1,33,105,0.25)",
        # Navy left 60% + red right 40% stripe on KPI cards
        "kpi_stripe":         "linear-gradient(90deg,#012169 60%,#CF142B 60%)",
        "th_bg":              "linear-gradient(180deg,#012169 0%,#010d2e 100%)",
        "table_border":       "rgba(1,33,105,0.18)",
        "table_row_even":     "rgba(1,33,105,0.05)",
        "tab_active_color":   "#012169",
        "tab_border_alpha":   "rgba(1,33,105,0.22)",
    },
}

# Aliases
_ALIASES = {
    "uae":                    "dubai",
    "united arab emirates":   "dubai",
    "arab republic of egypt": "egypt",
    "uk":                     "england",
    "united kingdom":         "england",
    "britain":                "england",
    "great britain":          "england",
}

_MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _resolve_theme(region: str) -> dict:
    key = region.strip().lower()
    key = _ALIASES.get(key, key)
    if key not in _THEMES:
        # Graceful fallback: Dubai theme, custom name
        t = dict(_THEMES["dubai"])
        t["display_name"] = region.upper()
        t["region_sub"] = f"{region} &nbsp;&middot;&nbsp; Residential Market"
        return t
    return _THEMES[key]


def _index_label(score: float) -> str:
    if score >= 70:
        return "BULLISH"
    if score >= 40:
        return "NEUTRAL"
    return "BEARISH"


def render_report_html(
    region: str,
    report_month: int,
    report_year: int,
    smartmove_index: float,
    ai_markdown: str,
) -> str:
    """
    Render a complete HTML report page from AI-generated Markdown.

    Parameters
    ----------
    region : str
        "Dubai", "Egypt", or "England" (case-insensitive).
        Unknown regions fall back to the Dubai theme.
    report_month : int
        Reporting month 1-12.
    report_year : int
        Reporting year.
    smartmove_index : float
        Composite market health score 0-100.
    ai_markdown : str
        Markdown executive summary from the LLM.

    Returns
    -------
    str
        Complete HTML document with SMARTMOVE_LOGO_PLACEHOLDER and
        SMARTMOVE_ROBOT_PLACEHOLDER strings that must be replaced with
        base64 data URIs or file:// paths before passing to WeasyPrint.
    """
    t = _resolve_theme(region)
    month = _MONTH_NAMES[report_month]
    ai_html = _md.markdown(
        ai_markdown,
        extensions=["tables", "fenced_code", "toc"],
    )
    label = _index_label(smartmove_index)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <!-- SmartMove Real Estate Intelligence | smartmove.me -->
  <meta name="author"      content="SmartMove Real Estate Intelligence">
  <meta name="generator"   content="SmartMove Analytics Engine | smartmove.me">
  <meta name="description" content="SmartMove AI-powered real estate market intelligence — {region}, {month} {report_year}">
  <meta property="og:site_name" content="SmartMove Real Estate Intelligence">
  <title>SmartMove — {region} Executive Summary ({month} {report_year})</title>
  <style>
    /* ── Reset ──────────────────────────────────────────────────── */
    *, *::before, *::after {{ box-sizing:border-box; margin:0; padding:0; }}

    /* ── Page (WeasyPrint) ──────────────────────────────────────── */
    @page {{ size:A4; margin:0; }}

    body {{
      font-family: 'Segoe UI','Helvetica Neue',Arial,sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      background: #F2F0E6;
    }}

    /* ── Header ─────────────────────────────────────────────────── */
    .report-header {{
      background: {t['hdr_gradient']};
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
      color: #fff;
      margin-bottom: 2px;
    }}

    .brand-sub {{
      font-size: 10pt;
      color: {t['brand_sub_color']};
    }}

    /* ── Region banner ──────────────────────────────────────────── */
    .region-banner {{
      border-radius: 10px;
      display: flex;
      align-items: stretch;
      margin-bottom: 16px;
      overflow: hidden;
      box-shadow:
        0 4px 16px rgba(0,0,0,0.45),
        inset 0 1px 0 rgba(255,255,255,0.15),
        inset 0 -1px 0 rgba(0,0,0,0.30);
      border: 1px solid rgba(255,255,255,0.08);
    }}

    .region-center {{
      flex: 1;
      background: {t['banner_gradient']};
      padding: 12px 18px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }}

    .region-label {{
      font-size: 8pt;
      color: {t['label_color']};
      letter-spacing: 2.5px;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 4px;
    }}

    .region-name {{
      font-size: 20pt;
      font-weight: 900;
      color: #fff;
      line-height: 1;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.50);
    }}

    .region-sub {{
      font-size: 10pt;
      color: {t['sub_color']};
      margin-top: 4px;
      opacity: 0.85;
    }}

    .region-right {{
      width: 10px;
      background: {t['banner_right_bg']};
      box-shadow: inset -2px 0 4px rgba(0,0,0,0.30);
    }}

    /* ── Meta row ───────────────────────────────────────────────── */
    .meta-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    .period {{
      font-size: 10pt;
      color: {t['period_color']};
    }}

    .index-badge {{
      background: {t['badge_bg']};
      color: #fff;
      font-size: 10pt;
      font-weight: 700;
      padding: 7px 18px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: {t['badge_shadow']};
      border: {t['badge_border']};
    }}

    .badge-score {{ font-size: 15pt; }}

    /* ── Watermark (absolute — WeasyPrint-safe) ─────────────────── */
    .wm-outer   {{ position: relative; }}

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

    .wm-inner {{
      transform: rotate(-35deg);
      opacity: 0.09;
    }}

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
      border-bottom: 2px solid {t['accent']};
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

    /* ── Tables ─────────────────────────────────────────────────── */
    .report-body table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      border-radius: 10px;
      overflow: hidden;
      box-shadow:
        0 4px 16px rgba(0,0,0,0.11),
        0 1px 4px rgba(0,0,0,0.07);
      border: 1px solid {t['table_border']};
      margin: 14px 0;
    }}

    .report-body th {{
      background: {t['th_bg']};
      color: #fff;
      font-weight: 700;
      text-align: left;
      padding: 9px 12px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.30);
    }}

    .report-body td {{
      padding: 8px 12px;
      border-bottom: 1px solid {t['accent_alpha20']};
      color: #000;
    }}

    .report-body tr:last-child td  {{ border-bottom: none; }}
    .report-body tr:nth-child(even) td {{ background: {t['table_row_even']}; }}

    /* ── Footer ─────────────────────────────────────────────────── */
    .report-footer {{
      background: {t['footer_bg']};
      border-top: 2px solid {t['footer_border']};
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
    .footer-brand  {{ font-weight: 700; color: {t['footer_brand_color']}; }}
    .footer-italic {{ font-style: italic; color: #666; }}

    .footer-link {{
      font-size: 9pt;
      font-weight: 700;
      color: {t['link_color']};
      text-decoration: none;
      border-bottom: 1px solid {t['accent_alpha25']};
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
  Region: {region} | Period: {month} {report_year}
  Generated by SmartMove Analytics Engine.
  Unauthorised reproduction is prohibited.
-->

<!-- Invisible Unicode brand watermark (zero-width chars) -->
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

  <div class="region-banner">
    {t['flag_html']}
    <div class="region-center">
      <div class="region-label">Market Region</div>
      <div class="region-name">{t['display_name']}</div>
      <div class="region-sub">{t['region_sub']}</div>
    </div>
    <div class="region-right"></div>
  </div>

  <div class="meta-row">
    <div class="period">Executive Summary &mdash; {month} {report_year}</div>
    <div class="index-badge">
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
