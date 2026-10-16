"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useSaveToast } from "@/components/admin/use-save-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  deleteModuleAction,
  reorderModulesAction,
  setModulePublishedAction,
} from "./actions";

export type ModuleRow = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  requiresCheck: boolean;
  blockCount: number;
  draftBlockCount: number;
  progressCount: number;
};

function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "lime" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-pill px-2 py-0.5 text-[12px] font-bold whitespace-nowrap",
        tone === "lime" && "bg-lime text-ink",
        tone === "muted" && "bg-surface-2 text-muted",
        tone === "warn" && "bg-branch-creative/20 text-branch-creative",
      )}
    >
      {children}
    </span>
  );
}

function Row({
  module: m,
  position,
  courseId,
  onChanged,
}: {
  module: ModuleRow;
  position: number;
  courseId: string;
  onChanged: () => void;
}) {
  const save = useSaveToast();
  const [pending, startTransition] = useTransition();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: m.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-wrap items-center gap-3 border-b border-surface-2 bg-bg px-3 py-2.5 last:border-b-0",
        isDragging && "relative z-10 rounded-md bg-surface shadow-card",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Move ${m.title}`}
        className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
          {[3, 7, 11].flatMap((y) =>
            [4.5, 9.5].map((x) => (
              <circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r="1.3"
                fill="currentColor"
              />
            )),
          )}
        </svg>
      </button>
      <span className="w-6 shrink-0 text-right text-small text-muted tabular-nums">
        {position}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={`/admin/content/${courseId}/modules/${m.id}`}
          className="truncate text-small font-bold hover:text-lime"
        >
          {m.title}
        </Link>
        <span className="truncate text-[12px] text-muted">/{m.slug}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {m.isPublished ? (
          <Badge tone="lime">Published</Badge>
        ) : (
          <Badge>Unpublished</Badge>
        )}
        <Badge>
          {m.blockCount} block{m.blockCount === 1 ? "" : "s"}
        </Badge>
        {m.requiresCheck && <Badge>Check required</Badge>}
        {m.draftBlockCount > 0 && (
          <Badge tone="warn">
            {m.draftBlockCount} unpublished change
            {m.draftBlockCount === 1 ? "" : "s"}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await save(
                () => setModulePublishedAction(m.id, !m.isPublished),
                {
                  success: m.isPublished
                    ? `“${m.title}” unpublished`
                    : `“${m.title}” published`,
                },
              );
              if (result.ok) onChanged();
            })
          }
        >
          {m.isPublished ? "Unpublish" : "Publish"}
        </Button>
        {m.progressCount > 0 ? (
          <span
            className="px-2 text-[12px] text-muted"
            title="Volunteers have progress on this module, so it can only be unpublished."
          >
            In use
          </span>
        ) : (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-danger">
                Delete
              </Button>
            }
            title={`Delete “${m.title}”?`}
            description="The module and all its blocks are deleted. This can't be undone."
            confirmLabel="Delete module"
            onConfirm={async () => {
              const result = await save(() => deleteModuleAction(m.id), {
                success: `“${m.title}” deleted`,
              });
              if (result.ok) onChanged();
              return result.ok;
            }}
          />
        )}
      </div>
    </li>
  );
}

/**
 * A course's modules, reordered by dragging the handle or with the
 * keyboard (Space to pick up, arrow keys to move, Space to drop). Changes
 * save straight away and undo themselves if saving fails.
 */
export function ModuleList({
  courseId,
  modules,
}: {
  courseId: string;
  modules: ModuleRow[];
}) {
  const router = useRouter();
  const save = useSaveToast();
  const [items, setItems] = useState(modules);
  const [synced, setSynced] = useState(modules);
  // New data from the server (after a save elsewhere) replaces local order.
  if (modules !== synced) {
    setSynced(modules);
    setItems(modules);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const title = (id: unknown) =>
    items.find((m) => m.id === id)?.title ?? "module";
  const position = (id: unknown) => items.findIndex((m) => m.id === id) + 1;

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previous = items;
    const next = arrayMove(
      items,
      items.findIndex((m) => m.id === active.id),
      items.findIndex((m) => m.id === over.id),
    );
    setItems(next);
    const result = await save(
      () =>
        reorderModulesAction(
          courseId,
          next.map((m) => m.id),
        ),
      { success: "Order saved" },
    );
    if (result.ok) router.refresh();
    else setItems(previous);
  };

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-surface-2 p-8 text-center text-small text-muted">
        No modules yet. Add the first one.
      </p>
    );
  }

  return (
    <DndContext
      id={`modules-${courseId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "To move a module, press Space to pick it up, use the up and down arrow keys to move it, then press Space again to drop it, or Escape to cancel.",
        },
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${title(active.id)}, position ${position(active.id)} of ${items.length}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${title(active.id)} moved to position ${position(over.id)} of ${items.length}.`
              : `${title(active.id)} is no longer over a position.`,
          onDragEnd: ({ active, over }) =>
            over
              ? `${title(active.id)} dropped at position ${position(over.id)} of ${items.length}.`
              : `${title(active.id)} dropped.`,
          onDragCancel: ({ active }) =>
            `Moving ${title(active.id)} was cancelled.`,
        },
      }}
    >
      <SortableContext
        items={items.map((m) => m.id)}
        strategy={verticalListSortingStrategy}
      >
        <ol
          aria-label="Modules in order"
          className="overflow-hidden rounded-md border border-surface-2"
        >
          {items.map((m, index) => (
            <Row
              key={m.id}
              module={m}
              position={index + 1}
              courseId={courseId}
              onChanged={() => router.refresh()}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
