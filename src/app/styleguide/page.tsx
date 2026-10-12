import type { Metadata } from "next";

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
    </main>
  );
}
