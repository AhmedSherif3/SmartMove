import type { ReactNode } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { NotificationProvider } from "@/lib/context/NotificationContext";

type AnalystLayoutProps = {
  children: ReactNode;
};

export default function AnalystLayout({ children }: AnalystLayoutProps) {
  return (
    <NotificationProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </NotificationProvider>
  );
}
