import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VolunteerBlock } from "@/lib/schemas/blocks";

// jsdom has no IntersectionObserver (used by Reveal).
beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// Capture the props one block component receives.
const headingProps = vi.fn();
vi.mock("./content/heading-block", () => ({
  HeadingBlock: (props: Record<string, unknown>) => {
    headingProps(props);
    return <div>HEADING</div>;
  },
}));
const knowledgeCheckProps = vi.fn();
vi.mock("./content/knowledge-check-block", () => ({
  KnowledgeCheckBlock: (props: Record<string, unknown>) => {
    knowledgeCheckProps(props);
    return <div>KNOWLEDGE_CHECK</div>;
  },
}));
vi.mock("./content/timeline-block", () => ({
  TimelineBlock: () => {
    throw new Error("timeline exploded");
  },
}));

const { BlockRenderer } = await import("./block-renderer");
const { FIXTURE_MODULE_ID, fixtureVolunteerBlocks, invalidFixtureBlocks } =
  await import("./__fixtures__");

const renderedTypes = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-block-type]")].map((el) =>
    el.getAttribute("data-block-type"),
  );

describe("BlockRenderer", () => {
  it("renders every block type in order", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const blocks = fixtureVolunteerBlocks.filter((b) => b.type !== "TIMELINE");
    const { container } = render(
      <BlockRenderer blocks={blocks} moduleId={FIXTURE_MODULE_ID} />,
    );
    expect(renderedTypes(container)).toEqual(blocks.map((b) => b.type));
    expect(new Set(fixtureVolunteerBlocks.map((b) => b.type)).size).toBe(16);
  });

  it("passes typed content plus blockId and moduleId", () => {
    const heading = fixtureVolunteerBlocks.find((b) => b.type === "HEADING")!;
    render(<BlockRenderer blocks={[heading]} moduleId={FIXTURE_MODULE_ID} />);
    expect(headingProps).toHaveBeenCalledWith({
      text: "Our Values",
      level: 1,
      pill: "OUR VALUES",
      blockId: heading.id,
      moduleId: FIXTURE_MODULE_ID,
    });
  });

  it("never hands knowledge-check answers to the component", () => {
    const check = fixtureVolunteerBlocks.find(
      (b) => b.type === "KNOWLEDGE_CHECK",
    )!;
    render(<BlockRenderer blocks={[check]} moduleId={FIXTURE_MODULE_ID} />);
    const props = JSON.stringify(knowledgeCheckProps.mock.calls[0][0]);
    expect(props).not.toContain("correctOptionId");
    expect(props).not.toContain("Always the DSL");
  });

  it("drops answer keys even if a full block slips through", () => {
    const leaked = {
      id: "x",
      type: "KNOWLEDGE_CHECK",
      content: {
        questions: [
          {
            prompt: "Q",
            options: [
              { id: "a", text: "A" },
              { id: "b", text: "B" },
            ],
            correctOptionId: "a",
            explanation: "secret",
          },
        ],
      },
    } as unknown as VolunteerBlock;
    render(<BlockRenderer blocks={[leaked]} moduleId={FIXTURE_MODULE_ID} />);
    expect(
      JSON.stringify(knowledgeCheckProps.mock.calls.at(-1)![0]),
    ).not.toContain("secret");
  });

  it("shows a warning for invalid and unknown blocks in development, and logs them", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <BlockRenderer
        blocks={invalidFixtureBlocks}
        moduleId={FIXTURE_MODULE_ID}
      />,
    );

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent("HEADING");
    expect(alerts[1]).toHaveTextContent("CAROUSEL");
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("Block invalid-content (HEADING) is invalid"),
    );
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("Block unknown-type (CAROUSEL) is invalid"),
    );
  });

  it("renders nothing for invalid blocks in production but still logs", () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <BlockRenderer
        blocks={invalidFixtureBlocks}
        moduleId={FIXTURE_MODULE_ID}
      />,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(container.textContent).toBe("");
    expect(error).toHaveBeenCalledTimes(2);
  });

  it("contains a crashing block and keeps rendering the rest", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const blocks = fixtureVolunteerBlocks.filter((b) =>
      ["HEADING", "TIMELINE", "TEXT"].includes(b.type),
    );
    const { container } = render(
      <BlockRenderer blocks={blocks} moduleId={FIXTURE_MODULE_ID} />,
    );

    expect(renderedTypes(container)).toEqual(["HEADING", "TEXT", "TIMELINE"]);
    const timeline = container.querySelector('[data-block-type="TIMELINE"]')!;
    expect(timeline).toContainElement(screen.getByRole("alert"));
    expect(screen.getByRole("alert")).toHaveTextContent("timeline exploded");
    expect(screen.getByText("HEADING")).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("(TIMELINE) crashed"),
      expect.any(Error),
    );
  });
});
