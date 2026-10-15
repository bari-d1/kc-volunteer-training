import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccordionBlock } from "./accordion-block";
import { FlipCardsBlock } from "./flip-cards-block";
import { PeopleBlock } from "./people-block";
import { PyramidBlock } from "./pyramid-block";
import { ReflectionBlock } from "./reflection-block";
import { TabsBlock } from "./tabs-block";
import { TimelineBlock } from "./timeline-block";

const ids = { blockId: "b1", moduleId: "m1" };
// Final states immediately, as reduced-motion users get them.
const instant = (ui: ReactElement) =>
  render(ui, {
    wrapper: ({ children }) => (
      <MotionConfig skipAnimations>{children}</MotionConfig>
    ),
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("FlipCardsBlock", () => {
  const cards = [
    {
      front: "Kingdom.",
      back: "We seek God's kingdom first.",
      reference: "Matthew 6:33",
    },
    { front: "Family.", back: "Nobody serves alone." },
  ];

  it("flips with click, Enter and Space, and announces the meaning", async () => {
    instant(<FlipCardsBlock {...ids} cards={cards} />);
    const card = screen.getByRole("button", {
      name: /Kingdom\. Show what it means/,
    });
    expect(card).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(card).toHaveAccessibleName(
      "Kingdom.: We seek God's kingdom first. (Matthew 6:33)",
    );
    expect(
      screen.getByText("Kingdom.: We seek God's kingdom first. Matthew 6:33", {
        selector: "[aria-live]",
      }),
    ).toBeInTheDocument();

    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(card).toHaveAttribute("aria-pressed", "false");
    await userEvent.keyboard(" ");
    expect(card).toHaveAttribute("aria-pressed", "true");
  });

  it("each card flips independently", async () => {
    instant(<FlipCardsBlock {...ids} cards={cards} />);
    await userEvent.click(screen.getByRole("button", { name: /Family/ }));
    expect(screen.getByRole("button", { name: /Kingdom/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("AccordionBlock", () => {
  const items = [
    { title: "The Bible", body: "God's Word." },
    { title: "God", body: "Father, Son and Holy Spirit." },
  ];

  it("opens any number of items with linked regions", async () => {
    instant(<AccordionBlock {...ids} items={items} />);
    const bible = screen.getByRole("button", { name: "The Bible" });
    const god = screen.getByRole("button", { name: "God" });
    expect(bible).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region")).toBeNull();

    await userEvent.click(bible);
    await userEvent.click(god);
    expect(bible).toHaveAttribute("aria-expanded", "true");
    expect(god).toHaveAttribute("aria-expanded", "true");

    const region = screen.getByRole("region", { name: "The Bible" });
    expect(bible.getAttribute("aria-controls")).toBe(region.id);
    expect(region).toHaveTextContent("God's Word.");

    await userEvent.click(bible);
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "The Bible" })).toBeNull(),
    );
    expect(screen.getByRole("region", { name: "God" })).toBeInTheDocument();
  });

  it("works from the keyboard", async () => {
    instant(<AccordionBlock {...ids} items={items} />);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "The Bible" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("puts each trigger inside a heading", () => {
    instant(<AccordionBlock {...ids} items={items} />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
  });
});

describe("TabsBlock", () => {
  const tabs = [
    {
      label: "Experience",
      colour: "experience" as const,
      body: "**First impressions.**",
      items: ["Welcome", "Service Management"],
    },
    {
      label: "Ministry",
      colour: "ministry" as const,
      body: "Prayer and care.",
    },
    { label: "Systems", body: "Tech." },
  ];

  it("follows the tabs pattern with one tab in the tab order", () => {
    instant(<TabsBlock {...ids} tabs={tabs} />);
    const [experience, ministry] = screen.getAllByRole("tab");
    expect(experience).toHaveAttribute("aria-selected", "true");
    expect(experience).toHaveAttribute("tabindex", "0");
    expect(ministry).toHaveAttribute("tabindex", "-1");

    const panel = screen.getByRole("tabpanel", { name: "Experience" });
    expect(experience.getAttribute("aria-controls")).toBe(panel.id);
    expect(within(panel).getByText("First impressions.").tagName).toBe(
      "STRONG",
    );
    expect(
      within(panel)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["/1Welcome", "/2Service Management"]);
    expect(experience).toHaveClass("border-branch-experience");
  });

  it("moves with arrow keys, wraps, and supports Home/End", async () => {
    instant(<TabsBlock {...ids} tabs={tabs} />);
    const [experience, ministry, systems] = screen.getAllByRole("tab");
    experience.focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(ministry).toHaveFocus();
    expect(ministry).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("tabpanel", { name: "Ministry" }),
    ).toHaveTextContent("Prayer and care.");
    expect(ministry).toHaveClass("border-branch-ministry");

    await userEvent.keyboard("{End}");
    expect(systems).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(experience).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(systems).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(experience).toHaveFocus();
  });

  it("uses lime for tabs without a colour", async () => {
    instant(<TabsBlock {...ids} tabs={tabs} />);
    await userEvent.click(screen.getByRole("tab", { name: "Systems" }));
    expect(screen.getByRole("tab", { name: "Systems" })).toHaveClass(
      "border-lime",
    );
  });
});

describe("TimelineBlock", () => {
  const events = [
    { year: "2015", title: "A new beginning", body: "It starts." },
    { year: "2020", title: "Church online" },
    { year: "2025", title: "One family" },
  ];

  it("lists every event for small screens", () => {
    const { container } = instant(<TimelineBlock {...ids} events={events} />);
    const list = container.querySelector("ol")!;
    expect(list).toHaveClass("md:hidden");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("reveals details from the year markers by click and arrow keys", async () => {
    instant(<TimelineBlock {...ids} events={events} />);
    const markers = screen.getAllByRole("tab");
    expect(markers.map((m) => m.textContent)).toEqual(["2015", "2020", "2025"]);

    const detail = screen.getByRole("tabpanel");
    expect(detail).toHaveAttribute("aria-live", "polite");
    expect(detail).toHaveTextContent("A new beginning");

    await userEvent.click(markers[2]);
    expect(markers[2]).toHaveAttribute("aria-selected", "true");
    expect(detail).toHaveTextContent("One family");

    await userEvent.keyboard("{ArrowLeft}");
    expect(markers[1]).toHaveFocus();
    expect(detail).toHaveTextContent("Church online");
  });
});

describe("PyramidBlock", () => {
  const levels = [
    { title: "Senior Pastors", body: "Set the vision." },
    { title: "Team Leads", body: "Run each team." },
    { title: "Volunteers", body: "You." },
  ];

  it("widens toward the bottom and highlights the top level", () => {
    instant(<PyramidBlock {...ids} levels={levels} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.style.width)).toEqual(["40%", "70%", "100%"]);
    expect(buttons[0]).toHaveClass("bg-lime");
    expect(buttons[1]).not.toHaveClass("bg-lime");
  });

  it("reveals a level's description below and announces it", async () => {
    instant(<PyramidBlock {...ids} levels={levels} />);
    const leads = screen.getByRole("button", { name: "Team Leads" });
    const detail = document.getElementById(
      leads.getAttribute("aria-controls")!,
    )!;
    expect(detail).toHaveAttribute("aria-live", "polite");

    await userEvent.click(leads);
    expect(leads).toHaveAttribute("aria-expanded", "true");
    expect(detail).toHaveTextContent("Run each team.");

    await userEvent.click(leads);
    expect(leads).toHaveAttribute("aria-expanded", "false");
    expect(detail).not.toHaveTextContent("Run each team.");
  });

  it("is a plain diagram, with nothing to tap, when no level has a description", async () => {
    // Report everything as on screen so the cascade plays.
    class OnScreen {
      constructor(
        private callback: (
          entries: Partial<IntersectionObserverEntry>[],
        ) => void,
      ) {}
      observe(target: Element) {
        queueMicrotask(() =>
          this.callback([
            { isIntersecting: true, intersectionRatio: 1, target },
          ]),
        );
      }
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", OnScreen);
    instant(
      <PyramidBlock
        {...ids}
        levels={[{ title: "Team Lead" }, { title: "Volunteers" }]}
      />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByText(/Tap a level/)).toBeNull();
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual([
      "Team Lead",
      "Volunteers",
    ]);
    const boxes = items.map((i) => i.lastElementChild as HTMLElement);
    expect(boxes.map((b) => b.style.width)).toEqual(["40%", "100%"]);
    expect(boxes[0]).toHaveClass("bg-lime");
    // Every level ends fully visible once the cascade has played.
    await waitFor(() => {
      for (const item of items) expect(item.style.opacity).toBe("1");
    });
  });
});

describe("PeopleBlock", () => {
  it("shows each person with avatar, name, role and ring colour", () => {
    instant(
      <PeopleBlock
        {...ids}
        people={[
          {
            name: "Grace Mensah",
            role: "Branch Lead, Ministry",
            ringColour: "ministry",
          },
          { name: "Sam Lee", role: "Creative Lead" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(
      within(items[0]).getByRole("img", { name: "Grace Mensah" }),
    ).toBeInTheDocument();
    expect(
      within(items[0]).getByText("Branch Lead, Ministry"),
    ).toBeInTheDocument();
    expect(items[0].querySelector(".ring-branch-ministry")).not.toBeNull();
  });
});

describe("ReflectionBlock", () => {
  const props = {
    ...ids,
    prompt: "What do you think is required to serve?",
    revealTitle: "A willing heart",
    revealBody: "Skills can be taught.",
  };

  it("labels the answer box with the prompt and explains it isn't saved", () => {
    instant(<ReflectionBlock {...props} />);
    const box = screen.getByRole("textbox", { name: props.prompt });
    expect(box).toHaveAttribute("placeholder", "Type your answer");
    expect(box).toHaveAccessibleDescription(/isn't saved or sent to KC/);
  });

  it("reveals KC's answer on Compare without sending the typed answer anywhere", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    instant(<ReflectionBlock {...props} />);
    await userEvent.type(screen.getByRole("textbox"), "Being on time");

    const compare = screen.getByRole("button", { name: "Compare" });
    expect(compare).toHaveAttribute("aria-expanded", "false");
    await act(() => userEvent.click(compare));

    expect(screen.getByRole("button", { name: "Hide" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const reveal = document.getElementById(
      compare.getAttribute("aria-controls")!,
    )!;
    expect(reveal).toHaveAttribute("aria-live", "polite");
    expect(reveal).toHaveTextContent("A willing heart");
    expect(screen.getByRole("textbox")).toHaveValue("Being on time");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
