import { describe, expect, it } from "vitest";
import { localizeProject, localizeProjects } from "./projectModel";
import { PROJECTS } from "./projects";
import type { ProjectSource } from "./projectModel";

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
});
