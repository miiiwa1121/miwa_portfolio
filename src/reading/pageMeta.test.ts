import { describe, expect, it } from "vitest";
import { readingMetadata } from "./pageMeta";
import { SITE_URL } from "@/data/site";

const page = { path: "/notes/some-entry", title: "Title", description: "Summary" };

describe("readingMetadata", () => {
  it("canonicalises the page to itself, not to the top page it would inherit", () => {
    const meta = readingMetadata(page);
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/notes/some-entry`);
    expect(meta.alternates?.canonical).not.toBe(SITE_URL);
  });

  it("gives link previews the same URL as the canonical", () => {
    const meta = readingMetadata(page);
    expect(meta.openGraph?.url).toBe(meta.alternates?.canonical);
  });

  it("carries the site name and locale that replacing the layout's openGraph would drop", () => {
    const og = readingMetadata(page).openGraph as { siteName?: string; locale?: string };
    expect(og.siteName).toBe("Miiiwa Portfolio");
    expect(og.locale).toBe("ja_JP");
  });

  it("makes the preview image absolute", () => {
    const og = readingMetadata({ ...page, image: "/images/imadoko.png" }).openGraph as { images?: string[] };
    expect(og.images).toEqual([`${SITE_URL}/images/imadoko.png`]);
  });
});
