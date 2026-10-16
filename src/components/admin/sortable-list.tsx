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
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

function Item({
  id,
  name,
  children,
}: {
  id: string;
  name: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 bg-bg",
        isDragging && "relative z-10 rounded-md shadow-card",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Move ${name}`}
        className="grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center text-muted hover:text-text"
        {...attributes}
        {...listeners}
      >
        <svg aria-hidden="true" width="10" height="14" viewBox="0 0 10 14">
          {[3, 7, 11].flatMap((y) =>
            [3, 7].map((x) => (
              <circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r="1.2"
                fill="currentColor"
              />
            )),
          )}
        </svg>
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

/**
 * A list reordered by dragging a handle or with the keyboard (Space, arrows,
 * Space). The new order shows straight away and goes back if onReorder
 * reports failure.
 */
export function SortableList<T extends { id: string }>({
  label,
  items,
  itemName,
  onReorder,
  renderItem,
  className,
}: {
  /** Accessible name for the list. */
  label: string;
  items: T[];
  itemName: (item: T) => string;
  onReorder: (ids: string[]) => Promise<boolean>;
  renderItem: (item: T) => ReactNode;
  className?: string;
}) {
  const [local, setLocal] = useState(items);
  const [synced, setSynced] = useState(items);
  if (items !== synced) {
    setSynced(items);
    setLocal(items);
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const name = (id: unknown) => {
    const item = local.find((i) => i.id === id);
    return item ? itemName(item) : "item";
  };
  const position = (id: unknown) => local.findIndex((i) => i.id === id) + 1;

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previous = local;
    const next = arrayMove(
      local,
      local.findIndex((i) => i.id === active.id),
      local.findIndex((i) => i.id === over.id),
    );
    setLocal(next);
    if (!(await onReorder(next.map((i) => i.id)))) setLocal(previous);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${name(active.id)}, position ${position(active.id)} of ${local.length}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${name(active.id)} moved to position ${position(over.id)}.`
              : `${name(active.id)} is no longer over a position.`,
          onDragEnd: ({ active, over }) =>
            over
              ? `${name(active.id)} dropped at position ${position(over.id)}.`
              : `${name(active.id)} dropped.`,
          onDragCancel: ({ active }) =>
            `Moving ${name(active.id)} was cancelled.`,
        },
      }}
    >
      <SortableContext
        items={local.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ol aria-label={label} className={cn("flex flex-col", className)}>
          {local.map((item) => (
            <Item key={item.id} id={item.id} name={itemName(item)}>
              {renderItem(item)}
            </Item>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
