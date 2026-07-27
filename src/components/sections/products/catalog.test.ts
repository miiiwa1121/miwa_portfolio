import { describe, expect, it } from "vitest";
import { filterProjects, isPlaceholderUrl, statusLabel } from "./catalog";
import type { Project } from "@/data";

const project = (over: Partial<Project>): Project => ({
  slug: "p",
  title: "P",
  description: "",
  image: "/images/p.webp",
  tags: [],
  category: "WEB",
  status: "Public",
  githubUrl: "#",
  demoUrl: "#",
  ...over,
});

const catalogue: Project[] = [
  project({ slug: "web-public", category: "WEB", status: "Public" }),
  project({ slug: "web-dev", category: "WEB", status: "dev" }),
  project({ slug: "app-public", category: "APP", status: "Public" }),
  project({ slug: "app-dev", category: "APP", status: "dev" }),
];

const slugs = (c: Parameters<typeof filterProjects>[1], s: Parameters<typeof filterProjects>[2]) =>
  filterProjects(catalogue, c, s).map((p) => p.slug);

describe("filterProjects", () => {
  it("returns everything when both filters are All", () => {
    expect(slugs("All", "All")).toEqual(["web-public", "web-dev", "app-public", "app-dev"]);
  });

  it("filters by category alone", () => {
    expect(slugs("WEB", "All")).toEqual(["web-public", "web-dev"]);
    expect(slugs("APP", "All")).toEqual(["app-public", "app-dev"]);
  });

  it("filters by status alone", () => {
    expect(slugs("All", "Public")).toEqual(["web-public", "app-public"]);
    expect(slugs("All", "dev")).toEqual(["web-dev", "app-dev"]);
  });

  it("applies both filters together", () => {
    expect(slugs("WEB", "dev")).toEqual(["web-dev"]);
    expect(slugs("APP", "Public")).toEqual(["app-public"]);
  });

  it("can legitimately return nothing", () => {
    expect(filterProjects([], "WEB", "Public")).toEqual([]);
  });

  it("does not mutate or reorder the input", () => {
    const input = [...catalogue];
    filterProjects(input, "WEB", "dev");
    expect(input).toEqual(catalogue);
  });
});

describe("statusLabel", () => {
  it("translates the Japanese labels", () => {
    expect(statusLabel("All", "ja")).toBe("すべて");
    expect(statusLabel("Public", "ja")).toBe("公開中");
    expect(statusLabel("dev", "ja")).toBe("開発中");
  });

  it("passes the raw value through for English", () => {
    expect(statusLabel("Public", "en")).toBe("Public");
    expect(statusLabel("dev", "en")).toBe("dev");
  });

  it("falls back to the raw value rather than rendering undefined", () => {
    expect(statusLabel("archived", "ja")).toBe("archived");
  });
});

describe("isPlaceholderUrl", () => {
  it("treats '#' and empty as not-yet-published", () => {
    expect(isPlaceholderUrl("#")).toBe(true);
    expect(isPlaceholderUrl("")).toBe(true);
  });

  it("treats a real URL as publishable", () => {
    expect(isPlaceholderUrl("https://imadoko.link")).toBe(false);
    expect(isPlaceholderUrl("/relative")).toBe(false);
  });
});
