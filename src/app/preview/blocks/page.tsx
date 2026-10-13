import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import {
  FIXTURE_MODULE_ID,
  fixtureVolunteerBlocks,
  invalidFixtureBlocks,
} from "@/components/blocks/__fixtures__";
import { PillTag } from "@/components/ui/pill-tag";

export const metadata: Metadata = {
  title: "Block preview",
  robots: { index: false },
};

/** Dev-only gallery of every block type. 404 in production builds. */
export default function BlocksPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-12 px-gutter py-16">
      <div className="flex flex-col gap-4">
        <PillTag>Development only</PillTag>
        <h1 className="text-h1">Block preview</h1>
        <p className="text-body-lg text-muted">
          One sample of every block type, from{" "}
          <code className="font-mono text-text">
            src/components/blocks/__fixtures__.ts
          </code>
          .
        </p>
      </div>

      <BlockRenderer
        blocks={fixtureVolunteerBlocks}
        moduleId={FIXTURE_MODULE_ID}
      />

      <section className="flex flex-col gap-4 border-t border-surface-2 pt-8">
        <h2 className="text-h3">Invalid blocks</h2>
        <p className="text-body text-muted">
          These render nothing in production and log to the console.
        </p>
        <BlockRenderer
          blocks={invalidFixtureBlocks}
          moduleId={FIXTURE_MODULE_ID}
        />
      </section>
    </main>
  );
}
