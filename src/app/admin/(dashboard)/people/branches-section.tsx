"use client";

import { useId, useState, useTransition } from "react";
import {
  AdminTextareaField,
  AdminTextField,
} from "@/components/admin/form-fields";
import { SortableList } from "@/components/admin/sortable-list";
import { useSaveToast } from "@/components/admin/use-save-toast";
import { Button } from "@/components/ui/button";
import { BRAND_PALETTE } from "@/lib/brand-palette";
import { cn } from "@/lib/cn";
import {
  createTeamAction,
  renameTeamAction,
  reorderBranchesAction,
  reorderTeamsAction,
  setTeamActiveAction,
  updateBranchAction,
} from "./actions";

export type BranchRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  colour: string;
  teams: Array<{ id: string; name: string; isActive: boolean }>;
};

function TeamRow({
  team,
}: {
  team: { id: string; name: string; isActive: boolean };
}) {
  const save = useSaveToast();
  const [name, setName] = useState(team.name);
  const [pending, startTransition] = useTransition();
  const rename = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === team.name) {
      setName(team.name);
      return;
    }
    startTransition(async () => {
      const result = await save(() => renameTeamAction(team.id, trimmed), {
        success: `Renamed to “${trimmed}”`,
      });
      if (!result.ok) setName(team.name);
    });
  };
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1",
        !team.isActive && "opacity-60",
      )}
    >
      <input
        aria-label={`Team name: ${team.name}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={rename}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setName(team.name);
        }}
        className="h-8 min-w-0 flex-1 rounded-md border-2 border-transparent bg-transparent px-2 text-small hover:border-surface-2 focus:border-lime"
      />
      <Button
        variant="ghost"
        size="sm"
        loading={pending}
        aria-label={`${team.isActive ? "Deactivate" : "Activate"} ${team.name}`}
        onClick={() =>
          startTransition(async () => {
            await save(() => setTeamActiveAction(team.id, !team.isActive), {
              success: team.isActive
                ? `“${team.name}” deactivated: hidden from onboarding`
                : `“${team.name}” activated`,
            });
          })
        }
      >
        {team.isActive ? "Active" : "Inactive"}
      </Button>
    </div>
  );
}

function Teams({ branch }: { branch: BranchRow }) {
  const save = useSaveToast();
  const [newTeam, setNewTeam] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-small font-bold">Teams</h4>
      <p className="text-[12px] text-muted">
        Inactive teams are hidden from the onboarding form but stay on the
        profiles of volunteers who already chose them.
      </p>
      <SortableList
        label={`${branch.name} teams`}
        items={branch.teams}
        itemName={(t) => t.name}
        onReorder={async (ids) =>
          (
            await save(() => reorderTeamsAction(branch.code, ids), {
              success: "Team order saved",
            })
          ).ok
        }
        renderItem={(team) => <TeamRow team={team} />}
      />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newTeam.trim()) return;
          startTransition(async () => {
            const result = await save(
              () => createTeamAction(branch.code, newTeam.trim()),
              { success: `Added “${newTeam.trim()}”` },
            );
            if (result.ok) setNewTeam("");
          });
        }}
      >
        <input
          aria-label={`New ${branch.name} team`}
          placeholder="New team name"
          value={newTeam}
          onChange={(e) => setNewTeam(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-md border-2 border-surface-2 bg-surface px-3 text-small focus:border-lime"
        />
        <Button type="submit" variant="secondary" size="sm" loading={pending}>
          Add team
        </Button>
      </form>
    </div>
  );
}

function BranchCard({ branch }: { branch: BranchRow }) {
  const save = useSaveToast();
  const colourName = useId();
  const [values, setValues] = useState({
    name: branch.name,
    description: branch.description,
    colour: branch.colour,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const changed =
    values.name !== branch.name ||
    values.description !== branch.description ||
    values.colour !== branch.colour;

  return (
    <section
      aria-label={branch.name}
      className="flex flex-col gap-4 rounded-md border border-surface-2 bg-surface p-4"
      style={{ borderLeft: `4px solid ${values.colour}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-body font-bold">{branch.name}</h3>
        <span className="text-[11px] font-bold tracking-wider text-muted">
          {branch.code}
        </span>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await save(
              () => updateBranchAction(branch.code, values),
              { success: `${values.name} saved` },
            );
            setErrors(
              !result.ok && "fieldErrors" in result
                ? (result.fieldErrors ?? {})
                : {},
            );
          });
        }}
      >
        <AdminTextField
          label="Name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          error={errors.name}
        />
        <AdminTextareaField
          label="Description"
          rows={2}
          value={values.description}
          onChange={(e) =>
            setValues({ ...values, description: e.target.value })
          }
          error={errors.description}
        />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-small font-bold">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {BRAND_PALETTE.map((c) => (
              <label
                key={c.hex}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-pill border-2 px-2.5 py-1 text-[12px] font-bold has-focus-visible:outline-2 has-focus-visible:outline-lime",
                  values.colour === c.hex ? "border-lime" : "border-surface-2",
                )}
              >
                <input
                  type="radio"
                  name={colourName}
                  className="sr-only"
                  checked={values.colour === c.hex}
                  onChange={() => setValues({ ...values, colour: c.hex })}
                />
                <span
                  aria-hidden="true"
                  className="size-3 rounded-pill"
                  style={{ background: c.hex }}
                />
                {c.name}
              </label>
            ))}
          </div>
          {errors.colour && (
            <p role="alert" className="text-[12px] text-danger">
              {errors.colour}
            </p>
          )}
        </fieldset>
        <Button
          type="submit"
          size="sm"
          disabled={!changed}
          loading={pending}
          className="self-start"
        >
          Save branch
        </Button>
      </form>
      <Teams branch={branch} />
    </section>
  );
}

/** The four branches (drag to reorder), each with its details and teams. */
export function BranchesSection({ branches }: { branches: BranchRow[] }) {
  const save = useSaveToast();
  return (
    <SortableList
      label="Branches in order"
      items={branches}
      itemName={(b) => b.name}
      className="gap-4"
      onReorder={async (ids) =>
        (
          await save(
            () =>
              reorderBranchesAction(
                ids.map((id) => branches.find((b) => b.id === id)!.code),
              ),
            { success: "Branch order saved" },
          )
        ).ok
      }
      renderItem={(branch) => <BranchCard branch={branch} />}
    />
  );
}
