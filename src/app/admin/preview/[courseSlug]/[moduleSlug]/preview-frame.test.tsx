import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PreviewFrame } from "./preview-frame";

describe("PreviewFrame", () => {
  it("shows the lesson inline at desktop width, and in a phone-width iframe for phone", () => {
    render(
      <PreviewFrame frameSrc="/admin/preview/kc/welcome?frame=1">
        <p>Lesson body</p>
      </PreviewFrame>,
    );
    expect(screen.getByText("Lesson body")).toBeVisible();
    expect(screen.queryByTitle("The module at phone width")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Phone" }));
    expect(screen.getByRole("button", { name: "Phone" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // A real narrow viewport, so the blocks' media queries apply.
    expect(screen.getByTitle("The module at phone width")).toHaveAttribute(
      "src",
      "/admin/preview/kc/welcome?frame=1",
    );
    expect(screen.queryByText("Lesson body")).toBeNull();
  });
});
