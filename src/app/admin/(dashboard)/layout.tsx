import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: { template: "%s · KC Admin", default: "KC Admin" },
  robots: { index: false, follow: false },
};

/**
 * Every admin page except the login. The proxy keeps signed-out visitors
 * out, and each page still calls requireAdmin() itself.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
