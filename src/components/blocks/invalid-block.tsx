/**
 * Shown in place of a block that can't render. Development only: in
 * production it renders nothing so volunteers never see it.
 */
export function InvalidBlock({
  blockId,
  type,
  reason,
}: {
  blockId?: string;
  type?: string;
  reason: string;
}) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div
      role="alert"
      data-invalid-block={blockId ?? ""}
      className="rounded-md border-2 border-danger bg-danger/10 p-4 text-small text-text"
    >
      <p className="font-bold text-danger">
        Block can&apos;t render{type ? ` (${type})` : ""}
      </p>
      <p className="mt-1 font-mono break-words">{reason}</p>
      {blockId && <p className="mt-1 font-mono text-muted">id: {blockId}</p>}
    </div>
  );
}
