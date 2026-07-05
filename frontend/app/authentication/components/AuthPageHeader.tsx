"use client";

import AuthRightRobot from "./AuthRightRobot";

interface AuthPageHeaderProps {
  title: string;
  subtitle: React.ReactNode;
}

export default function AuthPageHeader({ title, subtitle }: AuthPageHeaderProps) {
  return (
    <div className="mb-8 flex items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-[1.75rem]">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>

      <AuthRightRobot />
    </div>
  );
}
