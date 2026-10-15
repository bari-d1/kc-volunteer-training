"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

/** Chart colours: email/CSS tokens can't reach SVG attributes. */
const COLOURS = {
  lime: "#D9FF3D",
  text: "#FFFFFF",
  muted: "#9A9A9A",
  grid: "#2C2C2C",
  branch: {
    EXPERIENCE: "#D9FF3D",
    MINISTRY: "#FF5FC8",
    CREATIVE: "#FF7A1A",
    SYSTEMS: "#33D6F5",
    NONE: "#9A9A9A",
  },
};

const tick = { fill: COLOURS.muted, fontSize: 12 };
const label = { fill: COLOURS.text, fontSize: 12, fontWeight: 700 };

/**
 * A chart with a visible title and the same numbers as a table for screen
 * readers (the SVG itself is hidden from them).
 */
function ChartFigure({
  title,
  description,
  table,
  children,
}: {
  title: string;
  description?: string;
  table: { headers: [string, string]; rows: Array<[string, number]> };
  children: ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-3 rounded-md border border-surface-2 bg-surface p-4">
      <figcaption className="flex flex-col gap-0.5">
        <span className="text-body font-bold">{title}</span>
        {description && (
          <span className="text-small text-muted">{description}</span>
        )}
      </figcaption>
      <div aria-hidden="true">{children}</div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{table.headers[0]}</th>
            <th scope="col">{table.headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map(([name, value]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal bars, one per row, with the value at the end of each bar. */
function HorizontalBars({
  data,
  colour,
  labelWidth,
}: {
  data: Array<{ label: string; count: number; colour?: string }>;
  colour?: string;
  labelWidth: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 30 + 16}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 40, bottom: 4, left: 0 }}
        barCategoryGap={6}
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tick={tick}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
          minPointSize={2}
        >
          {data.map((row) => (
            <Cell key={row.label} fill={row.colour ?? colour ?? COLOURS.lime} />
          ))}
          <LabelList dataKey="count" position="right" style={label} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** "Where volunteers stop": completions per module, in order. */
export function ModuleFunnelChart({
  data,
}: {
  data: Array<{ label: string; count: number }>;
}) {
  return (
    <ChartFigure
      title="Where volunteers stop"
      description="How many volunteers have completed each module, in order. A big drop shows where people stop."
      table={{
        headers: ["Step", "Volunteers"],
        rows: data.map((d) => [d.label, d.count]),
      }}
    >
      <HorizontalBars data={data} labelWidth={190} />
    </ChartFigure>
  );
}

const weekLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Sign-ups per week. */
export function WeeklySignupsChart({
  data,
}: {
  data: Array<{ weekStart: Date; count: number }>;
}) {
  const rows = data.map((d) => ({
    label: weekLabel.format(d.weekStart),
    count: d.count,
  }));
  return (
    <ChartFigure
      title="Sign-ups over time"
      description="Volunteers who signed up each week (weeks start on Monday), last 12 weeks."
      table={{
        headers: ["Week starting", "Sign-ups"],
        rows: rows.map((r) => [r.label, r.count]),
      }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={rows}
          margin={{ top: 20, right: 4, bottom: 0, left: 4 }}
        >
          <XAxis
            dataKey="label"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: COLOURS.grid }}
            interval="preserveStartEnd"
          />
          <YAxis hide allowDecimals={false} />
          <Bar
            dataKey="count"
            fill={COLOURS.lime}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="count"
              position="top"
              style={label}
              formatter={(value) => (Number(value) > 0 ? value : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

/** Volunteers by the branch they chose, in the branch colours. */
export function BranchChart({
  data,
}: {
  data: Array<{ code: string | null; label: string; count: number }>;
}) {
  const rows = data.map((d) => ({
    label: d.label,
    count: d.count,
    colour:
      COLOURS.branch[(d.code ?? "NONE") as keyof typeof COLOURS.branch] ??
      COLOURS.muted,
  }));
  return (
    <ChartFigure
      title="Branch interest"
      description="The branch volunteers chose when they signed up."
      table={{
        headers: ["Branch", "Volunteers"],
        rows: rows.map((r) => [r.label, r.count]),
      }}
    >
      <HorizontalBars data={rows} labelWidth={100} />
    </ChartFigure>
  );
}
