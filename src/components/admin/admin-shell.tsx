"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { adminLogout } from "@/app/admin/actions";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { ADMIN_NAV, isActiveAdminLink } from "./admin-nav-items";

function AdminPill() {
  return (
    <span className="rounded-pill bg-lime px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.08em] text-ink uppercase">
      Admin
    </span>
  );
}

/** The nav links; reads the URL, so it renders inside Suspense. */
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-0.5">
      {ADMIN_NAV.map((item) => {
        const active = isActiveAdminLink(item.href, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-small font-bold transition-colors",
                active
                  ? "bg-lime text-ink"
                  : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Links that don't know the current page, until the URL is available. */
function NavFallback() {
  return (
    <ul className="flex flex-col gap-0.5">
      {ADMIN_NAV.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex items-center rounded-md px-3 py-2 text-small font-bold text-muted"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex h-full flex-col gap-6 p-4">
      <Suspense fallback={<NavFallback />}>
        <NavLinks onNavigate={onNavigate} />
      </Suspense>
      <form action={adminLogout} className="mt-auto">
        <button
          type="submit"
          className="w-full rounded-md px-3 py-2 text-left text-small font-bold text-muted transition-colors hover:bg-surface-2 hover:text-danger"
        >
          Log out
        </button>
      </form>
    </nav>
  );
}

/**
 * The admin area's frame: a fixed sidebar on desktop, a top bar with a
 * drawer on phones, and an Admin pill so it's obvious where you are.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-surface-2 bg-bg lg:flex">
        <div className="flex h-14 items-center gap-3 border-b border-surface-2 px-4">
          <Link href="/admin" aria-label="Admin overview">
            <Logo className="h-8" alt="" />
          </Link>
          <AdminPill />
        </div>
        <Sidebar />
      </aside>

      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-surface-2 bg-bg/95 px-gutter backdrop-blur lg:hidden">
          <Dialog.Trigger
            aria-label="Open admin menu"
            className="-ml-2 grid size-10 place-items-center rounded-pill hover:bg-surface-2"
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
          </Dialog.Trigger>
          <Link href="/admin" aria-label="Admin overview">
            <Logo className="h-7" alt="" />
          </Link>
          <AdminPill />
        </header>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-bg shadow-card focus:outline-none lg:hidden">
            <div className="flex h-14 items-center justify-between border-b border-surface-2 px-4">
              <Dialog.Title className="text-small font-extrabold uppercase">
                Admin menu
              </Dialog.Title>
              <Dialog.Close
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-pill text-muted hover:bg-surface-2 hover:text-text"
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Admin sections
            </Dialog.Description>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <main className="min-w-0 flex-1 px-gutter py-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          {children}
        </div>
      </main>
    </div>
  );
}
