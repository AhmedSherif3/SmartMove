"use client";

import type { ReactNode } from "react";
import { GuestLayout } from "@/components/guest/GuestLayout";

interface GuestPageShellProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

export function GuestPageShell({ title, subtitle, children }: GuestPageShellProps) {
  return (
    <GuestLayout>
      <section className="g-page">
        <div className="g-page-hero">
          <h1 className="g-page-title">{title}</h1>
          <p className="g-page-sub">{subtitle}</p>
        </div>
        {children}
      </section>
    </GuestLayout>
  );
}
