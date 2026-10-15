import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VolunteerId } from "@/lib/auth";

vi.mock("server-only", () => ({}));

const calls: string[] = [];
const prisma = {
  profile: {
    delete: vi.fn(async () => {
      calls.push("profile.delete");
    }),
    findUniqueOrThrow: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({ prisma }));

const deleteUser = vi.fn(async (): Promise<{ error: Error | null }> => {
  calls.push("auth.deleteUser");
  return { error: null };
});
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ auth: { admin: { deleteUser } } }),
}));

const { deleteAccount, exportAccountData } = await import("./account");
const id = "11111111-1111-4111-8111-111111111111" as VolunteerId;

beforeEach(() => {
  calls.length = 0;
  vi.clearAllMocks();
});

describe("deleteAccount", () => {
  it("deletes the profile (cascading its data) before the auth user", async () => {
    expect(await deleteAccount(id)).toEqual({ authUserDeleted: true });
    expect(prisma.profile.delete).toHaveBeenCalledWith({ where: { id } });
    expect(deleteUser).toHaveBeenCalledWith(id);
    expect(calls).toEqual(["profile.delete", "auth.deleteUser"]);
  });

  it("still removes training data when auth deletion fails", async () => {
    deleteUser.mockResolvedValueOnce({ error: new Error("boom") });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await deleteAccount(id)).toEqual({ authUserDeleted: false });
    expect(prisma.profile.delete).toHaveBeenCalled();
    error.mockRestore();
  });

  it("keeps the auth user if the profile delete fails", async () => {
    prisma.profile.delete.mockRejectedValueOnce(new Error("db down"));
    await expect(deleteAccount(id)).rejects.toThrow("db down");
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

describe("exportAccountData", () => {
  it("returns profile, progress, reflections, attempts and certificates with readable names", async () => {
    prisma.profile.findUniqueOrThrow.mockResolvedValue({
      id,
      email: "ada@example.com",
      firstName: "Ada",
      moduleProgress: [
        {
          moduleId: "m1",
          completedAt: null,
          module: { title: "Welcome", course: { title: "Onboarding" } },
        },
      ],
      reflectionAnswers: [
        {
          prompt: "What's required to serve?",
          answer: "A willing heart",
          module: { title: "Expectations" },
        },
      ],
      quizAttempts: [{ score: 9, total: 10, course: { title: "Onboarding" } }],
      certificates: [
        {
          certificateNumber: "KC-2026-000001",
          course: { title: "Onboarding" },
        },
      ],
    });

    const data = await exportAccountData(id);
    expect(prisma.profile.findUniqueOrThrow.mock.calls[0][0].where).toEqual({
      id,
    });
    expect(data).toMatchObject({
      profile: { id, email: "ada@example.com", firstName: "Ada" },
      moduleProgress: [
        { moduleId: "m1", module: "Welcome", course: "Onboarding" },
      ],
      reflectionAnswers: [
        {
          prompt: "What's required to serve?",
          answer: "A willing heart",
          module: "Expectations",
        },
      ],
      quizAttempts: [{ score: 9, total: 10, course: "Onboarding" }],
      certificates: [
        { certificateNumber: "KC-2026-000001", course: "Onboarding" },
      ],
    });
    expect(data.profile).not.toHaveProperty("moduleProgress");
    expect(Date.parse(data.exportedAt)).not.toBeNaN();
  });
});
