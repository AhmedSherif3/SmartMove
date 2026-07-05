"use client";

import type { CSSProperties } from "react";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { getAuthSession } from "@/lib/auth/session";
import { normalizeRole } from "@/components/layout/DashboardLayoutParts";
import { createCheckoutSession, fetchSubscriptionStatus, SubscriptionStatus } from "@/lib/subscriptionApi";

function PricingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  const [authed, setAuthed] = useState(false);
  const [portalPath, setPortalPath] = useState("/dashboard");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [activeTab, setActiveTab] = useState<"role" | "cloud" | "reports">("role");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cloud slider value
  const [storageGb, setStorageGb] = useState<number>(2);

  // Report region selector
  const [selectedRegion, setSelectedRegion] = useState<"egypt" | "dubai" | "england">("egypt");

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      setAuthed(true);
      setPortalPath(`/${normalizeRole(session.role)}`);
      
      // Fetch user active subscription plans
      fetchSubscriptionStatus()
        .then((data) => {
          setStatus(data);
        })
        .catch((err) => {
          console.error("Failed to load subscription status", err);
        });
    }

    // Set tab from query parameter if provided
    const queryTab = searchParams.get("tab");
    if (queryTab === "cloud" || queryTab === "reports" || queryTab === "role") {
      setActiveTab(queryTab);
    }
  }, [searchParams]);

  // Handle post-payment redirection
  useEffect(() => {
    if (success && authed) {
      // Wait a moment and redirect to dashboard
      const timer = setTimeout(() => {
        router.push(portalPath);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, authed, portalPath, router]);

  const handleCheckout = async (planId: string, quantity: number = 1, region?: string) => {
    if (!authed) {
      router.push("/authentication/register");
      return;
    }

    setLoadingPlan(planId);
    setErrorMessage(null);

    try {
      const response = await createCheckoutSession(planId, quantity, region);
      if (response && response.checkout_url) {
        window.location.href = response.checkout_url;
      } else {
        throw new Error("No checkout URL returned from server.");
      }
    } catch (err: unknown) {
      console.error(err);
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setErrorMessage(
        error.response?.data?.error || error.message || "An unexpected error occurred. Please try again."
      );
      setLoadingPlan(null);
    }
  };

  // Helper check functions
  const isPlanActive = (planId: string, checkRegion?: string) => {
    if (!status) return false;
    
    if (planId === "analyst") {
      return status.role === "data_analyst" && !status.active_plans.includes("analyst_pro_max");
    }
    if (planId === "analyst_pro_max") {
      return status.active_plans.includes("analyst_pro_max");
    }
    if (planId === "storage_per_gb") {
      return status.active_plans.includes("storage_per_gb");
    }
    if (planId === "storage_5gb") {
      return status.active_plans.includes("storage_5gb");
    }
    if (planId === "storage_9gb") {
      return status.active_plans.includes("storage_9gb");
    }
    if (planId === "report_single") {
      return checkRegion ? status.active_plans.includes(`report_single_${checkRegion}`) : false;
    }
    if (planId === "report_all") {
      return status.active_plans.includes("report_all");
    }
    return false;
  };

  return (
    <GuestLayout isAuthenticated={authed}>
      <PricingCSS />
      <section className="g-section pricing-page-bg">
        <div className="g-section-inner">
          
          {/* Notifications / Alerts */}
          {success && (
            <div className="alert-banner alert-banner--success">
              <span className="alert-icon">✓</span>
              <div>
                <strong>Payment Successful!</strong> Your account capabilities have been upgraded instantly.
                Redirecting you to the portal in a few seconds...
              </div>
            </div>
          )}

          {canceled && (
            <div className="alert-banner alert-banner--error">
              <span className="alert-icon">⚠</span>
              <div>
                <strong>Checkout Canceled.</strong> No charges were made. If you need assistance, please contact support.
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="alert-banner alert-banner--error">
              <span className="alert-icon">⚠</span>
              <div>
                <strong>Error:</strong> {errorMessage}
              </div>
            </div>
          )}

          <div className="g-section-header">
            <div className="g-tag">Pricing Options</div>
            <h1 className="g-h2" style={{ textAlign: "center", marginBottom: "8px" }}>
              Scale Your SmartMove Workspace
            </h1>
            <p className="g-sub" style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 24px auto" }}>
              Choose roles, expand cloud storage capacity, or unlock automated regional insights. Pay exactly for what you use.
            </p>
          </div>

          {/* Premium Tab Switcher */}
          <div className="tab-switcher-container">
            <div className="tab-switcher">
              <button 
                className={`tab-btn ${activeTab === "role" ? "tab-btn--active" : ""}`}
                onClick={() => setActiveTab("role")}
              >
                💼 Roles
              </button>
              <button 
                className={`tab-btn ${activeTab === "cloud" ? "tab-btn--active" : ""}`}
                onClick={() => setActiveTab("cloud")}
              >
                ☁ Cloud Storage
              </button>
              <button 
                className={`tab-btn ${activeTab === "reports" ? "tab-btn--active" : ""}`}
                onClick={() => setActiveTab("reports")}
              >
                📊 Region Reports
              </button>
            </div>
          </div>

          {/* Role Tab Content */}
          {activeTab === "role" && (
            <div className="price-grid price-grid--3col animate-fade-in">
              {/* Free Plan */}
              <div className="price-card" style={{ "--pa": "var(--ui-content-muted)" } as CSSProperties}>
                <div className="price-tag" style={{ color: "var(--ui-content-muted)" }}>Free Plan</div>
                <h3 className="price-name">User Plan</h3>
                <p className="price-desc">Get started with foundational tools and interactive maps.</p>
                <div className="price-amount">
                  <span className="price-num">$0</span>
                  <span className="price-period">/forever</span>
                </div>
                <ul className="price-features">
                  <li className="price-feat">✓ <span>Access to Power BI dashboards (England, Dubai, Egypt)</span></li>
                  <li className="price-feat">✓ <span>MoveIQ (ai chat) powered by Gemini 3.5 Flash</span></li>
                  <li className="price-feat">✓ <span>1 GB SmartMove Cloud storage quota</span></li>
                  <li className="price-feat">✓ <span>Basic reports and market insights</span></li>
                </ul>
                <button className="g-btn price-cta disabled" disabled>
                  {status ? "Current Base" : "Included"}
                </button>
                <div className="feat-bar" style={{ background: "var(--ui-content-muted)" }} />
              </div>

              {/* Analyst Plan */}
              <div className="price-card" style={{ "--pa": "var(--ui-brand-primary)" } as CSSProperties}>
                <div className="price-tag" style={{ color: "var(--ui-brand-primary)" }}>Most Popular</div>
                <h3 className="price-name">Analyst Plan</h3>
                <p className="price-desc">Advanced analytic models, extra storage, and smart agent systems.</p>
                <div className="price-amount">
                  <span className="price-num">$29.99</span>
                  <span className="price-period">/mo</span>
                </div>
                <ul className="price-features">
                  <li className="price-feat">✓ <span>All User Plan features</span></li>
                  <li className="price-feat">✓ <span>Enhanced MoveIQ (ai chat) powered by GPT-4o</span></li>
                  <li className="price-feat">✓ <span>5 GB SmartMove Cloud storage allowance</span></li>
                  <li className="price-feat">✓ <span>EstateMind agentic chart generation engine</span></li>
                  <li className="price-feat">✓ <span>Analytics Pro Engine for CSV analysis using GPT-4o</span></li>
                  <li className="price-feat">✓ <span>Extended historical predictions access</span></li>
                </ul>
                <button
                  onClick={() => handleCheckout("analyst")}
                  disabled={loadingPlan !== null || isPlanActive("analyst") || isPlanActive("analyst_pro_max")}
                  className={`g-btn price-cta ${isPlanActive("analyst") ? "active-plan-btn" : ""}`}
                >
                  {loadingPlan === "analyst" ? "Loading..." : isPlanActive("analyst") ? "Active Plan" : isPlanActive("analyst_pro_max") ? "Included in Pro Max" : "Upgrade to Analyst"} →
                </button>
                <div className="feat-bar" style={{ background: "var(--ui-brand-primary)" }} />
              </div>

              {/* Analyst Pro Max */}
              <div className="price-card price-card--pop" style={{ "--pa": "var(--ui-status-warning)" } as CSSProperties}>
                <div className="price-badge">PRO MAX</div>
                <div className="price-saving">Best Value</div>
                <div className="price-tag" style={{ color: "var(--ui-status-warning)" }}>Maximum Power</div>
                <h3 className="price-name">Analyst Pro Max</h3>
                <p className="price-desc">The ultimate bundle unlocking max capabilities and all regional report pipelines.</p>
                <div className="price-amount">
                  <span className="price-num">$49.99</span>
                  <span className="price-period">/mo</span>
                </div>
                <ul className="price-features">
                  <li className="price-feat">✓ <span>All Analyst Plan features</span></li>
                  <li className="price-feat">✓ <span>10 GB SmartMove Cloud storage allowance</span></li>
                  <li className="price-feat">✓ <span>Priority AI processing & automation queues</span></li>
                  <li className="price-feat">✓ <span>All Region Reports included (Save $9.99/mo)</span></li>
                  <li className="price-feat">✓ <span>Enhanced automation capabilities</span></li>
                  <li className="price-feat">✓ <span>Priority access to future premium releases</span></li>
                </ul>
                <button
                  onClick={() => handleCheckout("analyst_pro_max")}
                  disabled={loadingPlan !== null || isPlanActive("analyst_pro_max")}
                  className={`g-btn price-cta ${isPlanActive("analyst_pro_max") ? "active-plan-btn" : ""}`}
                  style={{
                    background: "var(--ui-status-warning)",
                    color: "#000",
                    border: "1px solid var(--ui-status-warning)",
                  }}
                >
                  {loadingPlan === "analyst_pro_max" ? "Loading..." : isPlanActive("analyst_pro_max") ? "Active Plan" : "Upgrade to Pro Max"} →
                </button>
                <div className="feat-bar" style={{ background: "var(--ui-status-warning)" }} />
              </div>
            </div>
          )}

          {/* Cloud Tab Content */}
          {activeTab === "cloud" && (
            <div className="price-grid price-grid--3col animate-fade-in">
              {/* Slider Option */}
              <div className="price-card" style={{ "--pa": "var(--ui-brand-secondary)" } as CSSProperties}>
                <div className="price-tag" style={{ color: "var(--ui-brand-secondary)" }}>A La Carte</div>
                <h3 className="price-name">Custom Slider</h3>
                <p className="price-desc">Pick exactly the number of additional GBs you need.</p>
                
                <div className="slider-box">
                  <div className="slider-labels">
                    <span>+1 GB</span>
                    <span>+2 GB</span>
                    <span>+3 GB</span>
                    <span>+4 GB</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={storageGb}
                    onChange={(e) => setStorageGb(parseInt(e.target.value))}
                    className="storage-range-slider"
                  />
                  <div className="slider-current-val">
                    Adding: <strong>{storageGb} GB</strong> (Max limit 10 GB)
                  </div>
                </div>

                <div className="price-amount">
                  <span className="price-num">${(storageGb * 1.99).toFixed(2)}</span>
                  <span className="price-period">/mo</span>
                </div>
                <ul className="price-features">
                  <li className="price-feat">✓ <span>Flexible scalable size (1-4 GB)</span></li>
                  <li className="price-feat">✓ <span>Billed dynamically at $1.99 per GB</span></li>
                  <li className="price-feat">✓ <span>Increase quota instantly on confirmation</span></li>
                </ul>
                <button
                  onClick={() => handleCheckout("storage_per_gb", storageGb)}
                  disabled={loadingPlan !== null || isPlanActive("analyst_pro_max")}
                  className="g-btn price-cta"
                >
                  {loadingPlan === "storage_per_gb" ? "Loading..." : isPlanActive("analyst_pro_max") ? "Included in Pro Max" : `Add ${storageGb} GB Extra`} →
                </button>
                <div className="feat-bar" style={{ background: "var(--ui-brand-secondary)" }} />
              </div>

              {/* 5 GB Block */}
              <div className="price-card" style={{ "--pa": "var(--ui-brand-primary)" } as CSSProperties}>
                <div className="price-tag" style={{ color: "var(--ui-brand-primary)" }}>Bundle Pack</div>
                <h3 className="price-name">5 GB Bundle</h3>
                <p className="price-desc">Perfect mid-tier package to store CSV and Excel data sheets.</p>
                <div className="price-amount">
                  <span className="price-num">$6.99</span>
                  <span className="price-period">/mo</span>
                  <span className="saving-sub-badge">Save 30%</span>
                </div>
                <ul className="price-features">
                  <li className="price-feat">✓ <span>Flat 5 GB additional workspace</span></li>
                  <li className="price-feat">✓ <span>Equivalent to $1.40/GB rate</span></li>
                  <li className="price-feat">✓ <span>Fast upload processing queues</span></li>
                </ul>
                <button
                  onClick={() => handleCheckout("storage_5gb")}
                  disabled={loadingPlan !== null || isPlanActive("storage_5gb") || isPlanActive("analyst_pro_max")}
                  className={`g-btn price-cta ${isPlanActive("storage_5gb") ? "active-plan-btn" : ""}`}
                >
                  {loadingPlan === "storage_5gb" ? "Loading..." : isPlanActive("storage_5gb") ? "Active Plan" : isPlanActive("analyst_pro_max") ? "Included in Pro Max" : "Get 5 GB Bundle"} →
                </button>
                <div className="feat-bar" style={{ background: "var(--ui-brand-primary)" }} />
              </div>

              {/* 9 GB Block */}
              <div className="price-card" style={{ "--pa": "var(--ui-status-warning)" } as CSSProperties}>
                <div className="price-tag" style={{ color: "var(--ui-status-warning)" }}>Max Capacity</div>
                <h3 className="price-name">9 GB Bundle</h3>
                <p className="price-desc">Unlocks the absolute highest allowable extra storage capacity.</p>
                <div className="price-amount">
                  <span className="price-num">$14.99</span>
                  <span className="price-period">/mo</span>
                  <span className="saving-sub-badge">Save 16%</span>
                </div>
                <ul className="price-features">
                  <li className="price-feat">✓ <span>Flat 9 GB additional workspace</span></li>
                  <li className="price-feat">✓ <span>Reach maximum 10 GB storage limit</span></li>
                  <li className="price-feat">✓ <span>Bulk analytics upload allowed</span></li>
                </ul>
                <button
                  onClick={() => handleCheckout("storage_9gb")}
                  disabled={loadingPlan !== null || isPlanActive("storage_9gb") || isPlanActive("analyst_pro_max")}
                  className={`g-btn price-cta ${isPlanActive("storage_9gb") ? "active-plan-btn" : ""}`}
                >
                  {loadingPlan === "storage_9gb" ? "Loading..." : isPlanActive("storage_9gb") ? "Active Plan" : isPlanActive("analyst_pro_max") ? "Included in Pro Max" : "Get 9 GB Bundle"} →
                </button>
                <div className="feat-bar" style={{ background: "var(--ui-status-warning)" }} />
              </div>
            </div>
          )}

          {/* Reports Tab Content */}
          {activeTab === "reports" && (
            <div className="price-grid price-grid--2col animate-fade-in">
              {/* Single Report */}
              <div className="price-card" style={{ "--pa": "var(--ui-brand-accent)" } as CSSProperties}>
                <div className="price-tag" style={{ color: "var(--ui-brand-accent)" }}>Focused</div>
                <h3 className="price-name">Single Market Report</h3>
                <p className="price-desc">Select one region and receive automatic PDF summaries via email.</p>
                
                {/* Region selector pills */}
                <div className="region-selector">
                  <button
                    className={`region-pill ${selectedRegion === "egypt" ? "region-pill--active" : ""}`}
                    onClick={() => setSelectedRegion("egypt")}
                  >
                    🇪🇬 Egypt
                  </button>
                  <button
                    className={`region-pill ${selectedRegion === "dubai" ? "region-pill--active" : ""}`}
                    onClick={() => setSelectedRegion("dubai")}
                  >
                    🇦🇪 Dubai
                  </button>
                  <button
                    className={`region-pill ${selectedRegion === "england" ? "region-pill--active" : ""}`}
                    onClick={() => setSelectedRegion("england")}
                  >
                    🇬🇧 England
                  </button>
                </div>

                <div className="price-amount">
                  <span className="price-num">$3.99</span>
                  <span className="price-period">/mo</span>
                </div>
                <ul className="price-features">
                  <li className="price-feat">✓ <span>Weekly PDF analytical summaries for chosen region</span></li>
                  <li className="price-feat">✓ <span>Add to automated mailing lists</span></li>
                  <li className="price-feat">✓ <span>Switch or cancel region options anytime</span></li>
                </ul>
                <button
                  onClick={() => handleCheckout("report_single", 1, selectedRegion)}
                  disabled={loadingPlan !== null || isPlanActive("report_single", selectedRegion) || isPlanActive("report_all") || isPlanActive("analyst_pro_max")}
                  className={`g-btn price-cta ${isPlanActive("report_single", selectedRegion) ? "active-plan-btn" : ""}`}
                >
                  {loadingPlan === "report_single" 
                    ? "Loading..." 
                    : isPlanActive("report_single", selectedRegion) 
                      ? "Active for Region" 
                      : isPlanActive("report_all") || isPlanActive("analyst_pro_max") 
                        ? "Included in Bundle" 
                        : `Buy ${selectedRegion.charAt(0).toUpperCase() + selectedRegion.slice(1)} Report`} →
                </button>
                <div className="feat-bar" style={{ background: "var(--ui-brand-accent)" }} />
              </div>

              {/* All Reports Bundle */}
              <div className="price-card price-card--pop" style={{ "--pa": "var(--ui-status-warning)" } as CSSProperties}>
                <div className="price-badge">REPORTS BUNDLE</div>
                <div className="price-tag" style={{ color: "var(--ui-status-warning)" }}>Full Coverage</div>
                <h3 className="price-name">All Regions Reports</h3>
                <p className="price-desc">Subscribe to all three markets (Egypt, Dubai, England) at a massive discount.</p>
                <div className="price-amount">
                  <span className="price-num">$9.99</span>
                  <span className="price-period">/mo</span>
                  <span className="saving-sub-badge">Save 16%</span>
                </div>
                <ul className="price-features">
                  <li className="price-feat">✓ <span>Weekly and monthly analytical report digests for all regions</span></li>
                  <li className="price-feat">✓ <span>Mailing lists automated triggers for England, Dubai, Egypt</span></li>
                  <li className="price-feat">✓ <span>Consolidates single report billings automatically</span></li>
                </ul>
                <button
                  onClick={() => handleCheckout("report_all")}
                  disabled={loadingPlan !== null || isPlanActive("report_all") || isPlanActive("analyst_pro_max")}
                  className={`g-btn price-cta ${isPlanActive("report_all") ? "active-plan-btn" : ""}`}
                  style={{
                    background: "var(--ui-status-warning)",
                    color: "#000",
                    border: "1px solid var(--ui-status-warning)",
                  }}
                >
                  {loadingPlan === "report_all" ? "Loading..." : isPlanActive("report_all") ? "Active Plan" : isPlanActive("analyst_pro_max") ? "Included in Pro Max" : "Unlock All Reports"} →
                </button>
                <div className="feat-bar" style={{ background: "var(--ui-status-warning)" }} />
              </div>
            </div>
          )}

          <p className="price-note">All plans are monthly · Cancel and modify options anytime · Powered by Lemon Squeezy secure encryption</p>
        </div>
      </section>
    </GuestLayout>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ui-surface-page)",
        color: "var(--ui-content-primary)",
        fontFamily: "sans-serif"
      }}>
        Loading pricing...
      </div>
    }>
      <PricingPageContent />
    </Suspense>
  );
}

function PricingCSS() {
  return (
    <style>{`
      .pricing-page-bg {
        background: var(--ui-surface-page);
        min-height: calc(100vh - 68px);
        display: flex;
        align-items: center;
        padding: 40px 0;
      }
      .price-grid {
        display: grid;
        gap: 24px;
        align-items: stretch;
        width: 100%;
        margin-top: 16px;
      }
      .price-grid--3col {
        grid-template-columns: repeat(3, 1fr);
      }
      .price-grid--2col {
        grid-template-columns: repeat(2, 1fr);
        max-width: 900px;
        margin: 16px auto 0 auto;
      }
      @media (max-width: 960px) {
        .price-grid--3col, .price-grid--2col {
          grid-template-columns: 1fr;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }
      }

      .price-card {
        position: relative;
        overflow: hidden;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 20px;
        padding: 36px 30px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: var(--ui-shadow-card);
        transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
      }
      .price-card:hover {
        transform: translateY(-6px);
        border-color: color-mix(in srgb, var(--pa) 35%, var(--ui-border-subtle));
        box-shadow: 0 12px 30px color-mix(in srgb, var(--pa) 6%, transparent), var(--ui-shadow-card);
      }
      .price-card--pop {
        border-color: color-mix(in srgb, var(--ui-status-warning) 40%, transparent);
        box-shadow: 0 0 40px color-mix(in srgb, var(--ui-status-warning) 14%, transparent),
          var(--ui-shadow-card);
        transform: scale(1.03);
      }
      .price-card--pop:hover {
        transform: scale(1.03) translateY(-6px);
      }

      .price-badge {
        position: absolute;
        top: -13px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, var(--ui-status-warning), #b45309);
        color: #000;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 16px;
        border-radius: 20px;
        white-space: nowrap;
        letter-spacing: 0.08em;
        font-family: var(--ui-font-base);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
      }
      .price-saving {
        position: absolute;
        top: 16px;
        right: 16px;
        background: color-mix(in srgb, var(--ui-status-warning) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--ui-status-warning) 28%, transparent);
        color: var(--ui-status-warning);
        font-size: 10px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 8px;
        font-family: var(--ui-font-base);
        text-transform: uppercase;
      }
      .price-tag {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-family: var(--ui-font-base);
      }
      .price-name {
        font-family: var(--ui-font-logo);
        font-size: 22px;
        font-weight: 700;
        color: var(--ui-content-strong);
      }
      .price-desc {
        font-size: 14px;
        color: var(--ui-content-secondary);
        line-height: 1.6;
        font-family: var(--ui-font-base);
        min-height: 44px;
      }
      .price-amount {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin: 8px 0;
      }
      .price-num {
        font-family: var(--ui-font-logo);
        font-size: 38px;
        font-weight: 800;
        color: var(--ui-content-strong);
      }
      .price-period {
        font-size: 15px;
        color: var(--ui-content-muted);
        font-family: var(--ui-font-base);
      }
      .saving-sub-badge {
        font-size: 11px;
        font-weight: 600;
        background: #15803d;
        color: #fff;
        padding: 2px 8px;
        border-radius: 4px;
        margin-left: 8px;
        align-self: center;
      }
      .price-features {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex: 1;
        margin: 8px 0 16px 0;
        padding: 0;
      }
      .price-feat {
        display: flex;
        gap: 12px;
        font-size: 14px;
        color: var(--ui-content-primary);
        font-family: var(--ui-font-base);
        line-height: 1.4;
      }
      .price-feat span:first-child {
        font-weight: bold;
        flex-shrink: 0;
      }
      .price-note {
        text-align: center;
        font-size: 13px;
        color: var(--ui-content-muted);
        font-family: var(--ui-font-base);
        margin-top: 36px;
      }
      .feat-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 5px;
        width: 100%;
        opacity: 0.8;
      }

      /* Premium Tab Styles */
      .tab-switcher-container {
        display: flex;
        justify-content: center;
        margin-bottom: 32px;
        width: 100%;
      }
      .tab-switcher {
        display: inline-flex;
        background: color-mix(in srgb, var(--ui-border-subtle) 40%, transparent);
        padding: 6px;
        border-radius: 30px;
        border: 1px solid var(--ui-border-subtle);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08);
      }
      .tab-btn {
        background: transparent;
        border: none;
        color: var(--ui-content-muted);
        font-family: var(--ui-font-base);
        font-size: 14px;
        font-weight: 600;
        padding: 10px 24px;
        border-radius: 24px;
        cursor: pointer;
        transition: all 0.25s ease;
        outline: none;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .tab-btn:hover {
        color: var(--ui-content-primary);
      }
      .tab-btn--active {
        background: var(--ui-surface-card);
        color: var(--ui-content-strong);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), var(--ui-shadow-card);
      }

      /* Cloud slider styles */
      .slider-box {
        background: color-mix(in srgb, var(--ui-border-subtle) 15%, transparent);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 12px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 8px 0;
      }
      .slider-labels {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 700;
        color: var(--ui-content-muted);
      }
      .storage-range-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: var(--ui-border-subtle);
        outline: none;
        cursor: pointer;
      }
      .storage-range-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--ui-brand-secondary);
        box-shadow: 0 0 10px var(--ui-brand-secondary);
        transition: transform 0.1s;
      }
      .storage-range-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      .slider-current-val {
        text-align: center;
        font-size: 13px;
        color: var(--ui-content-primary);
      }

      /* Region selector styles */
      .region-selector {
        display: flex;
        gap: 10px;
        width: 100%;
        margin: 8px 0;
      }
      .region-pill {
        flex: 1;
        background: color-mix(in srgb, var(--ui-border-subtle) 20%, transparent);
        border: 1px solid var(--ui-border-subtle);
        color: var(--ui-content-primary);
        font-size: 13px;
        font-weight: 600;
        padding: 10px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        outline: none;
      }
      .region-pill:hover {
        background: color-mix(in srgb, var(--ui-border-subtle) 40%, transparent);
      }
      .region-pill--active {
        background: color-mix(in srgb, var(--ui-brand-accent) 15%, transparent);
        border-color: var(--ui-brand-accent);
        color: var(--ui-brand-accent);
        box-shadow: 0 0 12px color-mix(in srgb, var(--ui-brand-accent) 20%, transparent);
      }

      /* Button CTA styling */
      .price-cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 14px 20px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.25s;
        background: transparent;
        color: var(--pa);
        border: 1px solid var(--pa);
        text-decoration: none;
        text-align: center;
      }
      .price-cta:hover:not(:disabled) {
        background: var(--pa);
        color: #000;
        box-shadow: 0 0 20px color-mix(in srgb, var(--pa) 40%, transparent);
      }
      .price-cta.disabled, .price-cta:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .active-plan-btn {
        background: color-mix(in srgb, var(--pa) 10%, transparent) !important;
        color: var(--pa) !important;
        border-color: var(--pa) !important;
        cursor: not-allowed;
      }

      /* Alert Banner */
      .alert-banner {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        padding: 16px 20px;
        border-radius: 12px;
        margin-bottom: 24px;
        font-size: 14px;
        line-height: 1.5;
        width: 100%;
        max-width: 900px;
        margin-left: auto;
        margin-right: auto;
      }
      .alert-banner--success {
        background: #14532d;
        border: 1px solid #166534;
        color: #bbf7d0;
      }
      .alert-banner--error {
        background: #7f1d1d;
        border: 1px solid #991b1b;
        color: #fecaca;
      }
      .alert-icon {
        font-size: 18px;
        font-weight: bold;
      }

      /* Keyframe animations */
      .animate-fade-in {
        animation: fadeIn 0.4s ease-out forwards;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `}</style>
  );
}
