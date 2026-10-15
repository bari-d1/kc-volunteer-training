import { describe, expect, it } from "vitest";
import { csvCell, csvRow, UTF8_BOM } from "./csv";
import {
  filtersToQuery,
  matchesFilters,
  parseVolunteerFilters,
  volunteerStatus,
} from "./volunteer-status";

describe("volunteerStatus", () => {
  const status = (o: Partial<Parameters<typeof volunteerStatus>[0]>) =>
    volunteerStatus({
      hasCertificate: false,
      submittedAttempts: 0,
      completedModules: 0,
      ...o,
    });
  it("works through the stages", () => {
    expect(status({})).toBe("not-started");
    expect(status({ completedModules: 3 })).toBe("in-progress");
    expect(status({ completedModules: 11, submittedAttempts: 2 })).toBe(
      "quiz-failed",
    );
    expect(
      status({
        completedModules: 12,
        submittedAttempts: 2,
        hasCertificate: true,
      }),
    ).toBe("completed");
  });
});

describe("filters", () => {
  const NOW = new Date("2026-10-30T12:00:00Z");
  const row = {
    firstName: "Ada",
    lastName: "Okafor",
    email: "ada@example.org",
    branchInterest: "CREATIVE" as string | null,
    status: "in-progress" as const,
    lastActive: new Date("2026-10-10T12:00:00Z"),
  };

  it("reads the URL, ignoring values it doesn't know", () => {
    expect(
      parseVolunteerFilters({
        q: " ada ",
        status: "completed",
        branch: "none",
        inactive: "1",
      }),
    ).toEqual({
      q: "ada",
      status: "completed",
      branch: "none",
      inactive: true,
    });
    expect(
      parseVolunteerFilters(
        new URLSearchParams("status=sleeping&branch=SALES&inactive=yes"),
      ),
    ).toEqual({
      q: undefined,
      status: undefined,
      branch: undefined,
      inactive: false,
    });
  });

  it("round-trips to a query string for the export link", () => {
    expect(filtersToQuery({})).toBe("");
    expect(
      filtersToQuery({ q: "ada o", status: "quiz-failed", inactive: true }),
    ).toBe("?q=ada+o&status=quiz-failed&inactive=1");
  });

  it("matches name or email, status and branch", () => {
    expect(matchesFilters(row, { q: "OKAF" }, NOW)).toBe(true);
    expect(matchesFilters(row, { q: "example.org" }, NOW)).toBe(true);
    expect(matchesFilters(row, { q: "bola" }, NOW)).toBe(false);
    expect(matchesFilters(row, { status: "completed" }, NOW)).toBe(false);
    expect(matchesFilters(row, { branch: "CREATIVE" }, NOW)).toBe(true);
    expect(
      matchesFilters({ ...row, branchInterest: null }, { branch: "none" }, NOW),
    ).toBe(true);
  });

  it("counts inactive as 14+ days without activity, and never completed volunteers", () => {
    expect(matchesFilters(row, { inactive: true }, NOW)).toBe(true); // 20 days
    expect(
      matchesFilters(
        { ...row, lastActive: new Date("2026-10-20T12:00:00Z") },
        { inactive: true },
        NOW,
      ),
    ).toBe(false); // 10 days
    expect(
      matchesFilters({ ...row, status: "completed" }, { inactive: true }, NOW),
    ).toBe(false);
  });
});

describe("csv", () => {
  it("quotes where needed and neutralises formulas", () => {
    expect(csvCell("Ada")).toBe("Ada");
    expect(csvCell('O"Neil, Jr')).toBe('"O""Neil, Jr"');
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell(null)).toBe("");
    expect(csvRow(["Zoë", 3])).toBe("Zoë,3\r\n");
    expect(UTF8_BOM.charCodeAt(0)).toBe(0xfeff);
  });
});
