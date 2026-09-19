import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Test-only access to the MDX bodies in `src/content/`. Not `*.test.ts`, so
 * Vitest does not run it; never imported by the app (it reads the disk).
 */

const CONTENT_DIR = fileURLToPath(new URL(".", import.meta.url));

export type ContentKind = "products" | "notes";

/** Slugs that have an MDX body on disk. */
export function contentSlugs(kind: ContentKind): string[] {
  return readdirSync(`${CONTENT_DIR}${kind}`)
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => name.replace(/\.mdx$/, ""));
}

export function readContent(kind: ContentKind, slug: string): string {
  return readFileSync(`${CONTENT_DIR}${kind}/${slug}.mdx`, "utf8");
}

/**
 * How much a reader actually reads: characters left once code blocks, markup
 * and whitespace are gone. A rough count, not a typesetter's — it only has to
 * tell a written page from a stub.
 */
export function proseLength(mdx: string): number {
  return mdx
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/[#*_`>|[\]\-]/g, "")
    .replace(/\s+/g, "").length;
}

/**
 * The shortest body a reading page may ship with.
 *
 * These pages exist because the site was refused by AdSense as 「有用性の低い
 * コンテンツ」 (see docs/devlog/202609.md, 2026-09-19): a page with a title
 * and two lines is exactly what that verdict describes. 2,000 characters is
 * roughly five minutes of Japanese reading — a floor, not a target.
 */
export const MIN_PROSE_CHARS = 2000;
