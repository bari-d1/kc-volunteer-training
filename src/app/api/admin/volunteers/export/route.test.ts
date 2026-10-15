// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin }));
const listVolunteerRows = vi.hoisted(() => vi.fn());
vi.mock("@/server/admin/volunteers", () => ({ listVolunteerRows }));

const { GET } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  listVolunteerRows.mockResolvedValue([
    {
      firstName: "Zoë",
      lastName: "=cmd",
      email: "zoe@example.org",
      branchInterest: null,
      teamInterest: null,
      status: "in-progress",
      completedModules: 4,
      totalModules: 12,
      bestScore: null,
      createdAt: new Date("2026-10-01T10:00:00Z"),
      lastActive: new Date("2026-10-12T10:00:00Z"),
    },
  ]);
});

describe("GET /api/admin/volunteers/export", () => {
  it("streams a UTF-8 CSV with a BOM, using the page's filters", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/admin/volunteers/export?q=zo&status=in-progress",
      ),
    );
    expect(requireAdmin).toHaveBeenCalled();
    expect(listVolunteerRows).toHaveBeenCalledWith(
      expect.objectContaining({ q: "zo", status: "in-progress" }),
    );
    expect(response.headers.get("content-type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("content-disposition")).toMatch(
      /attachment; filename="kc-volunteers-\d{4}-\d{2}-\d{2}\.csv"/,
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = new TextDecoder().decode(bytes.slice(3)).trim().split("\r\n");
    expect(lines[0]).toMatch(/^First name,Last name,Email,Branch/);
    expect(lines[1]).toBe(
      "Zoë,'=cmd,zoe@example.org,Not sure yet,,In progress,4/12,,2026-10-01,2026-10-12",
    );
  });

  it("checks admin before reading anything", async () => {
    requireAdmin.mockRejectedValueOnce(new Error("redirect /admin/login"));
    await expect(
      GET(new Request("http://localhost/api/admin/volunteers/export")),
    ).rejects.toThrow("redirect");
    expect(listVolunteerRows).not.toHaveBeenCalled();
  });
});
