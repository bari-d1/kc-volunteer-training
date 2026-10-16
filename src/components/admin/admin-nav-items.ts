/** The admin sidebar, in order. */
export const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/volunteers", label: "Volunteers" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/quiz", label: "Quiz" },
  { href: "/admin/people", label: "People & Teams" },
  { href: "/admin/settings", label: "Settings" },
] as const;

/** Overview matches /admin exactly; the rest also match their sub-pages. */
export function isActiveAdminLink(href: string, pathname: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}
