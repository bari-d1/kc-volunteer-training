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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  createBlockAction,
  deleteBlockAction,
  discardModuleChangesAction,
  duplicateBlockAction,
  publishModuleChangesAction,
  reorderBlocksAction,
  saveBlockDraftAction,
} from "@/app/admin/(dashboard)/content/block-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useSaveToast } from "@/components/admin/use-save-toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { BlockType } from "@/generated/prisma/client";
import {
  BLOCK_INFO,
  BLOCK_TYPES,
  summariseBlock,
  validateBlockContent,
} from "@/lib/block-editor";
import { cn } from "@/lib/cn";
import { BlockForm } from "./block-forms";
import type { Errors } from "./fields";

/** Wait this long after the last change before saving the draft. */
export const AUTOSAVE_DELAY_MS = 1000;

export type EditorBlock = {
  id: string;
  type: BlockType;
  content: unknown;
  /** Never published: volunteers don't have it yet. */
  isNew: boolean;
  /** Published, with an unpublished edit. */
  changed: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "invalid" | "error";

function TypeIcon({ type }: { type: BlockType }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2 text-[11px] font-extrabold text-lime"
    >
      {BLOCK_INFO[type].icon}
    </span>
  );
}

function BlockRow({
  block,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  block: EditorBlock;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });
  const label = BLOCK_INFO[block.type].label;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-2 rounded-md border-2 bg-bg p-2",
        selected ? "border-lime" : "border-transparent hover:border-surface-2",
        isDragging && "relative z-10 shadow-card",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Move ${label} block`}
        className="grid h-8 w-5 shrink-0 cursor-grab touch-none place-items-center text-muted hover:text-text"
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
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <TypeIcon type={block.type} />
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5 text-small font-bold">
            {label}
            {block.isNew && (
              <span className="rounded-pill bg-branch-creative/20 px-1.5 text-[10px] text-branch-creative">
                New
              </span>
            )}
            {block.changed && (
              <span className="rounded-pill bg-branch-creative/20 px-1.5 text-[10px] text-branch-creative">
                Edited
              </span>
            )}
          </span>
          <span className="sr-only">: </span>
          <span className="truncate text-[12px] text-muted">
            {summariseBlock(block.type, block.content) || "Empty"}
          </span>
        </span>
      </button>
      <div className="flex shrink-0 gap-0.5 opacity-100 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
        <button
          type="button"
          onClick={onDuplicate}
          aria-label={`Duplicate ${label} block`}
          className="rounded px-1.5 py-1 text-[12px] text-muted hover:bg-surface-2 hover:text-text"
        >
          Copy
        </button>
        <ConfirmDialog
          trigger={
            <button
              type="button"
              aria-label={`Delete ${label} block`}
              className="rounded px-1.5 py-1 text-[12px] text-danger hover:bg-surface-2"
            >
              Delete
            </button>
          }
          title={`Delete this ${label.toLowerCase()} block?`}
          description={
            block.isNew
              ? "It hasn't been published, so it's removed straight away."
              : "It's removed from the draft. Volunteers keep seeing it until you publish, and Discard changes brings it back."
          }
          confirmLabel="Delete block"
          onConfirm={onDelete}
        />
      </div>
    </li>
  );
}

function AddBlockButton({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="secondary" size="sm" className="w-full">
          + Add block
        </Button>
      }
      title="Add a block"
      description="It's added at the end of the module as a draft."
      className="max-w-2xl"
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {BLOCK_TYPES.map((type) => (
          <li key={type}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAdd(type);
              }}
              className="flex w-full items-start gap-3 rounded-md border border-surface-2 p-3 text-left hover:border-lime"
            >
              <TypeIcon type={type} />
              <span className="flex flex-col">
                <span className="text-small font-bold">
                  {BLOCK_INFO[type].label}
                </span>
                <span className="text-[12px] text-muted">
                  {BLOCK_INFO[type].description}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  invalid: "Fix the highlighted fields to save",
  error: "Couldn't save. Keep editing to try again.",
};

/**
 * The module's block editor: blocks on the left (drag to reorder), the
 * selected block's form on the right. Edits are drafts, autosaved a second
 * after typing stops if they pass the block's schema; volunteers see them
 * only after "Publish changes".
 */
export function BlockEditor({
  moduleId,
  previewHref,
  initialBlocks,
  hasUnpublishedChanges,
  deletedCount,
}: {
  moduleId: string;
  previewHref: string;
  initialBlocks: EditorBlock[];
  hasUnpublishedChanges: boolean;
  /** Published blocks removed in the draft. */
  deletedCount: number;
}) {
  const router = useRouter();
  const save = useSaveToast();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [synced, setSynced] = useState(initialBlocks);
  const [selectedId, setSelectedId] = useState(initialBlocks[0]?.id ?? null);
  const [pendingSelect, setPendingSelect] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, Errors>>({});
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [dirty, setDirty] = useState(false);
  const [, startTransition] = useTransition();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latest = useRef(new Map<string, unknown>());

  // Fresh data from the server (after adding, publishing…) replaces ours.
  if (initialBlocks !== synced) {
    setSynced(initialBlocks);
    setBlocks(initialBlocks);
    setDirty(false);
    if (pendingSelect && initialBlocks.some((b) => b.id === pendingSelect)) {
      setSelectedId(pendingSelect);
      setPendingSelect(null);
    } else if (!initialBlocks.some((b) => b.id === selectedId)) {
      setSelectedId(initialBlocks[0]?.id ?? null);
    }
  }

  const saveNow = useCallback(async (blockId: string) => {
    const timer = timers.current.get(blockId);
    if (timer) clearTimeout(timer);
    timers.current.delete(blockId);
    if (!latest.current.has(blockId)) return true;
    const content = latest.current.get(blockId);
    latest.current.delete(blockId);
    setStatus("saving");
    try {
      const result = await saveBlockDraftAction(blockId, content);
      if (!result.ok) {
        setStatus(
          "fieldErrors" in result && result.fieldErrors ? "invalid" : "error",
        );
        if ("fieldErrors" in result && result.fieldErrors) {
          setErrors((e) => ({ ...e, [blockId]: result.fieldErrors! }));
        }
        return false;
      }
      setStatus("saved");
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  }, []);

  // Save anything pending when leaving the page.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const [blockId] of pending) void saveNow(blockId);
    };
  }, [saveNow]);

  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  const change = (block: EditorBlock, content: unknown) => {
    setBlocks((all) =>
      all.map((b) =>
        b.id === block.id ? { ...b, content, changed: !b.isNew } : b,
      ),
    );
    setDirty(true);
    const check = validateBlockContent(block.type, content);
    setErrors((e) => ({ ...e, [block.id]: check.errors }));
    const timer = timers.current.get(block.id);
    if (timer) clearTimeout(timer);
    if (!check.valid) {
      // Never save invalid content.
      latest.current.delete(block.id);
      timers.current.delete(block.id);
      setStatus("invalid");
      return;
    }
    latest.current.set(block.id, content);
    setStatus("idle");
    timers.current.set(
      block.id,
      setTimeout(() => void saveNow(block.id), AUTOSAVE_DELAY_MS),
    );
  };

  const select = (id: string) => {
    if (selectedId && selectedId !== id) void saveNow(selectedId);
    setSelectedId(id);
    setStatus("idle");
  };

  const add = (type: BlockType) =>
    startTransition(async () => {
      const result = await save(() => createBlockAction(moduleId, type), {
        success: `${BLOCK_INFO[type].label} block added`,
      });
      if (result.ok && "data" in result) {
        setPendingSelect(result.data as string);
        router.refresh();
      }
    });

  const duplicate = (id: string) =>
    startTransition(async () => {
      await saveNow(id);
      const result = await save(() => duplicateBlockAction(id), {
        success: "Block duplicated",
      });
      if (result.ok && "data" in result) {
        setPendingSelect(result.data as string);
        router.refresh();
      }
    });

  const remove = async (id: string) => {
    const result = await save(() => deleteBlockAction(id), {
      success: "Block deleted",
    });
    if (result.ok) {
      latest.current.delete(id);
      router.refresh();
    }
    return result.ok;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previous = blocks;
    const next = arrayMove(
      blocks,
      blocks.findIndex((b) => b.id === active.id),
      blocks.findIndex((b) => b.id === over.id),
    );
    setBlocks(next);
    setDirty(true);
    const result = await save(
      () =>
        reorderBlocksAction(
          moduleId,
          next.map((b) => b.id),
        ),
      { success: "Order saved as a draft" },
    );
    if (!result.ok) setBlocks(previous);
  };

  const flushAll = async () => {
    const invalid = blocks.find(
      (b) => !validateBlockContent(b.type, b.content).valid,
    );
    if (invalid) {
      setSelectedId(invalid.id);
      setStatus("invalid");
      return false;
    }
    const results = await Promise.all(
      [...latest.current.keys()].map((id) => saveNow(id)),
    );
    return results.every(Boolean);
  };

  const publish = async () => {
    if (!(await flushAll())) return false;
    const result = await save(() => publishModuleChangesAction(moduleId), {
      success: "Changes published: volunteers see them now",
    });
    if (result.ok) router.refresh();
    return result.ok;
  };

  const discard = async () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    latest.current.clear();
    const result = await save(() => discardModuleChangesAction(moduleId), {
      success: "Changes discarded",
    });
    if (result.ok) {
      setErrors({});
      router.refresh();
    }
    return result.ok;
  };

  const unpublished = hasUnpublishedChanges || dirty;

  return (
    <div className="flex flex-col gap-4">
      {unpublished && (
        <div
          role="status"
          className="flex flex-col gap-1 rounded-md border-l-4 border-branch-creative bg-surface p-3 text-small"
        >
          <strong>This module has unpublished changes.</strong>
          <span className="text-muted">
            Volunteers still see the published version until you publish.
            {deletedCount > 0 &&
              ` ${deletedCount} block${deletedCount === 1 ? " is" : "s are"} marked for deletion.`}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <ConfirmDialog
          trigger={
            <Button size="sm" disabled={!unpublished}>
              Publish changes
            </Button>
          }
          title="Publish these changes?"
          description="Volunteers will see the new version of this module straight away."
          confirmLabel="Publish"
          destructive={false}
          onConfirm={publish}
        />
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" disabled={!unpublished}>
              Discard changes
            </Button>
          }
          title="Discard all unpublished changes?"
          description="Every edit, new block and deletion since the last publish is thrown away. This can't be undone."
          confirmLabel="Discard changes"
          onConfirm={discard}
        />
        <Button
          href={previewHref}
          target="_blank"
          rel="noopener"
          prefetch={false}
          variant="secondary"
          size="sm"
        >
          Preview <span className="sr-only">(opens in a new tab)</span>
        </Button>
        <span
          aria-live="polite"
          className={cn(
            "ml-auto text-small",
            status === "invalid" || status === "error"
              ? "text-danger"
              : "text-muted",
          )}
        >
          {STATUS_TEXT[status]}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <div className="flex flex-col gap-3">
          <DndContext
            id={`blocks-${moduleId}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol aria-label="Blocks in order" className="flex flex-col gap-1">
                {blocks.map((block) => (
                  <BlockRow
                    key={block.id}
                    block={block}
                    selected={block.id === selectedId}
                    onSelect={() => select(block.id)}
                    onDuplicate={() => duplicate(block.id)}
                    onDelete={() => remove(block.id)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          {blocks.length === 0 && (
            <p className="rounded-md border border-dashed border-surface-2 p-6 text-center text-small text-muted">
              No blocks yet.
            </p>
          )}
          <AddBlockButton onAdd={add} />
        </div>

        <section
          aria-label="Selected block"
          className="rounded-md border border-surface-2 bg-surface/40 p-4"
        >
          {selected ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <TypeIcon type={selected.type} />
                <h2 className="text-body font-bold">
                  {BLOCK_INFO[selected.type].label}
                </h2>
              </div>
              <BlockForm
                key={selected.id}
                type={selected.type}
                content={selected.content}
                onChange={(content) => change(selected, content)}
                errors={errors[selected.id] ?? {}}
              />
            </div>
          ) : (
            <p className="text-small text-muted">
              Choose a block to edit, or add one.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
