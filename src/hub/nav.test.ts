import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { siteUrl } from "@/data/site";
import { sectionFromHash } from "@/state/sectionUrl";
import { NAV, PAGE_LINKS, leadsToHub, navItemForSection, navKey, offPlanetHref, pageLinkForPath } from "./nav";

const byLabel = (ja: string) => {
  const item = NAV.find((i) => i.ja === ja);
  if (!item) throw new Error(`no nav item ${ja}`);
  return item;
};

describe("NAV", () => {
  it("lists the five planet areas", () => {
    expect(NAV.map((i) => i.ja)).toEqual([
      "自己紹介",
      "制作実績",
      "技術スタック",
      "経歴・活動",
      "お問い合わせ",
    ]);
  });

  it("names every area on the planet exactly once", () => {
    const sections = NAV.flatMap((i) => (i.section ? [i.section] : []));
    expect([...sections].sort()).toEqual(["about", "contact", "experience", "products", "skills"]);
  });

  it("gives every entry its own key, the page links included", () => {
    const keys = [...NAV, ...PAGE_LINKS].map(navKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("PAGE_LINKS", () => {
  // In words on the header, not only as the monitor button's icon: the notes
  // are what the AdSense review has to find (devlog 2026-09-20).
  it("puts the notes after the areas", () => {
    expect(PAGE_LINKS.map((l) => [l.ja, l.page])).toEqual([["ノート", "/notes"]]);
  });

  it("leads only to pages the build writes and lists", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const { page } of PAGE_LINKS) expect(urls).toContain(siteUrl(page));
  });

  it("leaves the hub by next/link, not by a full load", () => {
    for (const { page } of PAGE_LINKS) expect(leadsToHub(page)).toBe(false);
  });
});

describe("offPlanetHref", () => {
  it("leads to the hub at the area", () => {
    expect(offPlanetHref(byLabel("自己紹介"))).toBe("/#about");
    expect(offPlanetHref(byLabel("制作実績"))).toBe("/#products");
    expect(offPlanetHref(byLabel("技術スタック"))).toBe("/#skills");
    expect(offPlanetHref(byLabel("経歴・活動"))).toBe("/#experience");
    expect(offPlanetHref(byLabel("お問い合わせ"))).toBe("/#contact");
  });

  it("uses a hash the hub opens on arrival", () => {
    for (const item of NAV) {
      const url = new URL(offPlanetHref(item), "https://miiiwa.com/notes/drag-the-sun");
      expect(url.pathname).toBe("/");
      expect(sectionFromHash(url.hash)).toBe(item.section);
    }
  });
});

describe("pageLinkForPath", () => {
  const notes = PAGE_LINKS.find((l) => l.page === "/notes");

  it("lights the notes on their index and on every note", () => {
    expect(notes).toBeDefined();
    expect(pageLinkForPath("/notes")).toBe(notes);
    expect(pageLinkForPath("/notes/drag-the-sun")).toBe(notes);
  });

  it("lights nothing on the other pages", () => {
    expect(pageLinkForPath("/")).toBeUndefined();
    expect(pageLinkForPath("/products")).toBeUndefined();
    expect(pageLinkForPath("/products/imadoko")).toBeUndefined();
    expect(pageLinkForPath("/privacy")).toBeUndefined();
    expect(pageLinkForPath("/notes-archive")).toBeUndefined();
  });
});

describe("navItemForSection", () => {
  it("lights the open area's entry, and nothing with none open", () => {
    expect(navItemForSection("experience")).toBe(byLabel("経歴・活動"));
    expect(navItemForSection("products")).toBe(byLabel("制作実績"));
    expect(navItemForSection(null)).toBeUndefined();
  });
});

describe("leadsToHub", () => {
  it("is true for the hub, bare or at an area", () => {
    expect(leadsToHub("/")).toBe(true);
    expect(leadsToHub("/#about")).toBe(true);
    expect(leadsToHub("/#products")).toBe(true);
  });

  it("is false for the other pages of the site", () => {
    expect(leadsToHub("/products")).toBe(false);
    expect(leadsToHub("/notes")).toBe(false);
    expect(leadsToHub("/privacy")).toBe(false);
  });

  it("covers every entry in NAV", () => {
    for (const item of NAV) {
      expect(leadsToHub(offPlanetHref(item))).toBe(true);
    }
  });
});
