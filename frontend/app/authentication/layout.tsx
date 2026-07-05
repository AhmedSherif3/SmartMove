"use client";

import { motion } from "framer-motion";
import HeroSection from "./components/HeroSection";
import { OrbLoginProvider } from "@/components/orb/OrbLoginContext";

export default function AuthenticationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <OrbLoginProvider>
      <div className="min-h-screen bg-transparent text-content-primary dark:text-slate-200">
        <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 md:grid-cols-2">
          <HeroSection />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </OrbLoginProvider>
  );
}
