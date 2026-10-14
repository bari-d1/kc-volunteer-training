import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const inputs = [
  { name: "state", value: 0 as number | boolean },
  { name: "talking", value: false as number | boolean },
];
const setWasmUrl = vi.fn();
const useRive = vi.fn<
  (params: Record<string, unknown>) => {
    rive: { stateMachineInputs: (name: string) => typeof inputs };
    RiveComponent: (props: Record<string, unknown>) => React.ReactElement;
  }
>(() => ({
  rive: {
    stateMachineInputs: (name: string) =>
      name === "NarratorMachine" ? inputs : [],
  },
  RiveComponent: (props: Record<string, unknown>) => <canvas {...props} />,
}));
vi.mock("@rive-app/react-canvas", () => ({
  RuntimeLoader: { setWasmUrl: (u: string) => setWasmUrl(u) },
  useRive: (p: Record<string, unknown>) => useRive(p),
  Layout: class {},
  Fit: { Contain: "contain" },
  Alignment: { Center: "center" },
}));

const { default: NarratorRive } = await import("./narrator-rive");

describe("NarratorRive", () => {
  it("serves the runtime from our own domain, once", () => {
    const props = { size: 96, onError: vi.fn(), onLoad: vi.fn() };
    render(<NarratorRive state="idle" talking={false} {...props} />);
    render(<NarratorRive state="idle" talking={false} {...props} />);
    expect(setWasmUrl).toHaveBeenCalledTimes(1);
    expect(setWasmUrl).toHaveBeenCalledWith("/narrator/rive.wasm");
  });

  it("loads the Narrator artboard and drives the state machine inputs", () => {
    const props = { size: 96, onError: vi.fn(), onLoad: vi.fn() };
    const { rerender } = render(
      <NarratorRive state="celebrate" talking={false} {...props} />,
    );
    expect(useRive.mock.calls[0][0]).toMatchObject({
      src: "/narrator/kc_narrator.riv",
      artboard: "Narrator",
      stateMachines: "NarratorMachine",
      onLoadError: props.onError,
    });
    expect(inputs).toEqual([
      { name: "state", value: 4 },
      { name: "talking", value: false },
    ]);

    rerender(<NarratorRive state="encourage" talking {...props} />);
    expect(inputs).toEqual([
      { name: "state", value: 5 },
      { name: "talking", value: true },
    ]);
  });
});
