import type { BlockProps } from "../block-props";

export function ChecklistBlock({ title, items }: BlockProps<"CHECKLIST">) {
  return (
    <section className="flex flex-col gap-5">
      {title && <h3 className="text-h3">{title}</h3>}
      <ol className="flex flex-col divide-y divide-surface-2 border-y border-surface-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-baseline gap-5 py-4">
            <span
              aria-hidden="true"
              className="w-10 shrink-0 text-h3 font-extrabold text-lime tabular-nums"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-body-lg">{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
