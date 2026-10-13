import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LessonHeading, resetLessonHeadingForTests } from "./lesson-heading";

beforeEach(() => resetLessonHeadingForTests());

describe("LessonHeading", () => {
  it("leaves focus alone on the first page load", () => {
    render(<LessonHeading>Welcome</LessonHeading>);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome" }),
    ).not.toHaveFocus();
  });

  it("takes focus after navigating to another module", () => {
    const first = render(<LessonHeading>Welcome</LessonHeading>);
    first.unmount();
    render(<LessonHeading>About KC</LessonHeading>);
    expect(
      screen.getByRole("heading", { level: 1, name: "About KC" }),
    ).toHaveFocus();
  });
});
