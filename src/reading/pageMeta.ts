import type { Metadata } from "next";
import { siteUrl } from "@/data/site";

type ReadingPage = {
  /** Root-relative path the page is served at, e.g. `/notes/some-entry`. */
  path: string;
  title: string;
  description: string;
  /** Root-relative image for link previews, if the page has one of its own. */
  image?: string;
  type?: "article" | "website";
};

/**
 * Metadata for a reading page (a product's write-up, a note, or an index).
 *
 * **The canonical URL has to be set on every one of them.** The root layout
 * declares `alternates.canonical: "https://miiiwa.com"` for the hub, and a
 * child that sets nothing inherits it — every write-up would then tell search
 * engines "I am a copy of the top page" and be dropped from the index, with
 * nothing on screen to show it. `pageMeta.test.ts` holds this.
 *
 * `openGraph` is rebuilt whole rather than extended: Next merges metadata
 * one key deep, so a child's `openGraph` replaces the layout's entirely —
 * including `siteName` and `locale`, which would otherwise vanish.
 */
export function readingMetadata({ path, title, description, image, type = "article" }: ReadingPage): Metadata {
  const url = siteUrl(path);
  const images = image ? [siteUrl(image)] : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: "Miiiwa Portfolio",
      locale: "ja_JP",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@miiiwa3330",
      images,
    },
  };
}
