"use client";

import { GuestPageShell } from "@/components/guest/GuestPageShell";

export default function TermsPage() {
  return (
    <GuestPageShell
      title="Terms of Use"
      subtitle="Transparent terms for a reliable analytics experience."
    >
      <div className="g-page-grid">
        <div className="g-page-card">
          <h3>Platform Access</h3>
          <p>Use the service responsibly and keep login details secure.</p>
          <span>Accounts are tied to individual roles.</span>
        </div>
        <div className="g-page-card">
          <h3>Service Availability</h3>
          <p>We provide uptime monitoring and proactive incident response.</p>
          <span>Check system status for live updates.</span>
        </div>
        <div className="g-page-card">
          <h3>Subscriptions</h3>
          <p>Plans renew monthly and can be canceled anytime.</p>
          <span>No hidden fees.</span>
        </div>
      </div>
    </GuestPageShell>
  );
}
