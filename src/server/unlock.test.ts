import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { computeModuleStates } = await import("./unlock");

const mods = (...orders: number[]) =>
  orders.map((order, i) => ({ id: `m${i + 1}`, order }));
const statuses = (states: Array<{ id: string; status: string }>) =>
  Object.fromEntries(states.map((s) => [s.id, s.status]));

describe("computeModuleStates (unlock rules)", () => {
  it("opens only the first module when nothing is completed", () => {
    expect(statuses(computeModuleStates(mods(0, 1, 2), new Set()))).toEqual({
      m1: "in-progress",
      m2: "locked",
      m3: "locked",
    });
  });

  it("unlocks each module once the previous one is completed", () => {
    expect(
      statuses(computeModuleStates(mods(0, 1, 2), new Set(["m1"]))),
    ).toEqual({
      m1: "completed",
      m2: "in-progress",
      m3: "locked",
    });
    expect(
      statuses(computeModuleStates(mods(0, 1, 2), new Set(["m1", "m2", "m3"]))),
    ).toEqual({
      m1: "completed",
      m2: "completed",
      m3: "completed",
    });
  });

  it("uses order, not input position, and tolerates gaps", () => {
    const shuffled = [
      { id: "c", order: 30 },
      { id: "a", order: 10 },
      { id: "b", order: 20 },
    ];
    const states = computeModuleStates(shuffled, new Set(["a"]));
    expect(states.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(statuses(states)).toEqual({
      a: "completed",
      b: "in-progress",
      c: "locked",
    });
  });

  it("names the module that unlocks a locked one", () => {
    const [, second, third] = computeModuleStates(mods(0, 1, 2), new Set());
    expect(second.unlockedBy?.id).toBe("m1");
    expect(third.unlockedBy?.id).toBe("m2");
  });

  it("keeps a completed module open even if an earlier one isn't completed", () => {
    // e.g. a new module was inserted earlier in the course after completion.
    expect(statuses(computeModuleStates(mods(0, 1), new Set(["m2"])))).toEqual({
      m1: "in-progress",
      m2: "completed",
    });
  });

  it("handles an empty course", () => {
    expect(computeModuleStates([], new Set())).toEqual([]);
  });
});
