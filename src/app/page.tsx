import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { PillTag } from "@/components/ui/pill-tag";

const COVERED = [
  "Who KC is, our values and what we believe",
  "How KC is organised, and what's expected of a volunteer",
  "Giving, safeguarding, and our branches and teams",
  "A short final quiz, then your certificate",
];

/**
 * The landing page for signed-out visitors. Signed-in volunteers never see
 * it: the proxy sends them straight to their training.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center gap-10 px-gutter py-16">
      <Logo priority className="h-16 self-start md:h-20" />
      <div className="flex flex-col gap-5">
        <PillTag>Volunteers&apos; onboarding</PillTag>
        <h1 className="text-display">
          Welcome to the <span className="text-lime">Spiritual Costco</span>
        </h1>
        <p className="text-body-lg text-muted">
          Thank you for saying yes to serving in Kingdom Culture. This short
          course gets you ready to serve, at your own pace, on any device.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {COVERED.map((item) => (
          <li key={item} className="flex items-start gap-3 text-body-lg">
            <span
              aria-hidden="true"
              className="mt-2 size-2.5 shrink-0 rounded-pill bg-lime"
            />
            {item}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-4">
        <Button href="/course" size="lg" className="w-full sm:w-fit">
          Start your training <span aria-hidden="true">→</span>
        </Button>
        <p className="text-body text-muted">
          Already started?{" "}
          <Link
            href="/sign-in"
            className="font-bold text-lime underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          to pick up where you left off.
        </p>
      </div>
    </main>
  );
}
