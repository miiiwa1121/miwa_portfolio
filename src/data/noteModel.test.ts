import { describe, expect, it } from "vitest";
import { formatNoteDate, notePath, notesForProduct, sortNotesNewestFirst, type NoteSource } from "./noteModel";

const note = (slug: string, date: string, products: string[] = []): NoteSource => ({
  slug,
  title: slug,
  description: slug,
  date,
  tags: [],
  products,
});

describe("sortNotesNewestFirst", () => {
  it("puts the latest date first, across a month and a year boundary", () => {
    const sorted = sortNotesNewestFirst([
      note("a", "2026-08-31"),
      note("b", "2027-01-02"),
      note("c", "2026-09-01"),
    ]);
    expect(sorted.map((n) => n.slug)).toEqual(["b", "c", "a"]);
  });

  it("keeps authored order within a single day", () => {
    const sorted = sortNotesNewestFirst([
      note("first", "2026-09-19"),
      note("older", "2026-09-01"),
      note("second", "2026-09-19"),
    ]);
    expect(sorted.map((n) => n.slug)).toEqual(["first", "second", "older"]);
  });

  it("does not reorder its input", () => {
    const input = [note("a", "2026-01-01"), note("b", "2026-02-01")];
    sortNotesNewestFirst(input);
    expect(input.map((n) => n.slug)).toEqual(["a", "b"]);
  });
});

describe("notesForProduct", () => {
  it("returns only the entries that name the product, newest first", () => {
    const notes = [
      note("x", "2026-09-01", ["imadoko"]),
      note("y", "2026-09-10", ["michaw"]),
      note("z", "2026-09-05", ["michaw", "imadoko"]),
    ];
    expect(notesForProduct(notes, "imadoko").map((n) => n.slug)).toEqual(["z", "x"]);
  });
});

describe("formatNoteDate", () => {
  it("drops the leading zeros", () => {
    expect(formatNoteDate("2026-09-01")).toBe("2026年9月1日");
  });

  it("does not shift the day by the local time zone", () => {
    // `new Date("2026-01-01")` is midnight UTC, i.e. 2025-12-31 west of it.
    // Run west of UTC on purpose: in Japan (UTC+9) a Date-based version
    // would print the right day and this test would prove nothing.
    const zone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(formatNoteDate("2026-01-01")).toBe("2026年1月1日");
    } finally {
      if (zone === undefined) delete process.env.TZ;
      else process.env.TZ = zone;
    }
  });

  it("refuses anything but YYYY-MM-DD", () => {
    expect(() => formatNoteDate("2026/09/19")).toThrow();
  });
});

describe("notePath", () => {
  it("serves a note under /notes", () => {
    expect(notePath("some-entry")).toBe("/notes/some-entry");
  });
});
