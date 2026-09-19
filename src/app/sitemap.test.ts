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

  it("dates a note by the day it was written, not the day of the build", () => {
    const [first] = NOTES;
    const entry = sitemap().find((e) => e.url === `${SITE_URL}/notes/${first.slug}`);
    // Compared to the millisecond: the notes are all dated today, so a
    // day-level comparison could not tell the note's date from the build's.
    expect(new Date(entry!.lastModified!).getTime()).toBe(new Date(first.date).getTime());
  });
});
