"use client";

import { useEffect, useState } from "react";
import { GuestLayout } from "@/components/guest/GuestLayout";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "data-collection", label: "Data Collection" },
  { id: "data-usage", label: "Data Usage" },
  { id: "data-security", label: "Data Security" },
  { id: "user-rights", label: "User Rights" },
  { id: "cookies", label: "Cookie Policy" },
  { id: "contact", label: "Contact Privacy" },
];

export default function PrivacyPage() {
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    SECTIONS.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 90; // account for fixed header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      setActiveId(id);
    }
  };

  return (
    <GuestLayout>
      <PrivacyCSS />
      <div className="pr-wrapper">
        
        {/* Header Hero */}
        <header className="pr-hero">
          <div className="g-tag">Legal &amp; Privacy</div>
          <h1 className="pr-hero-h1">Privacy Policy</h1>
          <p className="pr-hero-sub">
            Last Updated: May 26, 2026. Learn how we collect, store, and safeguard your data.
          </p>
        </header>

        <div className="pr-container">
          {/* Mobile TOC Select */}
          <div className="pr-mobile-toc">
            <label htmlFor="toc-select">Navigate Policy:</label>
            <select
              id="toc-select"
              value={activeId}
              onChange={(e) => handleScrollTo(e.target.value)}
            >
              {SECTIONS.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.label}
                </option>
              ))}
            </select>
          </div>

          {/* Left Sticky Sidebar */}
          <aside className="pr-sidebar">
            <nav className="pr-toc">
              <div className="pr-toc-title">Table of Contents</div>
              <ul className="pr-toc-list">
                {SECTIONS.map((sec) => (
                  <li key={sec.id}>
                    <button
                      className={`pr-toc-btn ${activeId === sec.id ? "pr-toc-btn--active" : ""}`}
                      onClick={() => handleScrollTo(sec.id)}
                    >
                      {sec.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Right Scrolling Content */}
          <main className="pr-content">
            
            <section id="overview" className="pr-section">
              <h2 className="pr-heading">1. Overview</h2>
              <p>
                SmartMove (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the real estate intelligence portal. We are committed to protecting your personal data and ensuring that your privacy is respected. This Privacy Policy details our practices regarding the collection, use, and disclosure of information when you access our public pages or subscribe to our analytical portals.
              </p>
              <p>
                By registering an account or browsing our landing page, you agree to the collection and use of information in accordance with this policy. All data processed on our platform is stored securely using Microsoft Azure server clusters with encryption active at all times.
              </p>
            </section>

            <section id="data-collection" className="pr-section">
              <h2 className="pr-heading">2. Data Collection</h2>
              <p>
                To provide you with our conversational AI analyst (MoveIQ) and self-service dashboards, we gather information under the following categories:
              </p>
              <ul>
                <li>
                  <strong>Account Identification:</strong> When registering, you provide your name, professional email address, and authentication credentials.
                </li>
                <li>
                  <strong>Workspace Uploads:</strong> When utilizing the Cloud Workspace, you upload custom CSV files. These datasets are kept strictly isolated and are only processed to compile custom charts.
                </li>
                <li>
                  <strong>AI Dialogues:</strong> Any text prompts sent to our MoveIQ AI analyst are recorded to return accurate answers and improve query response accuracy. We never sell your prompts.
                </li>
                <li>
                  <strong>System Metadata:</strong> Standard technical information such as IP address, browser type, operating system, and system performance metrics are tracked for maintenance.
                </li>
              </ul>
            </section>

            <section id="data-usage" className="pr-section">
              <h2 className="pr-heading">3. Data Usage</h2>
              <p>
                We do not sell or lease user information. All captured data is processed only to support core operations, including:
              </p>
              <ul>
                <li>Validating, cleansing, and compiling charts from your uploaded CSV files.</li>
                <li>Answering real estate investment queries via our conversational engine.</li>
                <li>Processing weekly or monthly PDF report deliveries (AutoReport).</li>
                <li>Monitoring system health to prevent service interruption or malicious attempts.</li>
                <li>Confirming billing permissions and subscription roles.</li>
              </ul>
            </section>

            <section id="data-security" className="pr-section">
              <h2 className="pr-heading">4. Data Security</h2>
              <p>
                SmartMove employs enterprise-grade infrastructure built on Microsoft Azure. All communications between your browser and our backend are secured via TLS 1.3 encryption. At-rest storage uses industry-standard AES-256 managed keys.
              </p>
              <p>
                We implement role-based access controls (RBAC) internally, meaning only authorized processes and staff can access data assets. Regular penetration tests and security audits are conducted to detect vulnerabilities.
              </p>
            </section>

            <section id="user-rights" className="pr-section">
              <h2 className="pr-heading">5. User Rights (GDPR &amp; Global Compliance)</h2>
              <p>
                Under global standards including the General Data Protection Regulation (GDPR), you hold the following rights regarding your data:
              </p>
              <ul>
                <li><strong>Access and Export:</strong> You can download copies of your uploaded datasets and account logs from your profile page.</li>
                <li><strong>Correction:</strong> You can update inaccurate registration details immediately through the user dashboard.</li>
                <li><strong>Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> You can request the deletion of your account and workspace directories at any time. We will wipe all records within 30 days.</li>
                <li><strong>Restriction:</strong> You can withdraw consent for telemetry logging or analytical cookies.</li>
              </ul>
            </section>

            <section id="cookies" className="pr-section">
              <h2 className="pr-heading">6. Cookie Policy</h2>
              <p>
                We use cookies to maintain your authentication state and remember configuration choices (such as preferred markets).
              </p>
              <ul>
                <li><strong>Essential Cookies:</strong> Required to keep you logged in and manage secure session tokens.</li>
                <li><strong>Analytical Cookies:</strong> Help us monitor loading times, dashboard load speeds, and interface usage. These collect anonymized metadata.</li>
              </ul>
              <p>
                You can manage cookie settings directly in your browser or toggle options on our footer cookies panel.
              </p>
            </section>

            <section id="contact" className="pr-section">
              <h2 className="pr-heading">7. Contact Privacy</h2>
              <p>
                If you have questions about this Privacy Policy, wish to exercise your rights, or have queries about how your CSV data is handled, contact our privacy department:
              </p>
              <div className="pr-contact-card">
                <strong>SmartMove Privacy Officer</strong><br />
                Email: <a href="mailto:privacy@smartmove.com">privacy@smartmove.com</a>
              </div>
            </section>

          </main>
        </div>
      </div>
    </GuestLayout>
  );
}

function PrivacyCSS() {
  return (
    <style>{`
      /* ══ WRAPPER & CONTAINER ══════════════════════════════════════ */
      .pr-wrapper {
        background: var(--ui-surface-page);
        color: var(--ui-content-primary);
        font-family: var(--ui-font-base);
        line-height: 1.8;
        padding-bottom: 100px;
      }
      .pr-hero {
        max-width: 1200px;
        margin: 0 auto;
        padding: 100px 40px 48px;
        border-bottom: 1px solid var(--ui-border-subtle);
      }
      .pr-hero-h1 {
        font-family: var(--ui-font-logo);
        font-size: clamp(32px, 5vw, 52px);
        font-weight: 700;
        color: var(--ui-content-strong);
        margin: 16px 0 8px;
        line-height: 1.1;
      }
      .pr-hero-sub {
        font-size: 16px;
        color: var(--ui-content-secondary);
        max-width: 600px;
      }

      .pr-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 48px 40px;
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 64px;
        align-items: start;
      }

      /* ══ SIDEBAR TOC ══════════════════════════════════════════════ */
      .pr-sidebar {
        position: sticky;
        top: 100px;
        align-self: start;
      }
      .pr-toc {
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 12px;
        padding: 24px;
        box-shadow: var(--ui-shadow-card);
      }
      .pr-toc-title {
        font-family: var(--ui-font-logo);
        font-weight: 700;
        font-size: 15px;
        color: var(--ui-content-strong);
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--ui-border-subtle);
      }
      .pr-toc-list {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pr-toc-btn {
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13.5px;
        color: var(--ui-content-muted);
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: var(--ui-font-base);
        font-weight: 500;
      }
      .pr-toc-btn:hover {
        color: var(--ui-content-primary);
        background: var(--ui-surface-muted);
      }
      .pr-toc-btn--active {
        color: var(--ui-brand-primary) !important;
        background: color-mix(in srgb, var(--ui-brand-primary) 8%, transparent);
        font-weight: 600;
      }

      /* ══ CONTENT AREA ═════════════════════════════════════════════ */
      .pr-content {
        display: flex;
        flex-direction: column;
        gap: 56px;
      }
      .pr-section {
        scroll-margin-top: 100px;
      }
      .pr-heading {
        font-family: var(--ui-font-logo);
        font-size: 22px;
        font-weight: 700;
        color: var(--ui-content-strong);
        margin-bottom: 18px;
      }
      .pr-content p {
        font-size: 15px;
        color: var(--ui-content-secondary);
        margin-bottom: 16px;
      }
      .pr-content ul {
        list-style-type: none;
        padding-left: 0;
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .pr-content li {
        font-size: 14.5px;
        color: var(--ui-content-secondary);
        position: relative;
        padding-left: 20px;
      }
      .pr-content li::before {
        content: "•";
        color: var(--ui-brand-primary);
        font-weight: bold;
        position: absolute;
        left: 0;
        top: -1px;
        font-size: 18px;
      }
      .pr-content strong {
        color: var(--ui-content-strong);
      }

      .pr-contact-card {
        margin-top: 20px;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 8px;
        padding: 20px;
        font-size: 14px;
        color: var(--ui-content-secondary);
      }
      .pr-contact-card a {
        color: var(--ui-brand-secondary);
        text-decoration: underline;
      }

      /* Mobile dropdown navigation */
      .pr-mobile-toc {
        display: none;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        padding: 16px;
        border-radius: 12px;
        margin-bottom: 24px;
        align-items: center;
        gap: 12px;
      }
      .pr-mobile-toc label {
        font-size: 13px;
        font-weight: 600;
        color: var(--ui-content-primary);
      }
      .pr-mobile-toc select {
        flex: 1;
        background: var(--ui-surface-muted);
        border: 1px solid var(--ui-border-subtle);
        color: var(--ui-content-strong);
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
      }

      /* ══ RESPONSIVE STYLING ═══════════════════════════════════════ */
      @media (max-width: 900px) {
        .pr-container {
          grid-template-columns: 1fr;
          gap: 24px;
          padding: 32px 24px;
        }
        .pr-hero {
          padding: 100px 24px 32px;
        }
        .pr-sidebar {
          display: none;
        }
        .pr-mobile-toc {
          display: flex;
        }
        .pr-content {
          gap: 40px;
        }
      }
    `}</style>
  );
}
