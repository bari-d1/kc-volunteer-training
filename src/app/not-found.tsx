import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="flex min-h-[70dvh] flex-1 flex-col items-center justify-center gap-6 px-gutter py-16 text-center">
      <p
        aria-hidden="true"
        className="text-[8rem] leading-none font-extrabold tracking-[-0.02em] text-lime md:text-[12rem]"
      >
        404
      </p>
      <h1 className="text-h2">Page not found</h1>
      <p className="max-w-md text-body-lg text-muted">
        Looks like this page wandered off. Let&apos;s get you back to familiar
        ground.
      </p>
      {/* No dashboard route yet; the home page stands in until it exists. */}
      <Button href="/" size="lg">
        Back to dashboard
      </Button>
    </main>
  );
}
