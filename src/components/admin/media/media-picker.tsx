"use client";

import { useEffect, useId, useState, useTransition } from "react";
import {
  deleteMediaAction,
  listMediaAction,
} from "@/app/admin/(dashboard)/content/media-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  formatBytes,
  MEDIA_RULES,
  type MediaKindName,
} from "@/lib/media-upload";
import { uploadMedia, type UploadStep } from "./upload-media";

type LibraryItem = {
  id: string;
  kind: MediaKindName;
  url: string;
  filename: string;
  size: number;
  altText: string | null;
};

const STEP_TEXT: Record<UploadStep, string> = {
  resizing: "Resizing…",
  uploading: "Uploading…",
  saving: "Saving…",
};

function UploadTab({
  kind,
  onUploaded,
}: {
  kind: MediaKindName;
  onUploaded: (item: { url: string; altText: string | null }) => void;
}) {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [step, setStep] = useState<UploadStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rules = MEDIA_RULES[kind];

  const upload = async () => {
    if (!file) return;
    setError(null);
    try {
      const media = await uploadMedia(kind, file, altText, setStep);
      onUploaded(media);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      setStep(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-file`} className="text-small font-bold">
          Choose a file
        </label>
        <input
          id={`${id}-file`}
          type="file"
          accept={rules.extensions.map((e) => `.${e}`).join(",")}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
          }}
          aria-describedby={`${id}-limits`}
          className="text-small file:mr-3 file:rounded-pill file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:font-bold file:text-text"
        />
        <p id={`${id}-limits`} className="text-[12px] text-muted">
          {rules.extensions
            .filter((e) => e !== "jpeg")
            .map((e) => `.${e}`)
            .join(", ")}{" "}
          up to {formatBytes(rules.maxBytes)}.
          {kind === "IMAGE" && " Wide images are resized to 2000px."}
        </p>
      </div>
      {kind === "IMAGE" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-alt`} className="text-small font-bold">
            Alt text
          </label>
          <input
            id={`${id}-alt`}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            aria-describedby={`${id}-alt-hint`}
            className="h-9 rounded-md border-2 border-surface-2 bg-surface px-3 text-small focus:border-lime"
          />
          <p id={`${id}-alt-hint`} className="text-[12px] text-muted">
            Required. Describe the image for people who can&apos;t see it.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={upload}
          disabled={!file || (kind === "IMAGE" && !altText.trim())}
          loading={step !== null}
        >
          Upload
        </Button>
        <span aria-live="polite" className="text-small text-muted">
          {step ? STEP_TEXT[step] : ""}
        </span>
      </div>
    </div>
  );
}

function LibraryTab({
  kind,
  onPick,
}: {
  kind: MediaKindName;
  onPick: (item: LibraryItem) => void;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listMediaAction(kind).then((result) => {
      if (cancelled) return;
      if (result.ok) setItems(result.data as LibraryItem[]);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  if (error) {
    return (
      <p role="alert" className="text-small text-danger">
        {error}
      </p>
    );
  }
  if (!items) return <p className="text-small text-muted">Loading…</p>;
  if (items.length === 0) {
    return (
      <p className="text-small text-muted">
        Nothing uploaded yet. Use the Upload tab.
      </p>
    );
  }

  return (
    <ul className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onPick(item)}
            className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border-2 border-surface-2 bg-surface hover:border-lime"
          >
            {item.kind === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an uploaded file
              <img
                src={item.url}
                alt={item.altText ?? ""}
                className="size-full object-cover"
              />
            ) : (
              <span className="px-2 text-center text-[12px] break-all">
                {item.filename}
              </span>
            )}
            <span className="sr-only">Use {item.filename}</span>
          </button>
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted">
            <span className="truncate">{formatBytes(item.size)}</span>
            <ConfirmDialog
              trigger={
                <button type="button" className="text-danger hover:underline">
                  Delete
                </button>
              }
              title={`Delete ${item.filename}?`}
              description="It's removed from the library and storage. Files still used in a block or by a leader can't be deleted."
              confirmLabel="Delete file"
              onConfirm={async () => {
                const result = await deleteMediaAction(item.id);
                if (!result.ok) {
                  toast({ variant: "error", title: result.error });
                  return false;
                }
                startTransition(() =>
                  setItems(
                    (all) => all?.filter((i) => i.id !== item.id) ?? null,
                  ),
                );
                toast({ variant: "success", title: "File deleted" });
                return true;
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Picks an image, video or captions file: upload a new one (straight to
 * Storage) or choose from the media library. A URL can also be pasted.
 */
export function MediaPicker({
  kind,
  label,
  value,
  onChange,
  error,
  optional = false,
}: {
  kind: MediaKindName;
  label: string;
  value: string | undefined;
  /** altText is passed when an image comes from the library or an upload. */
  onChange: (url: string | undefined, altText?: string | null) => void;
  error?: string;
  optional?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const choose = (url: string, altText: string | null) => {
    onChange(url, altText);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-small font-bold">
        {label}
      </span>
      <div className="flex items-center gap-3">
        {value && kind === "IMAGE" && (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of the chosen image
          <img
            src={value}
            alt=""
            className="size-14 shrink-0 rounded-md border border-surface-2 object-cover"
          />
        )}
        <Modal
          open={open}
          onOpenChange={setOpen}
          trigger={
            <Button
              variant="secondary"
              size="sm"
              aria-describedby={`${id}-label`}
            >
              {value ? "Change…" : `Choose ${MEDIA_RULES[kind].label}…`}
            </Button>
          }
          title={`Choose ${MEDIA_RULES[kind].label}`}
          className="max-w-2xl"
        >
          <div role="tablist" aria-label="Source" className="flex gap-1">
            {(["upload", "library"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-pill px-3 py-1 text-small font-bold",
                  tab === key
                    ? "bg-lime text-ink"
                    : "text-muted hover:text-text",
                )}
              >
                {key === "upload" ? "Upload" : "Library"}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            {tab === "upload" ? (
              <UploadTab
                kind={kind}
                onUploaded={(m) => choose(m.url, m.altText)}
              />
            ) : (
              <LibraryTab
                kind={kind}
                onPick={(m) => choose(m.url, m.altText)}
              />
            )}
          </div>
        </Modal>
        {optional && value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Remove
          </Button>
        )}
      </div>
      <input
        aria-label={`${label} URL`}
        value={value ?? ""}
        placeholder="…or paste a URL"
        onChange={(e) => onChange(e.target.value.trim() || undefined)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "h-8 rounded-md border-2 bg-surface px-3 text-[12px] text-muted",
          error ? "border-danger" : "border-surface-2 focus:border-lime",
        )}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
