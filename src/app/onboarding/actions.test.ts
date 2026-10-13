import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { Prisma } from "@/generated/prisma/client";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ada@example.com",
};
const getCurrentUser = vi.fn(async () => user as typeof user | null);
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUser() }));

const prisma = {
  team: { findFirst: vi.fn() },
  profile: { create: vi.fn(), findUnique: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma }));

class Redirect extends Error {
  constructor(readonly to: string) {
    super(`redirect ${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

const { completeOnboarding } = await import("./actions");

const TEAM_ID = "22222222-2222-4222-8222-222222222222";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = {
  firstName: " Ada ",
  lastName: "Okafor",
  branchInterest: "MINISTRY",
  teamId: TEAM_ID,
  consent: "on",
};

async function submit(fields: Record<string, string>) {
  try {
    return {
      state: await completeOnboarding({ status: "idle" }, form(fields)),
    };
  } catch (error) {
    if (error instanceof Redirect) return { redirect: error.to };
    throw error;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(user);
  prisma.team.findFirst.mockResolvedValue({ name: "Prayer Team" });
  prisma.profile.create.mockResolvedValue({});
});

describe("completeOnboarding", () => {
  it("creates the profile with the user id, team name and consent time, then goes to /course", async () => {
    const before = Date.now();
    const result = await submit(valid);

    expect(result).toEqual({ redirect: "/course" });
    expect(prisma.team.findFirst).toHaveBeenCalledWith({
      where: { id: TEAM_ID, isActive: true, branch: { code: "MINISTRY" } },
      select: { name: true },
    });
    const { data } = prisma.profile.create.mock.calls[0][0];
    expect(data).toMatchObject({
      id: user.id,
      email: user.email,
      firstName: "Ada",
      lastName: "Okafor",
      branchInterest: "MINISTRY",
      teamInterest: "Prayer Team",
    });
    expect(data.consentAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("stores no branch or team for “Not sure yet”", async () => {
    await submit({ ...valid, branchInterest: "NOT_SURE", teamId: "" });
    expect(prisma.team.findFirst).not.toHaveBeenCalled();
    expect(prisma.profile.create.mock.calls[0][0].data).toMatchObject({
      branchInterest: null,
      teamInterest: null,
    });
  });

  it("returns field errors and the submitted values when invalid", async () => {
    const { state } = await submit({
      firstName: "",
      lastName: "Okafor",
      teamId: "",
    });

    expect(state).toMatchObject({
      status: "error",
      values: { firstName: "", lastName: "Okafor", consent: false },
      errors: {
        firstName: "Enter your first name",
        branchInterest: "Choose a branch, or “Not sure yet”",
        consent: "Please agree so we can track your training",
      },
    });
    expect(prisma.profile.create).not.toHaveBeenCalled();
  });

  it("rejects a team outside the chosen branch or inactive", async () => {
    prisma.team.findFirst.mockResolvedValue(null);
    const { state } = await submit(valid);
    expect(state).toMatchObject({
      errors: { teamId: expect.stringContaining("isn't available") },
    });
    expect(prisma.profile.create).not.toHaveBeenCalled();
  });

  it("rejects a team with “Not sure yet”", async () => {
    const { state } = await submit({ ...valid, branchInterest: "NOT_SURE" });
    expect(state).toMatchObject({
      errors: { teamId: "Choose a branch before picking a team" },
    });
  });

  it("sends signed-out users to sign-in", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await submit(valid)).toEqual({
      redirect: "/sign-in?next=/onboarding",
    });
  });

  it("treats a double submit as success when the profile already exists", async () => {
    prisma.profile.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    prisma.profile.findUnique.mockResolvedValue({ id: user.id });
    expect(await submit(valid)).toEqual({ redirect: "/course" });
  });

  it("explains when the email belongs to another profile", async () => {
    prisma.profile.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    prisma.profile.findUnique.mockResolvedValue(null);
    const { state } = await submit(valid);
    expect(state).toMatchObject({
      formError: expect.stringContaining("already linked"),
    });
  });
});
