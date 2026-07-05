import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { NotificationProvider } from "@/lib/context/NotificationContext";

type UserLayoutProps = {
  children: React.ReactNode;
};

export default function UserLayout({ children }: UserLayoutProps) {
  return (
    <NotificationProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </NotificationProvider>
  );
}
