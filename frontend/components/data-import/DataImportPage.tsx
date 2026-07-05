"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DataImportPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Gracefully redirect users manually hitting this old route to the new SmartMove Cloud workspace
    const baseRolePath = pathname.startsWith("/analyst") ? "/analyst" : "/user";
    router.replace(`${baseRolePath}/cloud`);
  }, [pathname, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-brand-primary">
      <Loader2 className="w-8 h-8 animate-spin" />
      <p className="text-sm font-semibold text-content-secondary">Redirecting to SmartMove Cloud...</p>
    </div>
  );
}
