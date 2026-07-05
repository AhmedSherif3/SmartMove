"use client";
/* eslint-disable react-hooks/set-state-in-effect */

/**
 * GuestLayout.tsx — SmartMove Guest Portal
 * Auth-aware header + footer for all public pages.
 */

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/session";
import { normalizeRole } from "@/components/layout/DashboardLayoutParts";
import Footer from "@/components/layout/Footer";

interface GuestLayoutProps {
  children: ReactNode;
  isAuthenticated?: boolean;
  dashboardPath?: string;
}

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Markets", href: "/#markets" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];


export function GuestLayout({
  children,
  isAuthenticated,
  dashboardPath = "/dashboard",
}: GuestLayoutProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [authed, setAuthed] = useState(Boolean(isAuthenticated));
  const [portalPath, setPortalPath] = useState(dashboardPath);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      setAuthed(true);
      setPortalPath(`/${normalizeRole(session.role)}`);
    } else {
      setAuthed(Boolean(isAuthenticated));
    }
  }, [isAuthenticated]);

  const headerCta = useMemo(
    () =>
      authed
        ? { label: "Back to Portal", href: portalPath }
        : { label: "Login", href: "/authentication/login" },
    [authed, portalPath],
  );

  return (
    <div className="g-portal" style={{ background: "var(--ui-surface-page)", minHeight: "100vh" }}>
      <GuestCSS />

      {authed && !bannerDismissed && (
        <div className="g-auth-banner">
          <span>
            You&apos;re viewing a public page. <a href={portalPath}>Return to your portal →</a>
          </span>
          <button onClick={() => setBannerDismissed(true)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <header className={`g-header${scrolled || menuOpen ? " g-header--scrolled" : ""}`}>
        <div className="g-header-inner">
          <Link href="/" className="g-logo" aria-label="SmartMove home">
            <LogoMark />
            <span className="g-logo-text">SmartMove</span>
          </Link>

          <nav className="g-nav" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="g-nav-link">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="g-header-actions">
            <a href={headerCta.href} className="g-btn g-btn-ghost">
              {headerCta.label}
            </a>
            {!authed && (
              <a href="/authentication/register" className="g-btn g-btn-primary">
                Get Started
              </a>
            )}
          </div>

          <button
            className="g-hamburger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {menuOpen && (
          <div className="g-mobile-nav">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="g-mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="g-mobile-actions">
              <a href={headerCta.href} className="g-btn g-btn-ghost">
                {headerCta.label}
              </a>
              {!authed && (
                <a href="/authentication/register" className="g-btn g-btn-primary">
                  Get Started
                </a>
              )}
            </div>
          </div>
        )}
      </header>

      <main style={{ paddingTop: 68 }}>{children}</main>

      <Footer />
    </div>
  );
}

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ps-lg" x1="2" y1="2" x2="26" y2="26">
          <stop offset="0%" stopColor="var(--ui-brand-primary)" />
          <stop offset="100%" stopColor="var(--ui-brand-secondary)" />
        </linearGradient>
      </defs>
      <circle cx="14" cy="14" r="12" stroke="url(#ps-lg)" strokeWidth="1.8" />
      <circle cx="14" cy="14" r="5" fill="url(#ps-lg)" />
      <ellipse cx="14" cy="14" rx="12" ry="5" stroke="url(#ps-lg)" strokeWidth="1" opacity="0.45" />
    </svg>
  );
}

function GuestCSS() {
  return (
    <style>{`
      .g-portal {
        color: var(--ui-content-primary);
        overflow-x: hidden;
      }

      .g-auth-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9998;
        background: rgba(59, 130, 246, 0.1);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid rgba(59, 130, 246, 0.22);
        padding: 9px 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        font-size: 13px;
        color: var(--ui-brand-primary);
        font-family: var(--ui-font-base);
      }
      .g-auth-banner a {
        color: var(--ui-brand-secondary);
        text-decoration: underline;
      }
      .g-auth-banner button {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--ui-content-secondary);
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 14px;
        transition: background 0.2s;
      }
      .g-auth-banner button:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .g-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        padding: 0 40px;
        transition: background 0.3s, backdrop-filter 0.3s, border-color 0.3s;
      }
      .g-header--scrolled {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--ui-border-subtle);
      }
      .dark .g-header--scrolled {
        background: rgba(8, 14, 26, 0.9);
      }
      .g-header-inner {
        max-width: 1200px;
        margin: 0 auto;
        height: 68px;
        display: flex;
        align-items: center;
        gap: 32px;
      }

      .g-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        flex-shrink: 0;
      }
      .g-footer .g-logo {
        gap: 20px;
      }
      .g-logo-text {
        font-family: var(--ui-font-logo);
        font-size: 18px;
        font-weight: 700;
        background: linear-gradient(135deg, var(--ui-brand-primary), var(--ui-brand-secondary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .g-nav {
        display: flex;
        align-items: center;
        gap: 2px;
        flex: 1;
      }
      .g-nav-link {
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 400;
        color: var(--ui-content-secondary);
        text-decoration: none;
        font-family: var(--ui-font-base);
        transition: color 0.2s, background 0.2s;
      }
      .g-nav-link:hover {
        color: var(--ui-content-strong);
        background: rgba(255, 255, 255, 0.05);
      }

      .g-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .g-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        border-radius: 9px;
        font-size: 14px;
        font-weight: 500;
        font-family: var(--ui-font-base);
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
      }
      .g-btn-ghost {
        color: var(--ui-content-primary);
        border: 1px solid var(--ui-border-subtle);
        background: transparent;
      }
      .g-btn-ghost:hover {
        background: rgba(255, 255, 255, 0.06);
        color: var(--ui-content-strong);
      }
      .g-btn-primary {
        background: linear-gradient(135deg, var(--ui-brand-primary), #1d4ed8);
        color: var(--ui-content-on-brand);
        box-shadow: 0 0 18px rgba(59, 130, 246, 0.28);
      }
      .g-btn-primary:hover {
        background: linear-gradient(135deg, #60a5fa, var(--ui-brand-primary));
        box-shadow: 0 0 28px rgba(59, 130, 246, 0.45);
        transform: translateY(-1px);
      }
      .g-btn-lg {
        padding: 14px 32px;
        font-size: 16px;
        border-radius: 12px;
      }
      .g-btn-outline {
        background: transparent;
        border: 1px solid var(--ui-border-subtle);
        color: var(--ui-content-secondary);
      }
      .g-btn-outline:hover {
        border-color: rgba(59, 130, 246, 0.45);
        color: var(--ui-content-strong);
      }
      .g-btn-secondary {
        background: var(--ui-surface-muted);
        border: 1px solid var(--ui-border-subtle);
        color: var(--ui-content-primary);
      }
      .g-btn-secondary:hover {
        background: var(--ui-surface-card);
      }

      .g-hamburger {
        display: none;
        flex-direction: column;
        gap: 5px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px;
        margin-left: auto;
      }
      .g-hamburger span {
        display: block;
        width: 22px;
        height: 2px;
        background: var(--ui-content-secondary);
        border-radius: 2px;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      .g-hamburger[aria-expanded="true"] span:nth-child(1) {
        transform: translateY(7px) rotate(45deg);
      }
      .g-hamburger[aria-expanded="true"] span:nth-child(2) {
        opacity: 0;
      }
      .g-hamburger[aria-expanded="true"] span:nth-child(3) {
        transform: translateY(-7px) rotate(-45deg);
      }
      .g-mobile-nav {
        position: absolute;
        top: 68px;
        left: 0;
        right: 0;
        background: var(--ui-surface-card);
        border-bottom: 1px solid var(--ui-border-subtle);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
        padding: 16px 24px 24px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        z-index: 99;
        animation: g-slide-down 0.25s ease-out forwards;
      }
      .dark .g-mobile-nav {
        background: rgba(8, 14, 26, 0.98);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      @keyframes g-slide-down {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .g-mobile-link {
        padding: 12px 16px;
        border-radius: 8px;
        color: var(--ui-content-secondary);
        text-decoration: none;
        font-size: 15px;
        font-family: var(--ui-font-base);
        transition: all 0.2s;
      }
      .g-mobile-link:hover {
        background: var(--ui-surface-muted);
        color: var(--ui-content-strong);
      }
      .g-mobile-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--ui-border-subtle);
      }

      @media (max-width: 768px) {
        .g-nav {
          display: none;
        }
        .g-header-actions {
          display: none;
        }
        .g-hamburger {
          display: flex;
        }
        .g-header {
          padding: 0 20px;
        }
      }

      .g-footer {
        background: var(--ui-surface-card);
        border-top: 1px solid var(--ui-border-subtle);
        padding: 64px 40px 32px;
        font-family: var(--ui-font-base);
      }
      .g-footer-inner {
        max-width: 1200px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        gap: 48px;
      }
      .g-footer-brand {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .g-footer-tag {
        font-size: 13px;
        color: var(--ui-content-muted);
        line-height: 1.7;
      }
      .g-badges {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .g-badge {
        padding: 4px 10px;
        border-radius: 20px;
        background: rgba(59, 130, 246, 0.08);
        border: 1px solid rgba(59, 130, 246, 0.18);
        font-size: 11px;
        color: var(--ui-brand-primary);
      }
      .g-footer-col {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .g-footer-col-h {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ui-content-primary);
        margin-bottom: 4px;
        font-family: var(--ui-font-base);
      }
      .g-footer-link {
        font-size: 13px;
        color: var(--ui-content-muted);
        text-decoration: none;
        transition: color 0.2s;
      }
      .g-footer-link:hover {
        color: var(--ui-content-primary);
      }
      .g-footer-bottom {
        max-width: 1200px;
        margin: 40px auto 0;
        padding-top: 24px;
        border-top: 1px solid var(--ui-border-subtle);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: var(--ui-content-muted);
      }

      @media (max-width: 900px) {
        .g-footer-inner {
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        .g-footer {
          padding: 48px 24px 24px;
        }
      }
      @media (max-width: 540px) {
        .g-footer-inner {
          grid-template-columns: 1fr;
        }
        .g-footer-bottom {
          flex-direction: column;
          gap: 8px;
          text-align: center;
        }
      }

      .g-section {
        padding: 100px 40px;
      }
      .g-section-inner {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 64px;
      }
      .g-section-header {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .g-tag {
        display: inline-block;
        padding: 5px 14px;
        border-radius: 20px;
        background: rgba(59, 130, 246, 0.08);
        border: 1px solid rgba(59, 130, 246, 0.2);
        font-size: 11px;
        font-weight: 600;
        color: var(--ui-brand-primary);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-family: var(--ui-font-base);
      }
      .g-h2 {
        font-family: var(--ui-font-logo);
        font-size: clamp(28px, 4vw, 46px);
        font-weight: 700;
        color: var(--ui-content-strong);
        letter-spacing: -0.015em;
        line-height: 1.15;
        max-width: 680px;
      }
      .g-sub {
        font-size: 17px;
        color: var(--ui-content-secondary);
        line-height: 1.75;
        max-width: 560px;
        font-family: var(--ui-font-base);
      }

      .g-page {
        padding: 110px 24px 96px;
        display: flex;
        flex-direction: column;
        gap: 40px;
        max-width: 1100px;
        margin: 0 auto;
      }
      .g-page-hero {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(45, 212, 191, 0.15));
        border: 1px solid rgba(59, 130, 246, 0.25);
        border-radius: 20px;
        padding: 42px 40px;
        box-shadow: var(--ui-shadow-card);
      }
      .g-page-title {
        font-family: var(--ui-font-logo);
        font-size: clamp(30px, 3.5vw, 44px);
        font-weight: 700;
        color: var(--ui-content-strong);
      }
      .g-page-sub {
        margin-top: 12px;
        font-size: 16px;
        color: var(--ui-content-secondary);
        line-height: 1.7;
        max-width: 720px;
        font-family: var(--ui-font-base);
      }
      .g-page-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }
      .g-page-card {
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 16px;
        padding: 24px;
        box-shadow: var(--ui-shadow-card);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .g-page-card h3 {
        font-family: var(--ui-font-logo);
        font-size: 18px;
        color: var(--ui-content-strong);
      }
      .g-page-card p {
        font-size: 14px;
        color: var(--ui-content-secondary);
        line-height: 1.7;
        font-family: var(--ui-font-base);
      }
      .g-page-card span {
        font-size: 13px;
        color: var(--ui-content-muted);
        font-family: var(--ui-font-base);
      }

      @media (max-width: 900px) {
        .g-page-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 640px) {
        .g-section {
          padding: 64px 20px;
        }
        .g-page {
          padding-top: 96px;
        }
        .g-page-hero {
          padding: 32px 26px;
        }
      }
    `}</style>
  );
}
