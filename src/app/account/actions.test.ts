import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const volunteerId = "11111111-1111-4111-8111-111111111111";
vi.mock("@/lib/auth", () => ({
  requireVolunteer: async () => ({ id: volunteerId }),
}));

const account = {
  updateAccountDetails: vi.fn(async () => ({})),
  deleteAccount: vi.fn(async () => ({ authUserDeleted: true })),
};
vi.mock("@/server/account", () => account);

const findActiveTeamName = vi.fn(async () => "Prayer Team" as string | null);
vi.mock("@/server/profiles", () => ({ findActiveTeamName }));

const signOut = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut } }),
}));

class Redirect extends Error {
  constructor(readonly to: string) {
    super(to);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

const { deleteMyAccount, updateAccount } = await import("./actions");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("updateAccount", () => {
  it("saves for the signed-in volunteer, ignoring any id in the form", async () => {
    const state = await updateAccount(
      { status: "idle" },
      form({
        id: "22222222-2222-4222-8222-222222222222",
        firstName: "Ada",
        lastName: "Okafor",
        branchInterest: "MINISTRY",
        teamId: "33333333-3333-4333-8333-333333333333",
      }),
    );
    expect(state.status).toBe("saved");
    expect(account.updateAccountDetails).toHaveBeenCalledWith(volunteerId, {
      firstName: "Ada",
      lastName: "Okafor",
      branchInterest: "MINISTRY",
      teamInterest: "Prayer Team",
    });
  });

  it("returns field errors without saving", async () => {
    const state = await updateAccount(
      { status: "idle" },
      form({ firstName: "", lastName: "Okafor", branchInterest: "NOT_SURE" }),
    );
    expect(state).toMatchObject({
      status: "error",
      errors: { firstName: "Enter your first name" },
    });
    expect(account.updateAccountDetails).not.toHaveBeenCalled();
  });

  it("clears branch and team for “Not sure yet”", async () => {
    await updateAccount(
      { status: "idle" },
      form({
        firstName: "Ada",
        lastName: "Okafor",
        branchInterest: "NOT_SURE",
        teamId: "",
      }),
    );
    expect(account.updateAccountDetails).toHaveBeenCalledWith(
      volunteerId,
      expect.objectContaining({ branchInterest: null, teamInterest: null }),
    );
  });
});

describe("deleteMyAccount", () => {
  it("deletes the signed-in volunteer, signs out and confirms", async () => {
    await expect(deleteMyAccount()).rejects.toMatchObject({
      to: "/account-deleted",
    });
    expect(account.deleteAccount).toHaveBeenCalledWith(volunteerId);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("tells the volunteer when the login couldn't be removed", async () => {
    account.deleteAccount.mockResolvedValueOnce({ authUserDeleted: false });
    await expect(deleteMyAccount()).rejects.toMatchObject({
      to: "/account-deleted?partial=1",
    });
    expect(signOut).toHaveBeenCalled();
  });
});
