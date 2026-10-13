"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import {
  dashboardNotices,
  type DashboardNoticeKey,
} from "@/lib/dashboard-notices";

/** Shows a one-off toast from ?notice=… and removes it from the URL. */
export function DashboardNotice({ notice }: { notice: DashboardNoticeKey }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast(dashboardNotices[notice]);
    router.replace(pathname, { scroll: false });
  }, [notice, pathname, router, toast]);

  return null;
}
