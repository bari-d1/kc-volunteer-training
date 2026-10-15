/** The UTF-8 byte order mark: makes Excel read accents and emoji correctly. */
export const UTF8_BOM = "﻿";

/**
 * One CSV cell: quoted when needed, and with a leading ' on values a
 * spreadsheet would run as a formula (=, +, -, @), so a name like
 * "=HYPERLINK(...)" stays text.
 */
export function csvCell(value: unknown) {
  let text =
    value == null
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(values: unknown[]) {
  return `${values.map(csvCell).join(",")}\r\n`;
}
