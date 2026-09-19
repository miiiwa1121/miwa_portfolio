import { describe, expect, it } from "vitest";
import { NOTES } from "./notes";
import { PROJECTS } from "./projects";
import { MIN_PROSE_CHARS, contentSlugs, proseLength, readContent } from "@/content/contentFiles.testutil";

describe("NOTES", () => {
  it("has a body on disk for every entry, and no body without an entry", () => {
    // A missing body fails the build (the page imports it); a body with no
    // entry fails nothing — it is simply never served.
    expect(contentSlugs("notes").sort()).toEqual(NOTES.map((n) => n.slug).sort());
  });

  it("uses each slug once, in a form that is safe in a URL", () => {
    const slugs = NOTES.map((n) => n.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("dates every entry as a real YYYY-MM-DD day", () => {
    for (const { slug, date } of NOTES) {
      const [y, m, d] = date.split("-").map(Number);
      const parsed = new Date(Date.UTC(y, m - 1, d));
      expect(/^\d{4}-\d{2}-\d{2}$/.test(date), slug).toBe(true);
      // 2026-02-30 rolls over to March in Date — a typo that sorts silently.
      expect(parsed.getUTCDate(), slug).toBe(d);
    }
  });

  it("points only at products that exist", () => {
    const known = new Set(PROJECTS.map((p) => p.slug));
    for (const note of NOTES) {
      for (const product of note.products) expect(known.has(product), `${note.slug} → ${product}`).toBe(true);
    }
  });

  it("keeps each summary short enough to be a search snippet", () => {
    // Google cuts a Japanese description at roughly 120 characters.
    for (const { slug, description } of NOTES) {
      expect(description.length, slug).toBeGreaterThan(30);
      expect(description.length, slug).toBeLessThanOrEqual(120);
    }
  });

  it("ships no entry shorter than a real page", () => {
    for (const { slug } of NOTES) {
      expect(proseLength(readContent("notes", slug)), slug).toBeGreaterThanOrEqual(MIN_PROSE_CHARS);
    }
  });

  it("does not repeat the title inside the body", () => {
    // The page draws the h1 from NOTES; an `# heading` in the MDX would be a
    // second h1 saying the same thing.
    for (const { slug } of NOTES) expect(readContent("notes", slug), slug).not.toMatch(/^# /m);
  });
});
