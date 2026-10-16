import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));
const actions = vi.hoisted(() =>
  Object.fromEntries(
    [
      "updateBranchAction",
      "reorderBranchesAction",
      "createTeamAction",
      "renameTeamAction",
      "setTeamActiveAction",
      "reorderTeamsAction",
      "saveLeaderAction",
      "setLeaderActiveAction",
      "reorderLeadersAction",
    ].map((name) => [name, vi.fn(async () => ({ ok: true }))]),
  ),
);
vi.mock("./actions", () => actions);
vi.mock("@/app/admin/(dashboard)/content/media-actions", () => ({}));

const { BranchesSection } = await import("./branches-section");
const { LeadersSection } = await import("./leaders-section");

const branches = [
  {
    id: "b1",
    code: "MINISTRY",
    name: "Ministry",
    description: "Beyond Sunday teams.",
    colour: "#FF5FC8",
    teams: [
      { id: "t1", name: "Bubbles", isActive: true },
      { id: "t2", name: "Grad+", isActive: false },
    ],
  },
];

beforeEach(() => vi.clearAllMocks());

describe("branches and teams", () => {
  it("saves branch details with a brand colour", async () => {
    render(<BranchesSection branches={branches} />);
    const card = screen.getByRole("region", { name: "Ministry" });
    const save = within(card).getByRole("button", { name: "Save branch" });
    expect(save).toBeDisabled();
    fireEvent.click(within(card).getByRole("radio", { name: "Orange" }));
    await act(async () => fireEvent.click(save));
    expect(actions.updateBranchAction).toHaveBeenCalledWith("MINISTRY", {
      name: "Ministry",
      description: "Beyond Sunday teams.",
      colour: "#FF7A1A",
    });
  });

  it("renames a team when you leave the field, and adds teams", async () => {
    render(<BranchesSection branches={branches} />);
    const name = screen.getByRole("textbox", { name: "Team name: Bubbles" });
    fireEvent.change(name, { target: { value: "Bubbles Café" } });
    await act(async () => fireEvent.blur(name));
    expect(actions.renameTeamAction).toHaveBeenCalledWith("t1", "Bubbles Café");

    fireEvent.change(
      screen.getByRole("textbox", { name: "New Ministry team" }),
      {
        target: { value: "Prayer" },
      },
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Add team" })),
    );
    expect(actions.createTeamAction).toHaveBeenCalledWith("MINISTRY", "Prayer");
  });

  it("toggles a team on and off", async () => {
    render(<BranchesSection branches={branches} />);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Activate Grad+" })),
    );
    expect(actions.setTeamActiveAction).toHaveBeenCalledWith("t2", true);
  });
});

describe("leaders", () => {
  const leaders = [
    {
      id: "l1",
      name: "Adanna",
      role: "Experience Lead",
      photoUrl: null,
      group: "BRANCH_LEAD" as const,
      branchCode: "EXPERIENCE",
      branchName: "Experience",
      isActive: true,
    },
    {
      id: "l2",
      name: "Pastor Joshua",
      role: "Team Lead",
      photoUrl: null,
      group: "CHURCH_FAMILY" as const,
      branchCode: null,
      branchName: null,
      isActive: true,
    },
  ];

  it("groups leaders, each group reorderable", () => {
    render(
      <LeadersSection
        leaders={leaders}
        branches={[{ code: "EXPERIENCE", name: "Experience" }]}
      />,
    );
    expect(
      within(
        screen.getByRole("list", { name: "Branch leads in order" }),
      ).getByText("Adanna"),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("list", { name: "Church family in order" }),
      ).getByText("Pastor Joshua"),
    ).toBeVisible();
    expect(screen.getByText("Nobody in this group yet.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Move Adanna" })).toBeVisible();
  });

  it("adds a leader to a group from its dialog", async () => {
    render(
      <LeadersSection
        leaders={leaders}
        branches={[{ code: "EXPERIENCE", name: "Experience" }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add to team leads" }));
    const dialog = screen.getByRole("dialog", { name: "Add a leader" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), {
      target: { value: "Tolu" },
    });
    fireEvent.change(within(dialog).getByRole("textbox", { name: /^Role/ }), {
      target: { value: "Ushers Lead" },
    });
    await act(async () =>
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Add leader" }),
      ),
    );
    expect(actions.saveLeaderAction).toHaveBeenCalledWith(null, {
      name: "Tolu",
      role: "Ushers Lead",
      photoUrl: null,
      branchCode: null,
      group: "TEAM_LEAD",
      isActive: true,
    });
  });

  it("hides a leader from the course", async () => {
    render(<LeadersSection leaders={leaders} branches={[]} />);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Hide Adanna" })),
    );
    expect(actions.setLeaderActiveAction).toHaveBeenCalledWith("l1", false);
  });
});
