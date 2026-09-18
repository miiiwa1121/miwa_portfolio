import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { localizeProject, localizeProjects } from "./projectModel";
import { PROJECTS } from "./projects";
import type { ProjectSource } from "./projectModel";

const PUBLIC_DIR = fileURLToPath(new URL("../../public", import.meta.url));

const statOf = (path: string) => {
  try {
    return statSync(path);
  } catch {
    return null;
  }
};

/**
 * The file a same-site URL is served from. A directory serves its index.html,
 * which is how "/archive/v1" reaches public/archive/v1/index.html.
 */
const publicFile = (url: string) => {
  const path = PUBLIC_DIR + url;
  return statOf(path)?.isDirectory() ? `${path}/index.html` : path;
};

const isShipped = (url: string) => statOf(publicFile(url))?.isFile() ?? false;

/** Demos hosted by this site itself rather than on another domain. */
const LOCAL_DEMOS = PROJECTS.filter((p) => p.demoUrl.startsWith("/"));

/**
 * Whether a root-relative path stays within a demo's build. The build's own
 * home link is the demo URL itself; the slash keeps "/archive/v10/..." from
 * passing for "/archive/v1".
 */
const isInside = (path: string, demoUrl: string) =>
  path === demoUrl || path.startsWith(`${demoUrl}/`);

/** Every file of a same-site demo that can name a URL: markup, RSC payloads, scripts, styles. */
const textFilesOf = (demoUrl: string) => {
  const dir = PUBLIC_DIR + demoUrl;
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((name) => /\.(html|txt|js|css)$/.test(name))
    .map((name) => ({ name, text: readFileSync(`${dir}/${name}`, "utf8") }));
};

/**
 * The content of a robots or googlebot directive, written as markup or as the
 * RSC payload's JSON (escaped inside an inline script, or not in a .txt).
 */
const ROBOTS_DIRECTIVE =
  /(?:robots|googlebot)(?:\\?"\s*,\s*\\?"content\\?":\\?"|" content=")([^"\\]*)/g;

/** A quoted (or url()-wrapped) root-relative path to an image or model file. */
const MEDIA_PATH =
  /["'`(](\/(?!\/)[^"'`()\s?#]+\.(?:png|jpe?g|webp|avif|gif|svg|ico|mp4|webm|glb|gltf))(?=["'`)?#\\])/g;

const sample: ProjectSource = {
  slug: "demo",
  title: { ja: "デモ", en: "Demo" },
  description: { ja: "説明", en: "Description" },
  image: "/images/demo.webp",
  tags: ["Next.js"],
  category: "WEB",
  status: "Public",
  githubUrl: "https://example.com/repo",
  demoUrl: "https://example.com",
};

describe("localizeProject", () => {
  it("resolves prose into the requested language", () => {
    expect(localizeProject(sample, "ja")).toMatchObject({ title: "デモ", description: "説明" });
    expect(localizeProject(sample, "en")).toMatchObject({
      title: "Demo",
      description: "Description",
    });
  });

  it("carries the language-invariant fields through untouched", () => {
    const ja = localizeProject(sample, "ja");
    const en = localizeProject(sample, "en");
    for (const key of ["slug", "image", "category", "status", "githubUrl", "demoUrl"] as const) {
      expect(ja[key]).toBe(sample[key]);
      expect(en[key]).toBe(sample[key]);
    }
    expect(ja.tags).toEqual(sample.tags);
  });

  it("leaves the source untouched", () => {
    const before = JSON.stringify(sample);
    localizeProject(sample, "en");
    expect(JSON.stringify(sample)).toBe(before);
  });
});

describe("localizeProjects", () => {
  it("preserves authoring order", () => {
    expect(localizeProjects(PROJECTS, "ja").map((p) => p.slug)).toEqual(
      PROJECTS.map((p) => p.slug)
    );
  });

  it("produces the same number of projects in both languages", () => {
    expect(localizeProjects(PROJECTS, "ja")).toHaveLength(PROJECTS.length);
    expect(localizeProjects(PROJECTS, "en")).toHaveLength(PROJECTS.length);
  });
});

describe("the catalogue itself", () => {
  it("has unique slugs, since they are used as React keys", () => {
    const slugs = PROJECTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every project prose in both languages", () => {
    for (const p of PROJECTS) {
      expect(p.title.ja, `${p.slug} title.ja`).toBeTruthy();
      expect(p.title.en, `${p.slug} title.en`).toBeTruthy();
      expect(p.description.ja, `${p.slug} description.ja`).toBeTruthy();
      expect(p.description.en, `${p.slug} description.en`).toBeTruthy();
    }
  });

  it("points every project at an image under /images", () => {
    for (const p of PROJECTS) {
      expect(p.image, p.slug).toMatch(/^\/images\/.+\.(webp|png|jpg)$/);
    }
  });

  it("never leaves a URL empty — unpublished links must be an explicit '#'", () => {
    for (const p of PROJECTS) {
      expect(p.githubUrl, `${p.slug} githubUrl`).not.toBe("");
      expect(p.demoUrl, `${p.slug} demoUrl`).not.toBe("");
    }
  });

  // A misspelt path fails nowhere but the screen: the images are unoptimized,
  // so the export copies public/ as-is and never looks at what refers to it.
  it("ships every project image", () => {
    for (const p of PROJECTS) {
      expect(isShipped(p.image), `${p.slug}: ${p.image}`).toBe(true);
    }
  });

  it("points a same-site demo at a page that is actually shipped", () => {
    for (const p of LOCAL_DEMOS) {
      expect(isShipped(p.demoUrl), `${p.slug}: ${p.demoUrl}`).toBe(true);
    }
  });

  // Production is Vercel, which serves "/archive/v1" directly and answers
  // "/archive/v1/" with a 308 to it — one wasted round trip per click.
  it("writes a same-site demo without a trailing slash", () => {
    for (const p of LOCAL_DEMOS) {
      expect(p.demoUrl.endsWith("/"), `${p.slug}: ${p.demoUrl}`).toBe(false);
    }
  });

  // An archived build exported without its basePath still renders its HTML,
  // then asks for /_next/... — the live site's chunks, not its own.
  it("serves an archived build its own assets, not the live site's", () => {
    for (const p of LOCAL_DEMOS) {
      const html = readFileSync(publicFile(p.demoUrl), "utf8");
      // Root-relative only: "//host/..." is another domain.
      const paths = [...html.matchAll(/\b(?:src|href)="(\/(?!\/)[^"]*)"/g)].map((m) => m[1]);
      expect(paths.length, p.slug).toBeGreaterThan(0);
      for (const path of paths) {
        expect(isInside(path, p.demoUrl), `${p.slug}: ${path}`).toBe(true);
      }
    }
  });

  // basePath does not reach a string src given to next/image, and an image
  // drawn only on the client never shows up in the HTML checked above. Left
  // alone, "/images/x.png" quietly borrows the live site's file of that name
  // (v1's product shots did) and breaks the day the live site drops it.
  it("keeps every image an archived build names inside that build", () => {
    for (const p of LOCAL_DEMOS) {
      const named = textFilesOf(p.demoUrl).flatMap(({ name, text }) =>
        [...text.matchAll(MEDIA_PATH)].map((m) => ({ name, path: m[1] }))
      );
      expect(named.length, p.slug).toBeGreaterThan(0);
      for (const { name, path } of named) {
        expect(isInside(path, p.demoUrl), `${p.slug} ${name}: ${path}`).toBe(true);
        expect(isShipped(decodeURI(path)), `${p.slug} ${name}: ${path} is not shipped`).toBe(true);
      }
    }
  });

  // An archive is exported with the metadata it had when it was live: v1 said
  // "index, follow", v0 said nothing. Either way search engines would list a
  // stale "Miiiwa | Portfolio" beside the real one. The payload counts too —
  // Next rebuilds <head> from it when you move between the build's pages.
  it("keeps every archived build out of search results", () => {
    for (const p of LOCAL_DEMOS) {
      const files = textFilesOf(p.demoUrl);
      const pages = files.filter(({ name }) => name.endsWith(".html"));
      expect(pages.length, p.slug).toBeGreaterThan(0);
      for (const { name, text } of pages) {
        expect(text, `${p.slug} ${name}`).toMatch(/<meta name="robots" content="noindex/);
      }
      for (const { name, text } of files) {
        for (const [, content] of text.matchAll(ROBOTS_DIRECTIVE)) {
          expect(content, `${p.slug} ${name}`).toMatch(/\bnoindex\b/);
        }
      }
    }
  });
});
