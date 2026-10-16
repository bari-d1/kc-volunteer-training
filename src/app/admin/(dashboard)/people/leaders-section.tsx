"use client";

import { useState, useTransition } from "react";
import {
  AdminCheckboxField,
  AdminSelectField,
  AdminTextField,
} from "@/components/admin/form-fields";
import { MediaPicker } from "@/components/admin/media/media-picker";
import { SortableList } from "@/components/admin/sortable-list";
import { useSaveToast } from "@/components/admin/use-save-toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import {
  reorderLeadersAction,
  saveLeaderAction,
  setLeaderActiveAction,
} from "./actions";

export type LeaderRow = {
  id: string;
  name: string;
  role: string;
  photoUrl: string | null;
  group: "CHURCH_FAMILY" | "BRANCH_LEAD" | "TEAM_LEAD";
  branchCode: string | null;
  branchName: string | null;
  isActive: boolean;
};

export const GROUPS = [
  { value: "CHURCH_FAMILY", label: "Church family" },
  { value: "BRANCH_LEAD", label: "Branch leads" },
  { value: "TEAM_LEAD", label: "Team leads" },
] as const;

type FormValues = {
  name: string;
  role: string;
  photoUrl: string | null;
  branchCode: string | null;
  group: LeaderRow["group"];
  isActive: boolean;
};

function LeaderDialog({
  leader,
  branches,
  trigger,
  defaultGroup = "BRANCH_LEAD",
}: {
  leader?: LeaderRow;
  branches: Array<{ code: string; name: string }>;
  trigger: React.ReactNode;
  defaultGroup?: LeaderRow["group"];
}) {
  const save = useSaveToast();
  const [open, setOpen] = useState(false);
  const blank: FormValues = {
    name: "",
    role: "",
    photoUrl: null,
    branchCode: null,
    group: defaultGroup,
    isActive: true,
  };
  const [values, setValues] = useState<FormValues>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setValues(
            leader
              ? {
                  name: leader.name,
                  role: leader.role,
                  photoUrl: leader.photoUrl,
                  branchCode: leader.branchCode,
                  group: leader.group,
                  isActive: leader.isActive,
                }
              : blank,
          );
          setErrors({});
        }
        setOpen(next);
      }}
      trigger={trigger}
      title={leader ? `Edit ${leader.name}` : "Add a leader"}
      description="Changes show in the course straight away."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await save(
              () => saveLeaderAction(leader?.id ?? null, values),
              {
                success: leader
                  ? `${values.name} saved`
                  : `${values.name} added`,
              },
            );
            if (result.ok) setOpen(false);
            else
              setErrors(
                "fieldErrors" in result ? (result.fieldErrors ?? {}) : {},
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
        <AdminTextField
          label="Role"
          hint="e.g. Senior Pastors, JCM · Ministry Lead"
          value={values.role}
          onChange={(e) => setValues({ ...values, role: e.target.value })}
          error={errors.role}
        />
        <MediaPicker
          kind="IMAGE"
          label="Photo (optional)"
          optional
          value={values.photoUrl ?? undefined}
          onChange={(url) => setValues({ ...values, photoUrl: url ?? null })}
          error={errors.photoUrl}
        />
        <AdminSelectField
          label="Group"
          value={values.group}
          onChange={(e) =>
            setValues({
              ...values,
              group: e.target.value as FormValues["group"],
            })
          }
          error={errors.group}
        >
          {GROUPS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </AdminSelectField>
        <AdminSelectField
          label="Branch"
          hint="Sets the colour of their photo ring."
          value={values.branchCode ?? ""}
          onChange={(e) =>
            setValues({ ...values, branchCode: e.target.value || null })
          }
          error={errors.branchCode}
        >
          <option value="">None</option>
          {branches.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </AdminSelectField>
        <AdminCheckboxField
          label="Show in the course"
          checked={values.isActive}
          onChange={(e) => setValues({ ...values, isActive: e.target.checked })}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={pending}>
            {leader ? "Save" : "Add leader"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function LeaderItem({
  leader,
  branches,
}: {
  leader: LeaderRow;
  branches: Array<{ code: string; name: string }>;
}) {
  const save = useSaveToast();
  const [pending, startTransition] = useTransition();
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-surface-2 py-2",
        !leader.isActive && "opacity-60",
      )}
    >
      {leader.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
        <img
          src={leader.photoUrl}
          alt=""
          className="size-9 shrink-0 rounded-pill object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-pill bg-surface-2 text-[12px] font-bold"
        >
          {leader.name.charAt(0)}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-small font-bold">{leader.name}</span>
        <span className="truncate text-[12px] text-muted">
          {leader.role}
          {leader.branchName && ` · ${leader.branchName}`}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        loading={pending}
        aria-label={`${leader.isActive ? "Hide" : "Show"} ${leader.name}`}
        onClick={() =>
          startTransition(async () => {
            await save(
              () => setLeaderActiveAction(leader.id, !leader.isActive),
              {
                success: leader.isActive
                  ? `${leader.name} hidden`
                  : `${leader.name} shown`,
              },
            );
          })
        }
      >
        {leader.isActive ? "Shown" : "Hidden"}
      </Button>
      <LeaderDialog
        leader={leader}
        branches={branches}
        trigger={
          <Button variant="ghost" size="sm" aria-label={`Edit ${leader.name}`}>
            Edit
          </Button>
        }
      />
    </div>
  );
}

/** Leaders in their three groups, each dragged into the order shown. */
export function LeadersSection({
  leaders,
  branches,
}: {
  leaders: LeaderRow[];
  branches: Array<{ code: string; name: string }>;
}) {
  const save = useSaveToast();
  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => {
        const inGroup = leaders.filter((l) => l.group === group.value);
        return (
          <section
            key={group.value}
            aria-labelledby={`group-${group.value}`}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 id={`group-${group.value}`} className="text-body font-bold">
                {group.label}
              </h3>
              <LeaderDialog
                branches={branches}
                defaultGroup={group.value}
                trigger={
                  <Button variant="secondary" size="sm">
                    Add to {group.label.toLowerCase()}
                  </Button>
                }
              />
            </div>
            {inGroup.length === 0 ? (
              <p className="text-small text-muted">Nobody in this group yet.</p>
            ) : (
              <SortableList
                label={`${group.label} in order`}
                items={inGroup}
                itemName={(l) => l.name}
                onReorder={async (ids) =>
                  (
                    await save(() => reorderLeadersAction(group.value, ids), {
                      success: "Order saved",
                    })
                  ).ok
                }
                renderItem={(leader) => (
                  <LeaderItem leader={leader} branches={branches} />
                )}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
