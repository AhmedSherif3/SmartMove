"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Linkedin, Send, Mail } from "lucide-react";
import MagneticButton from "@/components/MagneticButton";

export default function Footer() {
  return (
    <footer className="relative mt-10 border-t border-border-subtle bg-surface-card/60 text-content-primary transition-colors duration-300">
      {/* Dynamic Regional Accent Border — Connects the footer to the country system */}
      <div 
        className="absolute top-0 left-0 right-0 h-0.75 z-10 transition-all duration-700 opacity-80"
        style={{ background: "var(--ui-country-ribbon)" }}
      />
      
      {/* Decorative background glow — subtle in light mode, more pronounced in dark */}
      <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-brand-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-brand-accent/5 blur-[120px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          
          {/* Brand & Mission Section */}
          <div className="lg:col-span-6 space-y-4">
            <Link href="/" className="inline-block group transition-transform hover:scale-[1.02] active:scale-95">
              <div className="flex flex-col">
                <div className="relative h-28 w-96 max-w-full">
                  {/* Logo Image — Ultra bold presence */}
                  <Image 
                    src="/SmartMove2.png" 
                    alt="SmartMove Logo" 
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
                {/* Secondary Brand Identity in Special Font */}
                <span className="font-logo text-4xl font-black tracking-tighter text-content-strong mt-4 ml-1 transition-colors">
                  SmartMove
                </span>
              </div>
            </Link>
            
            <p className="text-lg text-content-subtle leading-relaxed max-w-lg font-medium">
              Revolutionizing global trade through intelligent logistics and supply chain 
              analytics. Moving your business across borders with absolute confidence 
              and real-time intelligence.
            </p>
            
            {/* Social Connect with Magnetic Glows */}
            <div className="flex gap-4">
              {[
                { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61589139209261", label: "Facebook", color: "#1877F2" },
                { icon: Instagram, href: "https://www.instagram.com/smartmove3711?igsh=MXBvMXZ2MWpwMXRjdA==", label: "Instagram", color: "#E4405F" },
                { icon: Linkedin, href: "#", label: "LinkedIn", color: "#0A66C2" }
              ].map((social) => (
                <MagneticButton key={social.label} strength={0.4}>
                  <Link
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-content-primary shadow-sm border border-border-subtle transition-all hover:bg-brand-primary hover:text-white group relative overflow-hidden"
                    aria-label={social.label}
                  >
                    <social.icon size={22} className="relative z-10" />
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-30 blur-2xl transition-opacity duration-300"
                      style={{ backgroundColor: social.color }}
                    />
                  </Link>
                </MagneticButton>
              ))}
            </div>
          </div>

          {/* Quick Links Group */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-8 lg:block lg:space-y-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary">Solutions</h4>
              <ul className="space-y-3">
                {[
                  { label: "MoveIQ Assistant", href: "/#features" },
                  { label: "Live Markets", href: "/#markets" },
                  { label: "Forecasting Engine", href: "/#predictions" },
                  { label: "Upgrade Plans", href: "/pricing" }
                ].map(item => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-content-subtle hover:text-brand-primary transition-all text-sm hover:translate-x-1 inline-block">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-4 lg:mt-8">
              <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary">Explore</h4>
              <ul className="space-y-3">
                {[
                  { label: "About Us", href: "/about" },
                  { label: "Contact Us", href: "/contact" },
                  { label: "Help Centre", href: "/help" }
                ].map(item => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-content-subtle hover:text-brand-primary transition-all text-sm hover:translate-x-1 inline-block">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact & Newsletter Section */}
          <div className="lg:col-span-3 space-y-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary">Join the Network</h4>
              <div className="flex gap-2 p-1 bg-surface-muted border border-border-subtle rounded-xl focus-within:border-brand-primary transition-all duration-300">
                <input 
                  type="email" 
                  placeholder="Professional email" 
                  className="bg-transparent border-none focus:ring-0 px-3 py-2 flex-1 text-xs outline-none text-content-primary placeholder:text-content-muted"
                />
                <button className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all flex items-center gap-2 font-bold text-xs shadow-lg shadow-brand-primary/20">
                  <Send size={14} />
                  <span>Join</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-border-subtle">
              <div className="flex items-center gap-3 text-content-subtle group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted group-hover:bg-brand-primary/10 transition-colors">
                  <Mail size={16} className="text-brand-primary" />
                </div>
                <span className="text-sm font-medium">contact@smartmove.com</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border-subtle flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 text-sm text-content-muted">
            <span>&copy; {new Date().getFullYear()} SmartMove Logistics</span>
            <span className="h-1 w-1 rounded-full bg-border-subtle hidden md:block" />
            <span className="hidden md:block">Engineered for Global Excellence</span>
          </div>
          
          <div className="flex gap-8 text-xs font-black uppercase tracking-[0.1em] text-content-muted flex-wrap justify-center">
            <Link href="/privacy" className="hover:text-brand-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-brand-primary transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-brand-primary transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
