"use client";

import React, { useEffect, useRef } from "react";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { SpotlightCard } from "@/components/guest/GuestAnimations";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export default function AboutPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  // Single IntersectionObserver for scroll-reveal animations
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-on");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".reveal-watch").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Particle Web Constellation simulation (Zero reflows, runs purely in canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    const particleCount = 45;

    const resize = () => {
      canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.offsetHeight || 300;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 1,
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw lines between particles & mouse
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce boundaries
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 130, 246, 0.45)";
        ctx.fill();

        // Connect to nearby particles
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.18 * (1 - dist / 90)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Connect to mouse
        const mDist = Math.hypot(p.x - mouseRef.current.x, p.y - mouseRef.current.y);
        if (mDist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
          ctx.strokeStyle = `rgba(45, 212, 191, ${0.3 * (1 - mDist / 120)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <GuestLayout>
      <AboutCSS />
      
      {/* 1. Hero Section */}
      <section className="ab-hero reveal-watch" style={{ position: "relative", overflow: "hidden" }}>
        <canvas 
          ref={canvasRef} 
          style={{ 
            position: "absolute", 
            inset: 0, 
            width: "100%", 
            height: "100%", 
            pointerEvents: "auto",
            zIndex: 0 
          }} 
        />
        <div className="ab-hero-inner" style={{ position: "relative", zIndex: 1 }}>
          <div className="g-tag">About Us</div>
          <h1 className="ab-h1">About SmartMove</h1>
          <p className="ab-sub">
            We build market intelligence that turns complex real estate data into confident, investment-ready decisions.
          </p>
        </div>
      </section>

      {/* 2. Mission Section */}
      <section className="ab-mission ab-section reveal-watch">
        <div className="ab-section-inner">
          <div className="ab-mission-grid">
            <div className="ab-mission-quote">
              &ldquo;The real estate sector is overflowing with data, yet starving for true intelligence. We bridge that gap.&rdquo;
            </div>
            <div className="ab-mission-text">
              <p>
                At SmartMove, we believe that tracking properties shouldn&apos;t require a degree in database administration. Modern investors need to understand macro trends, query micro-level indicators, and compare global opportunities without friction.
              </p>
              <p>
                We built a platform that aggregates, normalises, and indexes millions of records from multiple sovereign markets. By structuring this data into an AI-accessible analytical warehouse, we allow anyone to pull complex insights using simple language.
              </p>
              <p>
                Whether you are examining rental yields in Dubai Marina, pricing momentum in New Cairo, or prime yields in London, SmartMove puts clean, structured, and live market intelligence at your fingertips.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. What We Built Section */}
      <section className="ab-built ab-section reveal-watch">
        <div className="ab-section-inner">
          <div className="ab-section-header">
            <div className="g-tag">Our Ecosystem</div>
            <h2 className="g-h2">What We Built</h2>
            <p className="g-sub">Five cornerstone technologies unified into a single property intelligence platform.</p>
          </div>

          <div className="ab-built-grid">
            {[
              {
                title: "MoveIQ AI",
                desc: "Our conversational analytics assistant. Ask market queries, generate instant comparison charts, and receive warehouse-connected insights in real time.",
                color: "var(--ui-brand-primary)",
              },
              {
                title: "Agentic Analytics",
                desc: "The automatic dashboard compiler. Describe what data columns and regions you want to inspect, and watch the system construct interactive views instantly.",
                color: "var(--ui-brand-secondary)",
              },
              {
                title: "Cloud Workspace",
                desc: "A secure sandbox to upload custom CSV datasets. Cleanse, validate, structure, and save import histories side-by-side with global index markers.",
                color: "var(--ui-brand-accent)",
              },
              {
                title: "Multi-Market Intelligence",
                desc: "Simultaneous analytics tracking price indices, rental growth rates, transaction volumes, and investment rankings across three hot global markets.",
                color: "var(--ui-status-warning)",
              },
              {
                title: "AI Forecasting",
                desc: "Predictive engine that processes transaction records, yield index velocity, and macro variables to forecast property appreciation and ROI up to 36 months ahead.",
                color: "var(--ui-status-success)",
              },
            ].map((card, i) => (
              <SpotlightCard 
                key={i} 
                className="ab-card-wrapper" 
                spotlightColor={`color-mix(in srgb, ${card.color} 15%, transparent)`}
                size={300}
              >
                <div className="ab-card" style={{ "--ac": card.color } as React.CSSProperties}>
                  <h3 className="ab-card-title">{card.title}</h3>
                  <p className="ab-card-desc">{card.desc}</p>
                  <div className="ab-card-bar" style={{ background: card.color }} />
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Tech Stack Section */}
      <section className="ab-stack ab-section reveal-watch">
        <div className="ab-section-inner">
          <div className="ab-stack-wrap">
            <h4 className="ab-stack-title">Engineered with State-of-the-Art Technologies</h4>
            <div className="ab-stack-badges">
              {["Azure Data Warehouse", "SSAS / DAX", "Next.js", "Python / Django", "MoveIQ Analytics Engine", "IntersectionObserver CSS Animations"].map((tech, i) => (
                <span key={i} className="ab-stack-badge">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Three Markets Section */}
      <section className="ab-markets ab-section reveal-watch">
        <div className="ab-section-inner">
          <div className="ab-section-header">
            <div className="g-tag">Active Coverage</div>
            <h2 className="g-h2">Global Markets Under Management</h2>
            <p className="g-sub">We actively index listings, transactions, and yield indexes in three premier investment hubs.</p>
          </div>

          <div className="ab-mkt-grid">
            {[
              {
                flag: "🇬🇧",
                country: "England",
                accent: "var(--ui-brand-primary)",
                desc: "From London prime postcodes to regional growth hubs. Track UK-wide price momentum, inventory velocity, and buy-to-let yield spreads.",
                stats: [
                  { label: "Avg Price", value: "£482K" },
                  { label: "YoY Growth", value: "+3.2%" },
                  { label: "ROI Index", value: "6.8%" },
                ],
              },
              {
                flag: "🇦🇪",
                country: "Dubai / UAE",
                accent: "var(--ui-brand-secondary)",
                desc: "The epicentre of modern luxury property. Monitor transactional data, off-plan completions, and net rental yields district-by-district.",
                stats: [
                  { label: "Avg Price", value: "AED 1.2M" },
                  { label: "YoY Growth", value: "+5.7%" },
                  { label: "ROI Index", value: "9.2%" },
                ],
              },
              {
                flag: "🇪🇬",
                country: "Egypt",
                accent: "var(--ui-brand-accent)",
                desc: "One of the world&apos;s fastest growing real estate regions. Track primary sales in New Cairo, coastal developments, and currency-hedge premiums.",
                stats: [
                  { label: "Avg Price", value: "EGP 4.8M" },
                  { label: "YoY Growth", value: "+14.2%" },
                  { label: "ROI Index", value: "11.4%" },
                ],
              },
            ].map((m, i) => (
              <div key={i} className="ab-mkt-card" style={{ "--ma": m.accent } as React.CSSProperties}>
                <div className="ab-mkt-hdr">
                  <span className="ab-mkt-flag">{m.flag}</span>
                  <div className="ab-mkt-name">{m.country}</div>
                </div>
                <p className="ab-mkt-desc">{m.desc}</p>
                <div className="ab-mkt-stats">
                  {m.stats.map((s, j) => (
                    <div key={j} className="ab-mkt-stat">
                      <div className="ab-mkt-val" style={{ color: m.accent }}>{s.value}</div>
                      <div className="ab-mkt-lbl">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="ab-card-bar" style={{ background: m.accent }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CTA Section */}
      <section className="ab-cta ab-section reveal-watch">
        <div className="ab-cta-inner">
          <h2 className="ab-cta-h2">Ready to explore these markets yourself?</h2>
          <p className="ab-cta-p">Create your free SmartMove account today and access live data streams.</p>
          <a href="/authentication/register" className="g-btn g-btn-primary g-btn-lg">
            Create Free Account
          </a>
        </div>
      </section>
    </GuestLayout>
  );
}

function AboutCSS() {
  return (
    <style>{`
      /* ══ GLOBAL ABOUT STYLING ═════════════════════════════════════ */
      .ab-section {
        padding: 100px 40px;
        border-top: 1px solid var(--ui-border-subtle);
      }
      .ab-section-inner {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 64px;
      }
      .ab-section-header {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      /* ══ SCROLL REVEAL ═════════════════════════════════════════════ */
      .reveal-watch {
        opacity: 0;
        transform: translateY(32px);
        transition: opacity .8s cubic-bezier(0.4, 0, 0.2, 1), transform .8s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .reveal-watch.reveal-on {
        opacity: 1;
        transform: translateY(0);
      }

      /* ══ HERO SECTION ══════════════════════════════════════════════ */
      .ab-hero {
        min-height: 45vh;
        display: flex;
        align-items: center;
        padding: 140px 40px 80px;
        background: radial-gradient(ellipse 60% 50% at 10% 20%, rgba(59, 130, 246, 0.08), transparent);
      }
      .ab-hero-inner {
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
      }
      .ab-h1 {
        font-family: var(--ui-font-logo);
        font-size: clamp(36px, 5.5vw, 60px);
        font-weight: 700;
        color: var(--ui-content-strong);
        line-height: 1.1;
        letter-spacing: -0.02em;
      }
      .ab-sub {
        font-size: clamp(16px, 2vw, 22px);
        color: var(--ui-content-secondary);
        line-height: 1.6;
        max-width: 760px;
        font-family: var(--ui-font-base);
      }

      /* ══ MISSION SECTION ═══════════════════════════════════════════ */
      .ab-mission {
        background: var(--ui-surface-muted);
      }
      .ab-mission-grid {
        display: grid;
        grid-template-columns: 1.1fr 1.3fr;
        gap: 80px;
        align-items: center;
      }
      .ab-mission-quote {
        font-family: var(--ui-font-logo);
        font-size: clamp(24px, 3vw, 36px);
        font-weight: 600;
        line-height: 1.3;
        color: var(--ui-brand-primary);
        letter-spacing: -0.015em;
        border-left: 3px solid var(--ui-brand-primary);
        padding-left: 28px;
      }
      .ab-mission-text {
        display: flex;
        flex-direction: column;
        gap: 20px;
        font-family: var(--ui-font-base);
        font-size: 15px;
        color: var(--ui-content-secondary);
        line-height: 1.8;
      }
      @media (max-width: 900px) {
        .ab-mission-grid {
          grid-template-columns: 1fr;
          gap: 40px;
        }
        .ab-section {
          padding: 72px 24px;
        }
      }

      /* ══ WHAT WE BUILT ═════════════════════════════════════════════ */
      .ab-built-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 28px;
      }
      .ab-card-wrapper {
        border-radius: 16px;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        box-shadow: var(--ui-shadow-card);
        transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      .ab-card-wrapper:hover {
        transform: translateY(-4px);
      }
      .ab-card {
        position: relative;
        overflow: hidden;
        padding: 36px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .ab-card-title {
        font-family: var(--ui-font-logo);
        font-size: 22px;
        font-weight: 700;
        color: var(--ui-content-strong);
      }
      .ab-card-desc {
        font-size: 14px;
        color: var(--ui-content-secondary);
        line-height: 1.7;
        font-family: var(--ui-font-base);
      }
      .ab-card-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
      }
      @media (max-width: 768px) {
        .ab-built-grid {
          grid-template-columns: 1fr;
        }
      }

      /* ══ TECH STACK ════════════════════════════════════════════════ */
      .ab-stack {
        background: var(--ui-surface-muted);
        text-align: center;
        padding: 60px 40px;
      }
      .ab-stack-wrap {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 24px;
        align-items: center;
      }
      .ab-stack-title {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--ui-content-muted);
        font-family: var(--ui-font-base);
      }
      .ab-stack-badges {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .ab-stack-badge {
        padding: 8px 16px;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        color: var(--ui-content-primary);
        font-family: var(--ui-font-base);
      }

      /* ══ MARKETS SECTION ═══════════════════════════════════════════ */
      .ab-mkt-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }
      .ab-mkt-card {
        position: relative;
        overflow: hidden;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 16px;
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: var(--ui-shadow-card);
        transition: border-color 0.3s, transform 0.3s;
      }
      .ab-mkt-card:hover {
        border-color: var(--ma);
        transform: translateY(-4px);
      }
      .ab-mkt-hdr {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ab-mkt-flag {
        font-size: 26px;
      }
      .ab-mkt-name {
        font-family: var(--ui-font-logo);
        font-size: 20px;
        font-weight: 700;
        color: var(--ui-content-strong);
      }
      .ab-mkt-desc {
        font-size: 13px;
        color: var(--ui-content-secondary);
        line-height: 1.65;
        font-family: var(--ui-font-base);
        flex-grow: 1;
      }
      .ab-mkt-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 10px;
      }
      .ab-mkt-stat {
        background: var(--ui-surface-muted);
        border-radius: 10px;
        padding: 10px 6px;
        text-align: center;
      }
      .ab-mkt-val {
        font-family: var(--ui-font-logo);
        font-size: 14px;
        font-weight: 700;
      }
      .ab-mkt-lbl {
        font-size: 9px;
        color: var(--ui-content-muted);
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-family: var(--ui-font-base);
      }
      @media (max-width: 900px) {
        .ab-mkt-grid {
          grid-template-columns: 1fr;
        }
      }

      /* ══ CTA SECTION ═══════════════════════════════════════════════ */
      .ab-cta {
        padding: 120px 40px;
        text-align: center;
        background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59, 130, 246, 0.06), transparent 70%);
      }
      .ab-cta-inner {
        max-width: 680px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
      }
      .ab-cta-h2 {
        font-family: var(--ui-font-logo);
        font-size: clamp(28px, 4vw, 44px);
        font-weight: 700;
        color: var(--ui-content-strong);
        line-height: 1.2;
      }
      .ab-cta-p {
        font-size: 16px;
        color: var(--ui-content-secondary);
        font-family: var(--ui-font-base);
        max-width: 480px;
      }
    `}</style>
  );
}
