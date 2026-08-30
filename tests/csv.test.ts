import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "@/lib/csv";

describe("csvCell", () => {
  it("leaves plain values unquoted", () => {
    expect(csvCell("Acme")).toBe("Acme");
    expect(csvCell("Senior Engineer")).toBe("Senior Engineer");
  });
  it("quotes and escapes values with commas, quotes, or newlines", () => {
    expect(csvCell("Smith, Jane")).toBe('"Smith, Jane"');
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("neutralizes a field that would otherwise break rows", () => {
    // A malicious ATS title with a comma + quote can't inject extra columns.
    expect(csvCell('Engineer","admin')).toBe('"Engineer"",""admin"');
  });
});

describe("toCsv", () => {
  it("builds a CRLF document with header + rows", () => {
    const csv = toCsv(["A", "B"], [["1", "x,y"], ["2", "z"]]);
    expect(csv).toBe('A,B\r\n1,"x,y"\r\n2,z');
  });
});
