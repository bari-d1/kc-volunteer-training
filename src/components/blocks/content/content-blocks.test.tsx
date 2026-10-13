import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChecklistBlock } from "./checklist-block";
import { ContactBlock } from "./contact-block";
import { HeadingBlock } from "./heading-block";
import { ImageBlock } from "./image-block";
import { LinkQrBlock } from "./link-qr-block";
import { TextBlock } from "./text-block";
import { VideoBlock } from "./video-block";

const ids = { blockId: "b1", moduleId: "m1" };

describe("HeadingBlock", () => {
  it("maps levels to h2-h4 and shows the pill", () => {
    const { rerender } = render(
      <HeadingBlock {...ids} text="Our Values" level={1} pill="OUR VALUES" />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Our Values" }),
    ).toHaveClass("uppercase");
    expect(screen.getByText("OUR VALUES")).toBeInTheDocument();

    rerender(<HeadingBlock {...ids} text="Detail" level={3} />);
    expect(
      screen.getByRole("heading", { level: 4, name: "Detail" }),
    ).toBeInTheDocument();
  });
});

describe("TextBlock", () => {
  it("renders paragraphs, bold and lists", () => {
    const { container } = render(
      <TextBlock
        {...ids}
        markdown={"Hello **team**\n\n- One\n- Two\n\n1. First"}
      />,
    );
    expect(container.querySelector("strong")).toHaveTextContent("team");
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
    expect(container.querySelectorAll("ol li")).toHaveLength(1);
  });

  it("never renders raw HTML or images", () => {
    const { container } = render(
      <TextBlock
        {...ids}
        markdown={
          '<script>alert(1)</script><b onclick="x()">bold</b>\n\n![tracker](https://evil.example/p.gif)\n\n<img src=x onerror=alert(1)>'
        }
      />,
    );
    expect(
      container.querySelector("script, b, img, [onclick], [onerror]"),
    ).toBeNull();
  });

  it("drops javascript: links", () => {
    render(<TextBlock {...ids} markdown="[click](javascript:alert(1))" />);
    expect(
      screen.getByText("click").closest("a")?.getAttribute("href") ?? "",
    ).not.toMatch(/javascript/i);
  });

  it("opens external links in a new tab and keeps internal ones", () => {
    render(
      <TextBlock
        {...ids}
        markdown="[Site](https://example.org) and [privacy](/privacy)"
      />,
    );
    const external = screen.getByRole("link", { name: /Site/ });
    expect(external).toHaveAttribute("target", "_blank");
    expect(external).toHaveAttribute("rel", "noopener noreferrer");
    expect(external).toHaveAccessibleName("Site (opens in a new tab)");
    expect(screen.getByRole("link", { name: "privacy" })).not.toHaveAttribute(
      "target",
    );
  });
});

describe("ImageBlock", () => {
  it("renders alt text and caption in a figure", () => {
    render(
      <ImageBlock
        {...ids}
        url="/fixtures/volunteers.jpg"
        alt="Volunteers"
        caption="Sunday"
      />,
    );
    const img = screen.getByRole("img", { name: "Volunteers" });
    expect(img.closest("figure")).toContainElement(screen.getByText("Sunday"));
    expect(img.getAttribute("src")).toContain("/_next/image");
  });

  it("shows hosts outside the allow list unoptimised", () => {
    render(
      <ImageBlock
        {...ids}
        url="https://cdn.example.org/a.jpg"
        alt="Elsewhere"
      />,
    );
    expect(screen.getByRole("img", { name: "Elsewhere" })).toHaveAttribute(
      "src",
      "https://cdn.example.org/a.jpg",
    );
  });
});

describe("VideoBlock", () => {
  it("uses a native player with a captions track", () => {
    const { container } = render(
      <VideoBlock
        {...ids}
        url="/videos/welcome.mp4"
        captionsUrl="/videos/welcome.vtt"
        poster="/p.jpg"
      />,
    );
    const video = container.querySelector("video")!;
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("poster", "/p.jpg");
    expect(video.querySelector('track[kind="captions"]')).toHaveAttribute(
      "src",
      "/videos/welcome.vtt",
    );
  });

  it("loads nothing from YouTube until play is pressed, then uses youtube-nocookie", async () => {
    const { container } = render(
      <VideoBlock {...ids} url="https://www.youtube.com/watch?v=aqz-KE-bpKQ" />,
    );
    expect(container.querySelector("iframe, img, video")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /Play video/ }));
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0",
    );
  });
});

describe("ChecklistBlock", () => {
  it("renders a numbered list with an optional title", () => {
    render(
      <ChecklistBlock
        {...ids}
        title="Before you serve"
        items={["Arrive early", "Pray"]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Before you serve" }),
    ).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "01Arrive early",
      "02Pray",
    ]);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

describe("ContactBlock", () => {
  it("links phones and email", () => {
    render(
      <ContactBlock
        {...ids}
        title="Safeguarding contacts"
        email="safeguarding@example.org"
        contacts={[
          { label: "DSL", name: "Grace Mensah", phone: "07700 900001" },
        ]}
      />,
    );
    expect(screen.getByText("DSL")).toHaveClass("text-lime");
    const phone = screen.getByRole("link", {
      name: "Call Grace Mensah on 07700 900001",
    });
    expect(phone).toHaveAttribute("href", "tel:07700900001");
    expect(
      screen.getByRole("link", { name: "safeguarding@example.org" }),
    ).toHaveAttribute("href", "mailto:safeguarding@example.org");
  });
});

describe("LinkQrBlock", () => {
  it("links out in a new tab and shows a desktop-only QR code", () => {
    render(
      <LinkQrBlock
        {...ids}
        label="Join the WhatsApp group"
        url="https://chat.whatsapp.com/abc"
        description="Rota updates."
      />,
    );
    const link = screen.getByRole("link", { name: /Join the WhatsApp group/ });
    expect(link).toHaveAttribute("href", "https://chat.whatsapp.com/abc");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    const qr = screen.getByRole("img", {
      name: "QR code for Join the WhatsApp group",
    });
    expect(qr.tagName.toLowerCase()).toBe("svg");
    expect(qr.closest("figure")).toHaveClass("hidden", "md:flex");
    expect(screen.getByText("Rota updates.")).toBeInTheDocument();
  });
});
