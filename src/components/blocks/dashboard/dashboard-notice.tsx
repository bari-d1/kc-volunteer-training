"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";

const notices = {
  locked: {
    title: "Finish the previous module first",
    variant: "info" as const,
  },
};

export type DashboardNoticeKey = keyof typeof notices;

export function isDashboardNotice(value: unknown): value is DashboardNoticeKey {
  return typeof value === "string" && value in notices;
}

/** Shows a one-off toast from ?notice=… and removes it from the URL. */
export function DashboardNotice({ notice }: { notice: DashboardNoticeKey }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast(notices[notice]);
    router.replace(pathname, { scroll: false });
  }, [notice, pathname, router, toast]);

  return null;
}
