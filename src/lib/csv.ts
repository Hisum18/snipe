/**
 * RFC 4180 CSV helpers. Pure + dependency-free so they unit-test without a DB.
 */

/** Quote a field if it contains a comma, quote, CR, or LF; double inner quotes. */
export function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Join a row of already-stringified cells. */
export function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(",");
}

/** Build a full CSV document (CRLF line endings) from a header + rows. */
export function toCsv(header: string[], rows: string[][]): string {
  return [csvRow(header), ...rows.map(csvRow)].join("\r\n");
}
