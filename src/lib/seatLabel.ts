export type SeatLabelFormat = {
  /** e.g. "Row {row} Seat No. {seat}" */
  rowSeat: string;
  /** e.g. "♿ Row {row} Seat No. {seat}" — used when label marks accessible seating */
  wheelchairRowSeat?: string;
};

function applyTemplate(
  template: string,
  row: string,
  seat: string,
): string {
  return template.replace(/\{row\}/g, row).replace(/\{seat\}/g, seat);
}

function parseRowSeatLabel(label: string): {
  row: string;
  seat: string;
  wheelchair: boolean;
} | null {
  const trimmed = label.trim();
  const wheelchair =
    trimmed.includes("♿") ||
    /^wheelchair-/i.test(trimmed) ||
    /^w-\d/i.test(trimmed);

  const stripped = trimmed
    .replace(/^♿-?/u, "")
    .replace(/^wheelchair-?/i, "")
    .replace(/^w-/i, "");

  const match = stripped.match(/^(\d+)-(\d+)$/);
  if (!match) return null;

  return { row: match[1], seat: match[2], wheelchair };
}

/** Turns blueprint labels like `1-3` into `Row 1 Seat No. 3`. Unknown labels pass through unchanged. */
export function formatSeatLabelForDisplay(
  label: string,
  format: SeatLabelFormat,
): string {
  const parsed = parseRowSeatLabel(label);
  if (!parsed) return label;

  if (parsed.wheelchair && format.wheelchairRowSeat) {
    return applyTemplate(format.wheelchairRowSeat, parsed.row, parsed.seat);
  }

  return applyTemplate(format.rowSeat, parsed.row, parsed.seat);
}

export function formatSeatLabelsForDisplay(
  labels: string[],
  format: SeatLabelFormat,
  separator = ", ",
): string {
  return labels
    .map((label) => formatSeatLabelForDisplay(label, format))
    .join(separator);
}
