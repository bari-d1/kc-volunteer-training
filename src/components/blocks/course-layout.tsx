"use client";

import { motion } from "motion/react";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { MobileDrawer } from "@/components/blocks/mobile-drawer";
import { ModuleSidebar } from "@/components/blocks/module-sidebar";
import { TopBar } from "@/components/blocks/top-bar";
import { courseProgress, type Course } from "@/lib/mock-course";

export type CourseLayoutProps = {
  course: Course;
  /** Defaults to the route's moduleId, then the in-progress module. */
  currentModuleId?: string;
  children: ReactNode;
};

export function CourseLayout({
  course,
  currentModuleId,
  children,
}: CourseLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const params = useParams<{ moduleId?: string }>();
  const activeModuleId =
    currentModuleId ??
    params?.moduleId ??
    course.modules.find((m) => m.status === "in-progress")?.id ??
    course.modules[0]?.id ??
    "";
  const progress = courseProgress(course.modules);

  // The drawer is hidden from lg up; close it so focus and scroll aren't left locked.
  useEffect(() => {
    const desktop = window.matchMedia("(width >= 64rem)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawerOpen(false);
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        courseTitle={course.title}
        progress={progress}
        menuOpen={drawerOpen}
        onMenuClick={() => setDrawerOpen(true)}
      />
      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        modules={course.modules}
        currentModuleId={activeModuleId}
        progress={progress}
      />
      <div className="flex flex-1">
        <div className="sticky top-16 hidden h-[calc(100dvh-4rem)] lg:block">
          <ModuleSidebar
            modules={course.modules}
            currentModuleId={activeModuleId}
            progress={progress}
            className="h-full overflow-y-auto"
          />
        </div>
        <main className="min-w-0 flex-1 px-gutter py-10 lg:py-16">
          {/* Keyed by path: lesson content fades in on each navigation. */}
          <motion.div
            key={pathname}
            className="mx-auto w-full max-w-[760px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
