import type { Metadata } from "next";
import { LessonSkeleton } from "@/components/blocks/lesson-skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTag } from "@/components/ui/pill-tag";
import { LoadingButtonDemo, ModalDemo, ProgressDemo, ToastDemo } from "./demos";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false },
};

const colors = [
  { name: "bg", hex: "#191919", className: "bg-bg" },
  { name: "surface", hex: "#222222", className: "bg-surface" },
  { name: "surface-2", hex: "#2C2C2C", className: "bg-surface-2" },
  { name: "lime", hex: "#D9FF3D", className: "bg-lime" },
  { name: "lime-dark", hex: "#849A2C", className: "bg-lime-dark" },
  { name: "text", hex: "#FFFFFF", className: "bg-text" },
  { name: "muted", hex: "#9A9A9A", className: "bg-muted" },
  { name: "ink", hex: "#191919", className: "bg-ink" },
  {
    name: "branch-experience",
    hex: "#D9FF3D",
    className: "bg-branch-experience",
  },
  { name: "branch-ministry", hex: "#FF5FC8", className: "bg-branch-ministry" },
  { name: "branch-creative", hex: "#FF7A1A", className: "bg-branch-creative" },
  { name: "branch-systems", hex: "#33D6F5", className: "bg-branch-systems" },
  { name: "success", hex: "#3DDC84", className: "bg-success" },
  { name: "danger", hex: "#FF5A5F", className: "bg-danger" },
];

const typeScale = [
  { name: "display", className: "text-display", spec: "44px → 80px · 800" },
  { name: "h1", className: "text-h1", spec: "36px → 56px · 800" },
  { name: "h2", className: "text-h2", spec: "28px → 40px · 800" },
  { name: "h3", className: "text-h3", spec: "22px → 28px · 800" },
  { name: "body-lg", className: "text-body-lg", spec: "18px → 20px" },
  { name: "body", className: "text-body", spec: "16px" },
  { name: "small", className: "text-small", spec: "14px" },
  { name: "label", className: "text-label", spec: "12px · 700 · 0.12em" },
];

const radii = [
  { name: "sm", value: "8px", className: "rounded-sm" },
  { name: "md", value: "12px", className: "rounded-md" },
  { name: "lg", value: "20px", className: "rounded-lg" },
  { name: "pill", value: "9999px", className: "rounded-pill" },
];

// Inline SVG so the image avatar demo needs no external host.
const sampleAvatar = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#33D6F5"/><stop offset="1" stop-color="#FF5FC8"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><circle cx="40" cy="32" r="14" fill="#191919" opacity=".6"/><rect x="16" y="52" width="48" height="40" rx="24" fill="#191919" opacity=".6"/></svg>',
)}`;

const shadows = [
  { name: "card", className: "shadow-card" },
  { name: "glow", className: "shadow-glow" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-gutter py-16">
      <header className="flex flex-col gap-4">
        <span className="w-fit rounded-pill bg-lime px-3 py-1.5 text-label text-ink">
          Design tokens
        </span>
        <h1 className="text-display">Styleguide</h1>
        <p className="text-body-lg text-muted">
          Every KC token, rendered from the Tailwind theme in globals.css.
        </p>
      </header>

      <Section title="Colours">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {colors.map((color) => (
            <li
              key={color.name}
              className="overflow-hidden rounded-md bg-surface shadow-card"
            >
              <div
                className={`h-24 border-b border-surface-2 ${color.className}`}
              />
              <div className="flex flex-col gap-1 p-4">
                <span className="text-small font-semibold">{color.name}</span>
                <span className="font-mono text-small text-muted">
                  {color.hex}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type scale">
        <ul className="flex flex-col divide-y divide-surface-2">
          {typeScale.map((type) => (
            <li
              key={type.name}
              className="flex flex-col gap-2 py-6 md:flex-row md:items-baseline md:gap-8"
            >
              <span className="shrink-0 font-mono text-small text-muted md:w-48">
                {type.name}
                <br />
                {type.spec}
              </span>
              <span className={type.className}>Welcome to the team</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Radii">
        <ul className="flex flex-wrap gap-6">
          {radii.map((radius) => (
            <li key={radius.name} className="flex flex-col gap-2">
              <div
                className={`h-24 w-32 border-2 border-lime bg-surface ${radius.className}`}
              />
              <span className="text-small font-semibold">{radius.name}</span>
              <span className="font-mono text-small text-muted">
                {radius.value}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Shadows">
        <ul className="flex flex-wrap gap-8">
          {shadows.map((shadow) => (
            <li key={shadow.name} className="flex flex-col gap-3">
              <div
                className={`h-24 w-40 rounded-md bg-surface ${shadow.className}`}
              />
              <span className="text-small font-semibold">{shadow.name}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="w-fit rounded-pill bg-surface-2 px-5 py-3 text-small font-semibold"
        >
          Tab to me to see the focus ring
        </button>
      </Section>

      <Section title="Button">
        <div className="flex flex-col gap-6">
          {(["primary", "secondary", "ghost"] as const).map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-4">
              <span className="w-24 font-mono text-small text-muted">
                {variant}
              </span>
              <Button variant={variant} size="sm">
                Small
              </Button>
              <Button variant={variant}>Medium</Button>
              <Button variant={variant} size="lg">
                Large
              </Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-4">
            <span className="w-24 font-mono text-small text-muted">states</span>
            <LoadingButtonDemo />
            <Button href="/">Link to home</Button>
            <Button href="/" variant="secondary" disabled>
              Disabled link
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Pill tag">
        <div className="flex flex-wrap gap-3">
          <PillTag>Our values</PillTag>
          <PillTag branch="experience">Experience</PillTag>
          <PillTag branch="ministry">Ministry</PillTag>
          <PillTag branch="creative">Creative</PillTag>
          <PillTag branch="systems">Systems</PillTag>
        </div>
        <div className="flex flex-wrap gap-3 rounded-lg bg-lime p-6">
          <PillTag variant="filled">Our values</PillTag>
          <PillTag variant="filled" branch="ministry">
            Ministry
          </PillTag>
          <PillTag variant="filled" branch="systems">
            Systems
          </PillTag>
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <p className="text-body">Default card, md padding.</p>
          </Card>
          <Card header={<h3 className="text-h3">With header</h3>} padding="sm">
            <p className="text-body text-muted">Small padding.</p>
          </Card>
          <Card interactive padding="lg">
            <a href="#card" className="flex flex-col gap-2 rounded-sm">
              <span className="text-h3">Interactive</span>
              <span className="text-body text-muted">
                Hover or focus the link.
              </span>
            </a>
          </Card>
        </div>
      </Section>

      <Section title="Progress">
        <ProgressDemo />
      </Section>

      <Section title="Avatar">
        <div className="flex flex-wrap items-center gap-6">
          <Avatar name="Ada Okafor" size="sm" />
          <Avatar name="Ada Okafor" />
          <Avatar name="Ada Okafor" size="lg" src={sampleAvatar} />
          <Avatar name="Tobi Adeyemi" size="lg" ring="experience" />
          <Avatar name="Grace Mensah" size="lg" ring="ministry" />
          <Avatar name="Sam Lee" size="lg" ring="creative" src={sampleAvatar} />
          <Avatar name="Priya Shah" size="lg" ring="systems" />
        </div>
      </Section>

      <Section title="Skeleton">
        <Card padding="lg">
          <LessonSkeleton />
        </Card>
      </Section>

      <Section title="Empty state">
        <div className="grid gap-6 md:grid-cols-2">
          <EmptyState
            headingLevel="h3"
            title="No modules yet"
            description="Modules will appear here once your course is set up."
            action={<Button variant="secondary">Refresh</Button>}
          />
          <EmptyState
            headingLevel="h3"
            title="All caught up"
            description="You've finished every module available to you."
            icon={
              <svg
                aria-hidden="true"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            }
          />
        </div>
      </Section>

      <Section title="Modal">
        <ModalDemo />
      </Section>

      <Section title="Toast">
        <ToastDemo />
      </Section>
    </main>
  );
}
