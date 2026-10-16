import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MarkdownField,
  move,
  optional,
  RepeatableList,
  TextInput,
} from "./fields";

describe("editor fields", () => {
  it("moves, adds and removes repeated items, keeping the minimum", () => {
    const onChange = vi.fn();
    render(
      <RepeatableList
        legend="Cards"
        itemLabel="Card"
        items={["Kingdom", "Excellence"]}
        onChange={onChange}
        create={() => ""}
        render={(item) => <span>{item}</span>}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Move card 2 up" }));
    expect(onChange).toHaveBeenLastCalledWith(["Excellence", "Kingdom"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove card 1" }));
    expect(onChange).toHaveBeenLastCalledWith(["Excellence"]);
    fireEvent.click(screen.getByRole("button", { name: "+ Add card" }));
    expect(onChange).toHaveBeenLastCalledWith(["Kingdom", "Excellence", ""]);
    expect(
      screen.getByRole("button", { name: "Move card 1 up" }),
    ).toBeDisabled();
  });

  it("won't remove below the minimum", () => {
    render(
      <RepeatableList
        legend="Cards"
        itemLabel="Card"
        items={["Only"]}
        onChange={() => {}}
        create={() => ""}
        render={(item) => <span>{item}</span>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Remove card 1" }),
    ).toBeDisabled();
  });

  it("previews Markdown as it'll appear", () => {
    render(
      <MarkdownField
        label="Body"
        value={"- Kingdom\n- **Excellence**"}
        onChange={() => {}}
      />,
    );
    const preview = screen.getByRole("region", { name: "Preview" });
    expect(preview.querySelectorAll("li")).toHaveLength(2);
    expect(preview.querySelector("strong")).toHaveTextContent("Excellence");
  });

  it("wires errors to the input", () => {
    render(
      <TextInput label="Front" value="" onChange={() => {}} error="Required" />,
    );
    expect(
      screen.getByRole("textbox", { name: "Front" }),
    ).toHaveAccessibleDescription("Required");
  });

  it("helpers", () => {
    expect(optional("  ")).toBeUndefined();
    expect(optional("x")).toBe("x");
    expect(move([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
  });
});
