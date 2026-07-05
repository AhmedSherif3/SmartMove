"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { SpotlightCard, MagneticButton } from "@/components/guest/GuestAnimations";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "sales", message: "" });
  const [errors, setErrors] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Scroll reveal setup
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

  const validate = () => {
    const newErrors = { name: "", email: "", message: "" };
    let isValid = true;

    if (!form.name.trim()) {
      newErrors.name = "Name is required.";
      isValid = false;
    }
    if (!form.email.trim()) {
      newErrors.email = "Email is required.";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Please enter a valid email address.";
      isValid = false;
    }
    if (!form.message.trim()) {
      newErrors.message = "Message cannot be empty.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    // Simulate API request
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setForm({ name: "", email: "", topic: "sales", message: "" });
    }, 1200);
  };

  return (
    <GuestLayout>
      <ContactCSS />
      <div className="co-wrapper">
        
        {/* Hero Section with Interactive 3D Dotted Map Background */}
        <section className="co-hero reveal-watch" style={{ position: "relative", overflow: "hidden" }}>
          {/* Dotted Map Base grid */}
          <div 
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.1,
              backgroundImage: "radial-gradient(circle, var(--ui-content-primary) 1.5px, transparent 1.5px)",
              backgroundSize: "20px 20px",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
          {/* 3D Pulsing geographic market nodes */}
          <div className="map-node node-uk" style={{ left: "40%", top: "35%", "--node-c": "var(--ui-brand-primary)" } as React.CSSProperties} />
          <div className="map-node node-uae" style={{ left: "62%", top: "58%", "--node-c": "var(--ui-brand-secondary)" } as React.CSSProperties} />
          <div className="map-node node-egy" style={{ left: "55%", top: "50%", "--node-c": "var(--ui-brand-accent)" } as React.CSSProperties} />

          <div className="co-hero-inner" style={{ position: "relative", zIndex: 1 }}>
            <div className="g-tag">Get in Touch</div>
            <h1 className="co-hero-h1">Contact Us</h1>
            <p className="co-hero-sub">
              Tell us about your investment objectives or technical queries. Our team will help you find the right intelligence plan.
            </p>
          </div>
        </section>

        {/* Form and Info Layout */}
        <section className="co-main co-section reveal-watch">
          <div className="co-container">
            
            {/* 60% Form in SpotlightCard */}
            <SpotlightCard className="co-form-wrap-spotlight" spotlightColor="rgba(59, 130, 246, 0.08)" size={400}>
              <div className="co-form-wrap">
                {submitted ? (
                  <div className="co-success">
                    <div className="co-success-icon">✓</div>
                    <h3 className="co-success-title">Message Sent Successfully</h3>
                    <p>
                      Thank you for reaching out! A SmartMove product specialist will contact you shortly (typically within 4 hours).
                    </p>
                    <button className="g-btn g-btn-outline" onClick={() => setSubmitted(false)}>
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="co-form" noValidate>
                    <div className="co-form-row">
                      <div className="co-form-group">
                        <label htmlFor="name">Your Name</label>
                        <input
                          type="text"
                          id="name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className={errors.name ? "co-input-error" : ""}
                          placeholder="e.g. John Doe"
                        />
                        {errors.name && <span className="co-error-text">{errors.name}</span>}
                      </div>

                      <div className="co-form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                          type="email"
                          id="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className={errors.email ? "co-input-error" : ""}
                          placeholder="e.g. john@example.com"
                        />
                        {errors.email && <span className="co-error-text">{errors.email}</span>}
                      </div>
                    </div>

                    <div className="co-form-group">
                      <label htmlFor="topic">Enquiry Topic</label>
                      <select
                        id="topic"
                        value={form.topic}
                        onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      >
                        <option value="sales">Product Sales &amp; Custom Onboarding</option>
                        <option value="support">Technical Dashboard Support</option>
                        <option value="data">Data Warehouse / API Solutions</option>
                        <option value="billing">Billing &amp; Upgrades</option>
                        <option value="others">Others</option>
                      </select>
                    </div>

                    <div className="co-form-group">
                      <label htmlFor="message">Message</label>
                      <textarea
                        id="message"
                        rows={6}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className={errors.message ? "co-input-error" : ""}
                        placeholder="How can we help you?"
                      />
                      {errors.message && <span className="co-error-text">{errors.message}</span>}
                    </div>

                    <MagneticButton strength={0.15}>
                      <button type="submit" className="g-btn g-btn-primary co-submit" style={{ width: "100%" }} disabled={loading}>
                        {loading ? "Sending..." : "Submit Enquiry →"}
                      </button>
                    </MagneticButton>
                  </form>
                )}
              </div>
            </SpotlightCard>

            {/* 40% Info Cards */}
            <div className="co-info">
              {[
                { title: "Direct Email", value: "contact@smartmove.com", desc: "For all enquiries including sales, support, data access, and privacy.", accent: "var(--ui-brand-primary)" },
                { title: "Response SLA", value: "Under 4 Hours", desc: "Our global support desks operate Mon-Fri 08:00 to 20:00 GMT.", accent: "var(--ui-brand-secondary)" },
                { title: "Coverage Cities", value: "Cairo · Dubai · London", desc: "We map physical operations to local data nodes.", accent: "var(--ui-brand-accent)" },
              ].map((card, i) => (
                <SpotlightCard 
                  key={i} 
                  className="co-info-card-wrapper" 
                  spotlightColor={`color-mix(in srgb, ${card.accent} 15%, transparent)`}
                  size={260}
                >
                  <div className="co-info-card" style={{ "--cc": card.accent } as React.CSSProperties}>
                    <div className="co-info-title">{card.title}</div>
                    <div className="co-info-val">{card.value}</div>
                    <p className="co-info-desc">{card.desc}</p>
                  </div>
                </SpotlightCard>
              ))}
            </div>

          </div>
        </section>

        {/* Collapsible FAQ Teaser */}
        <section className="co-faq-teaser co-section reveal-watch">
          <div className="co-faq-teaser-inner">
            <h2 className="co-faq-teaser-title">Have a quick question?</h2>
            <p className="co-faq-teaser-sub">Check our quick FAQ resources or explore the full portal list.</p>
            <FAQTeaserList />
            <Link href="/#faq" className="g-btn g-btn-outline co-faq-link">
              View All FAQ Questions →
            </Link>
          </div>
        </section>

      </div>
    </GuestLayout>
  );
}

// Collapsible FAQ Accordion for contact page
function FAQTeaserList() {
  const [open, setOpen] = useState<number | null>(null);
  const FAQS = [
    { q: "Is there a free trial?", a: "Yes, you can register and access all basic live tables and charts immediately. Upgrades are only required for MoveIQ analyst tools, storage capacity, and email subscriptions." },
    { q: "How is transaction data sourced?", a: "We pull transaction records directly from public land registry systems, developer filings, and MLS warehouses across Dubai, England, and Egypt." },
    { q: "Can I cancel my subscription anytime?", a: "Absolutely. All SmartMove upgrades are billed on a flexible monthly basis. You can downgrade, cancel, or boost your plan from billing settings in one click." },
  ];

  return (
    <div className="co-faq-list">
      {FAQS.map((f, i) => (
        <div key={i} className={`co-faq-item${open === i ? " co-faq-open" : ""}`}>
          <button className="co-faq-q" onClick={() => setOpen(open === i ? null : i)}>
            <span>{f.q}</span>
            <span>{open === i ? "−" : "+"}</span>
          </button>
          <div className="co-faq-a-wrapper" style={{ display: 'grid', gridTemplateRows: open === i ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease-in-out' }}>
            <div style={{ overflow: 'hidden' }}>
              <div className="co-faq-a">{f.a}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactCSS() {
  return (
    <style>{`
      /* ══ WRAPPER & LAYOUT ═════════════════════════════════════════ */
      .co-wrapper {
        background: var(--ui-surface-page);
        color: var(--ui-content-primary);
        font-family: var(--ui-font-base);
        padding-bottom: 100px;
      }
      .co-section {
        padding: 80px 40px;
        border-top: 1px solid var(--ui-border-subtle);
      }
      .co-container {
        max-width: 1200px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1.3fr 0.9fr;
        gap: 64px;
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
      .co-hero {
        min-height: 40vh;
        display: flex;
        align-items: center;
        padding: 140px 40px 60px;
        background: radial-gradient(ellipse 60% 50% at 90% 10%, rgba(45, 212, 191, 0.06), transparent 70%);
      }
      .co-hero-inner {
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
      }
      .co-hero-h1 {
        font-family: var(--ui-font-logo);
        font-size: clamp(36px, 5.5vw, 60px);
        font-weight: 700;
        color: var(--ui-content-strong);
        margin: 16px 0 8px;
        line-height: 1.1;
      }
      .co-hero-sub {
        font-size: clamp(16px, 2vw, 22px);
        color: var(--ui-content-secondary);
        line-height: 1.6;
        max-width: 760px;
      }

      /* Pulsing 3D geographic map nodes */
      .map-node {
        position: absolute;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--node-c);
        box-shadow: 0 0 10px 2px var(--node-c);
        transform: translate(-50%, -50%);
        z-index: 1;
      }
      .map-node::after {
        content: "";
        position: absolute;
        inset: -10px;
        border-radius: 50%;
        border: 1px solid var(--node-c);
        opacity: 0.8;
        animation: map-ping 2s infinite ease-out;
      }
      @keyframes map-ping {
        0% { transform: scale(0.6); opacity: 0.9; }
        100% { transform: scale(2.8); opacity: 0; }
      }

      /* ══ FORM WORKFLOW ═════════════════════════════════════════════ */
      .co-form-wrap-spotlight {
        border-radius: 16px;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        box-shadow: var(--ui-shadow-card);
      }
      .co-form-wrap {
        padding: 40px;
      }
      .co-form {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .co-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      .co-form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .co-form-group label {
        font-size: 13px;
        font-weight: 600;
        color: var(--ui-content-primary);
      }
      .co-form-group input,
      .co-form-group select,
      .co-form-group textarea {
        background: var(--ui-surface-muted);
        border: 1px solid var(--ui-border-subtle);
        color: var(--ui-content-strong);
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-family: var(--ui-font-base);
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .co-form-group input:focus,
      .co-form-group select:focus,
      .co-form-group textarea:focus {
        border-color: var(--ui-brand-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-brand-primary) 15%, transparent);
      }
      .co-input-error {
        border-color: #ef4444 !important;
      }
      .co-error-text {
        font-size: 11px;
        color: #ef4444;
        font-weight: 500;
      }
      .co-submit {
        justify-content: center;
        padding: 14px;
        font-size: 15px;
        border-radius: 8px;
        font-weight: 600;
      }

      /* ══ SUCCESS MESSAGE ══════════════════════════════════════════ */
      .co-success {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        padding: 40px 0;
      }
      .co-success-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(16, 216, 121, 0.1);
        border: 1px solid rgba(16, 216, 121, 0.3);
        color: var(--ui-status-success);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        font-weight: bold;
      }
      .co-success-title {
        font-family: var(--ui-font-logo);
        font-size: 24px;
        font-weight: 700;
        color: var(--ui-content-strong);
      }
      .co-success p {
        font-size: 15px;
        color: var(--ui-content-secondary);
        max-width: 380px;
        line-height: 1.6;
        margin-bottom: 12px;
      }

      /* ══ INFO COLUMN ══════════════════════════════════════════════ */
      .co-info {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .co-info-card-wrapper {
        border-radius: 12px;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        box-shadow: var(--ui-shadow-card);
        transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      .co-info-card-wrapper:hover {
        transform: translateY(-4px);
      }
      .co-info-card {
        position: relative;
        overflow: hidden;
        padding: 24px;
        border-left: 3px solid var(--cc);
      }
      .co-info-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--ui-content-muted);
        margin-bottom: 6px;
      }
      .co-info-val {
        font-family: var(--ui-font-logo);
        font-size: 18px;
        font-weight: 700;
        color: var(--ui-content-strong);
        margin-bottom: 4px;
      }
      .co-info-desc {
        font-size: 13px;
        color: var(--ui-content-secondary);
        line-height: 1.5;
      }

      /* ══ FAQ TEASER SECTION ═══════════════════════════════════════ */
      .co-faq-teaser {
        background: var(--ui-surface-muted);
      }
      .co-faq-teaser-inner {
        max-width: 800px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .co-faq-teaser-title {
        font-family: var(--ui-font-logo);
        font-size: clamp(24px, 3.5vw, 36px);
        font-weight: 700;
        color: var(--ui-content-strong);
        text-align: center;
      }
      .co-faq-teaser-sub {
        font-size: 15px;
        color: var(--ui-content-secondary);
        text-align: center;
        margin-bottom: 24px;
      }

      .co-faq-list {
        width: 100%;
        display: flex;
        flex-direction: column;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: var(--ui-shadow-card);
        margin-bottom: 32px;
      }
      .co-faq-item {
        border-bottom: 1px solid var(--ui-border-subtle);
      }
      .co-faq-item:last-child {
        border-bottom: none;
      }
      .co-faq-q {
        width: 100%;
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        gap: 16px;
        font-size: 15px;
        font-weight: 600;
        color: var(--ui-content-primary);
        text-align: left;
        font-family: var(--ui-font-base);
        transition: color 0.2s;
      }
      .co-faq-q:hover {
        color: var(--ui-content-strong);
      }
      .co-faq-open .co-faq-q {
        color: var(--ui-brand-primary);
      }
      .co-faq-a-wrapper {
        overflow: hidden;
      }
      .co-faq-a {
        padding: 0 24px 20px;
        font-size: 13.5px;
        color: var(--ui-content-secondary);
        line-height: 1.7;
      }

      .co-faq-link {
        border-radius: 10px;
      }

      /* ══ RESPONSIVE STYLING ═══════════════════════════════════════ */
      @media (max-width: 900px) {
        .co-container {
          grid-template-columns: 1fr;
          gap: 40px;
        }
        .co-section {
          padding: 60px 24px;
        }
        .co-hero {
          padding: 100px 24px 40px;
        }
      }
      @media (max-width: 600px) {
        .co-form-row {
          grid-template-columns: 1fr;
          gap: 20px;
        }
        .co-form-wrap {
          padding: 24px;
        }
      }
    `}</style>
  );
}
