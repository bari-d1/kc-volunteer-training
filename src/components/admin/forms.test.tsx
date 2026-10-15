import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fieldErrors, invalid } from "@/lib/form-errors";
import { AdminSelectField, AdminTextField } from "./form-fields";

const toast = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));
const { renderHook } = await import("@testing-library/react");
const { useSaveToast } = await import("./use-save-toast");

describe("fieldErrors", () => {
  const schema = z.object({
    title: z.string().min(1, "Give it a title"),
    options: z.array(z.object({ text: z.string().min(1, "Add the text") })),
  });

  it("keys the first message for each field by its path", () => {
    const result = schema.safeParse({
      title: "",
      options: [{ text: "a" }, { text: "" }],
    });
    expect(fieldErrors(result.error!)).toEqual({
      title: "Give it a title",
      "options.1.text": "Add the text",
    });
    expect(invalid(result.error!)).toMatchObject({
      ok: false,
      error: "Some fields need fixing.",
    });
  });
});

describe("admin form fields", () => {
  it("labels the control and announces its error", () => {
    render(
      <AdminTextField
        label="Title"
        name="title"
        error="Give it a title"
        hint="Shown on the card"
      />,
    );
    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Give it a title Shown on the card",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Give it a title");
  });

  it("has no error state when valid", () => {
    render(
      <AdminSelectField label="Branch" name="branch">
        <option>Experience</option>
      </AdminSelectField>,
    );
    expect(
      screen.getByRole("combobox", { name: "Branch" }),
    ).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("useSaveToast", () => {
  it("toasts success, the action's error, or a generic failure", async () => {
    const { result } = renderHook(() => useSaveToast());
    await result.current(async () => ({ ok: true as const }), {
      success: "Module saved",
    });
    expect(toast).toHaveBeenLastCalledWith({
      variant: "success",
      title: "Module saved",
    });

    await result.current(async () => ({
      ok: false as const,
      error: "Title is taken",
    }));
    expect(toast).toHaveBeenLastCalledWith({
      variant: "error",
      title: "Title is taken",
    });

    expect(
      await result.current(async () => {
        throw new Error("network");
      }),
    ).toEqual({ ok: false, error: "Something went wrong. Please try again." });
    expect(toast).toHaveBeenLastCalledWith({
      variant: "error",
      title: "Something went wrong. Please try again.",
    });
  });
});
