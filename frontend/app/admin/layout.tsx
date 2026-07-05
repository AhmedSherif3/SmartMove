import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { NotificationProvider } from "@/lib/context/NotificationContext";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <NotificationProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </NotificationProvider>
  );
}
