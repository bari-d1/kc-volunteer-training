import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DataTable, type Column } from "./data-table";

type Row = { id: string; name: string; score: number };
const columns: Column<Row>[] = [
  { key: "name", header: "Name", sortValue: (r) => r.name },
  {
    key: "score",
    header: "Score",
    align: "right",
    render: (r) => `${r.score} pts`,
    sortValue: (r) => r.score,
  },
  { key: "id", header: "Id" },
];
const rows: Row[] = [
  { id: "1", name: "Bola", score: 7 },
  { id: "2", name: "ada", score: 9 },
  { id: "3", name: "Chidi", score: 3 },
];

function table(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return render(
    <DataTable
      caption="Volunteers"
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      searchText={(r) => r.name}
      {...props}
    />,
  );
}
const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);

describe("DataTable", () => {
  it("renders cells, using render functions where given", () => {
    table();
    expect(screen.getByRole("table", { name: "Volunteers" })).toBeVisible();
    expect(screen.getByText("9 pts")).toBeVisible();
  });

  it("sorts by a column, case-insensitively, toggling direction", async () => {
    table();
    const name = screen.getByRole("button", { name: /Name/ });
    await userEvent.click(name);
    expect(names()).toEqual(["ada", "Bola", "Chidi"]);
    expect(name.closest("th")).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(name);
    expect(names()).toEqual(["Chidi", "Bola", "ada"]);
    expect(name.closest("th")).toHaveAttribute("aria-sort", "descending");

    await userEvent.click(screen.getByRole("button", { name: /Score/ }));
    expect(names()).toEqual(["Chidi", "Bola", "ada"]);
    // Columns without sortValue aren't sortable.
    expect(screen.queryByRole("button", { name: /Id/ })).toBeNull();
  });

  it("filters with the search box and explains no matches", async () => {
    table();
    const search = screen.getByRole("searchbox", { name: "Search" });
    await userEvent.type(search, "bo");
    expect(names()).toEqual(["Bola"]);
    await userEvent.clear(search);
    await userEvent.type(search, "zzz");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Nothing matches “zzz”.",
    );
  });

  it("pages through long lists", async () => {
    table({ pageSize: 2, initialSort: { key: "name", direction: "asc" } });
    expect(names()).toEqual(["ada", "Bola"]);
    expect(screen.getByText("1–2 of 3")).toBeVisible();
    const previous = screen.getByRole("button", { name: "Previous" });
    expect(previous).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(names()).toEqual(["Chidi"]);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("shows an empty state with no rows", () => {
    table({
      rows: [],
      emptyTitle: "No volunteers yet",
      emptyDescription: "They appear once they sign up.",
    });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("No volunteers yet");
  });
});
