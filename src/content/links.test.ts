import { describe, expect, it } from "vitest";
import { NOTES, PROJECTS, notePath, productPath } from "@/data";
import { contentSlugs, readContent, type ContentKind } from "./contentFiles.testutil";

/**
 * Every page of this site that the prose may link to.
 *
 * The write-ups cross-link each other by path (`[看板が鏡文字になった日](/notes/mirrored-signboard)`).
 * A mistyped slug builds fine and renders fine — it is a 404 only once
 * someone clicks it — so the only place it can be caught is here.
 */
const ROUTES = new Set<string>([
  "/",
  "/products",
  "/notes",
  "/privacy",
  ...PROJECTS.map((p) => productPath(p.slug)),
  ...NOTES.map((n) => notePath(n.slug)),
  // Past builds served from public/archive/ (see docs/structure.md).
  ...PROJECTS.filter((p) => p.demoUrl.startsWith("/")).map((p) => p.demoUrl),
]);

/** Root-relative targets of markdown links, e.g. `](/notes/x)` → `/notes/x`. */
const internalLinks = (mdx: string) =>
  [...mdx.matchAll(/\]\((\/[^)\s#?]*)[^)]*\)/g)].map((match) => match[1]);

describe("links inside the reading pages", () => {
  for (const kind of ["products", "notes"] as ContentKind[]) {
    it(`point only at pages that exist (${kind})`, () => {
      for (const slug of contentSlugs(kind)) {
        for (const href of internalLinks(readContent(kind, slug))) {
          expect(ROUTES.has(href), `${kind}/${slug} → ${href}`).toBe(true);
        }
      }
    });
  }

  it("finds the links it is meant to check", () => {
    // Guards the regex itself: if it stopped matching, the tests above would
    // pass on every body without having looked at a single link.
    expect(internalLinks("see [a](/notes/x) and [b](/products/y#top) but not [c](https://e.com)")).toEqual([
      "/notes/x",
      "/products/y",
    ]);
  });
});
