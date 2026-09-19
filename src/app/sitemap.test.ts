import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { NOTES, PROJECTS } from "@/data";
import { SITE_URL } from "@/data/site";

const urls = sitemap().map((entry) => entry.url);

describe("sitemap", () => {
  it("lists every product's page and every note", () => {
    for (const { slug } of PROJECTS) expect(urls).toContain(`${SITE_URL}/products/${slug}`);
    for (const { slug } of NOTES) expect(urls).toContain(`${SITE_URL}/notes/${slug}`);
  });

  it("lists the two indexes, the top page and the privacy policy", () => {
    for (const path of ["", "/products", "/notes", "/privacy"]) expect(urls).toContain(`${SITE_URL}${path}`);
  });

  it("lists nothing twice and nothing off the site", () => {
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(url === SITE_URL || url.startsWith(`${SITE_URL}/`), url).toBe(true);
  });

  it("dates each note by its own date, not the day of the build", () => {
    // Compared to the millisecond: a note can be dated the day of the build,
    // and a day-level comparison could not tell the two apart.
    for (const note of NOTES) {
      const entry = sitemap().find((e) => e.url === `${SITE_URL}/notes/${note.slug}`);
      expect(new Date(entry!.lastModified!).getTime(), note.slug).toBe(new Date(note.date).getTime());
    }
  });
});
