import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";

export type TopBarProps = {
  courseTitle: string;
  progress: number;
  menuOpen?: boolean;
  /** Omit when there is no module menu (e.g. the dashboard). */
  onMenuClick?: () => void;
};

/** Placeholder until the real KC logo is supplied. */
function LogoMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-12 shrink-0 place-items-center rounded-pill border-2 border-lime text-center text-[7px] leading-[1.1] font-extrabold tracking-[0.08em] text-lime"
    >
      KINGDOM
      <br />
      CULTURE
    </span>
  );
}

export function TopBar({
  courseTitle,
  progress,
  menuOpen,
  onMenuClick,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-2 bg-bg/95 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-gutter lg:px-6">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open modules menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? "mobile-module-drawer" : undefined}
            className="-ml-2 grid size-10 shrink-0 place-items-center rounded-pill transition-colors hover:bg-surface-2 lg:hidden"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
        )}
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-pill">
          <LogoMark />
          <span className="sr-only">Kingdom Culture: </span>
          <span className="truncate text-small font-extrabold tracking-[0.04em] uppercase">
            {courseTitle}
          </span>
        </Link>
        <div className="ml-auto hidden w-56 items-center gap-3 sm:flex">
          <ProgressBar value={progress} label="Overall course progress" />
          <span className="text-small font-bold tabular-nums">{progress}%</span>
        </div>
      </div>
      {/* Edge-to-edge bar on phones where the inline bar is hidden. */}
      <ProgressBar
        value={progress}
        label="Overall course progress"
        className="h-1 rounded-none sm:hidden"
      />
    </header>
  );
}
