"use client";

import React from "react";
import { GuestLayout } from "@/components/guest/GuestLayout";

export default function CookiesPage() {
  return (
    <GuestLayout>
      <CookiesCSS />
      <div className="ck-wrapper">
        <header className="ck-hero">
          <div className="g-tag">Security &amp; Storage</div>
          <h1 className="ck-hero-h1">Cookie Policy</h1>
          <p className="ck-hero-sub">
            Learn about how SmartMove utilizes secure HttpOnly state, CSRF tokens, and client preferences to deliver a protected and responsive experience.
          </p>
        </header>

        <div className="ck-container">
          <main className="ck-content">
            <section className="ck-section">
              <h2 className="ck-heading">Secure Token Architecture</h2>
              <p>
                Unlike generic platforms that store authentication in raw browser scripts, SmartMove implements a strict token system using cryptographically signed cookies. This ensures your authorization tokens cannot be accessed, read, or modified by unauthorized client-side scripts.
              </p>
              
              <div className="ck-table-wrapper">
                <table className="ck-table">
                  <thead>
                    <tr>
                      <th>Cookie Name</th>
                      <th>Purpose</th>
                      <th>Security Flags</th>
                      <th>Lifespan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>access_token</code></td>
                      <td>Primary JWT token utilized to authenticate API requests.</td>
                      <td><span className="badge-secure">HttpOnly</span> <span className="badge-secure">Secure</span> <span className="badge-same">SameSite=Lax</span></td>
                      <td>Short-lived</td>
                    </tr>
                    <tr>
                      <td><code>refresh_token</code></td>
                      <td>Token used to silently renew your access token when it expires.</td>
                      <td><span className="badge-secure">HttpOnly</span> <span className="badge-secure">Secure</span> <span className="badge-same">SameSite=Lax</span></td>
                      <td>Long-lived</td>
                    </tr>
                    <tr>
                      <td><code>csrftoken</code></td>
                      <td>Prevents Cross-Site Request Forgery (CSRF) exploits on mutable endpoints.</td>
                      <td><span className="badge-secure">Secure</span> <span className="badge-same">SameSite=Lax</span></td>
                      <td>Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="ck-section">
              <h2 className="ck-heading">Local Preferences (localStorage)</h2>
              <p>
                We do not track you across the web. To enhance usability and prevent layout resetting, we store basic ui states directly in your browser&apos;s local storage:
              </p>
              <ul>
                <li>
                  <strong>smartmove-country:</strong> Remembers your active country environment (e.g., London, Dubai, Cairo) so that the correct currency, indicators, and thematic atmosphere load seamlessly.
                </li>
                <li>
                  <strong>smartmove-region:</strong> Keeps your active dataset region synchronized across the analytics portals.
                </li>
                <li>
                  <strong>smartmove-theme:</strong> Saves your selection of dark or light visual interface styles.
                </li>
              </ul>
            </section>

            <section className="ck-section">
              <h2 className="ck-heading">Why We Leverage HttpOnly Flags</h2>
              <p>
                By applying the <code>HttpOnly</code> attribute to our session cookies, the browser blocks standard JavaScript calls (like <code>document.cookie</code>) from reading them. This forms a foundational barrier against Cross-Site Scripting (XSS) attacks, keeping your workspace session and database uploads safe.
              </p>
            </section>
          </main>
        </div>
      </div>
    </GuestLayout>
  );
}

function CookiesCSS() {
  return (
    <style>{`
      .ck-wrapper {
        background: var(--ui-surface-page);
        color: var(--ui-content-primary);
        font-family: var(--ui-font-base);
        line-height: 1.8;
        padding-bottom: 100px;
      }
      .ck-hero {
        max-width: 1200px;
        margin: 0 auto;
        padding: 100px 40px 48px;
        border-bottom: 1px solid var(--ui-border-subtle);
      }
      .ck-hero-h1 {
        font-family: var(--ui-font-logo);
        font-size: clamp(32px, 5vw, 52px);
        font-weight: 700;
        color: var(--ui-content-strong);
        margin: 16px 0 8px;
        line-height: 1.1;
      }
      .ck-hero-sub {
        font-size: 16px;
        color: var(--ui-content-secondary);
        max-width: 600px;
      }

      .ck-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 48px 40px;
      }
      .ck-content {
        display: flex;
        flex-direction: column;
        gap: 56px;
      }
      .ck-section {
        max-width: 800px;
      }
      .ck-heading {
        font-family: var(--ui-font-logo);
        font-size: 22px;
        font-weight: 700;
        color: var(--ui-content-strong);
        margin-bottom: 18px;
      }
      .ck-content p {
        font-size: 15px;
        color: var(--ui-content-secondary);
        margin-bottom: 16px;
      }
      .ck-content ul {
        list-style-type: none;
        padding-left: 0;
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .ck-content li {
        font-size: 14.5px;
        color: var(--ui-content-secondary);
        position: relative;
        padding-left: 20px;
      }
      .ck-content li::before {
        content: "•";
        color: var(--ui-brand-primary);
        font-weight: bold;
        position: absolute;
        left: 0;
        top: -1px;
        font-size: 18px;
      }
      .ck-content strong {
        color: var(--ui-content-strong);
      }

      .ck-table-wrapper {
        margin-top: 24px;
        border: 1px solid var(--ui-border-subtle);
        border-radius: 12px;
        overflow: hidden;
        background: var(--ui-surface-card);
      }
      .ck-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 14px;
      }
      .ck-table th, .ck-table td {
        padding: 16px 20px;
        border-bottom: 1px solid var(--ui-border-subtle);
      }
      .ck-table th {
        background: var(--ui-surface-muted);
        color: var(--ui-content-strong);
        font-weight: 600;
      }
      .ck-table td {
        color: var(--ui-content-secondary);
      }
      .ck-table code {
        background: var(--ui-surface-muted);
        padding: 4px 6px;
        border-radius: 4px;
        font-size: 13px;
        color: var(--ui-brand-primary);
      }
      .badge-secure {
        display: inline-block;
        background: rgba(16, 216, 121, 0.12);
        color: #10d879;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        margin-right: 4px;
        text-transform: uppercase;
      }
      .badge-same {
        display: inline-block;
        background: rgba(59, 130, 246, 0.12);
        color: #3b82f6;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
      }

      @media (max-width: 768px) {
        .ck-container {
          padding: 32px 24px;
        }
        .ck-hero {
          padding: 100px 24px 32px;
        }
        .ck-table th, .ck-table td {
          padding: 12px 14px;
        }
      }
    `}</style>
  );
}
