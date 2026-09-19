import { describe, expect, it } from "vitest";
import { sectionFromHash } from "@/state/sectionUrl";
import { NAV, leadsToHub, navItemForPath, navItemForSection, navKey, offPlanetHref } from "./nav";

const byLabel = (ja: string) => {
  const item = NAV.find((i) => i.ja === ja);
  if (!item) throw new Error(`no nav item ${ja}`);
  return item;
};

describe("NAV", () => {
  it("puts Note among the areas, right after Experience (the user's order)", () => {
    expect(NAV.map((i) => i.ja)).toEqual([
      "自己紹介",
      "制作実績",
      "技術スタック",
      "経歴・活動",
      "ノート",
      "お問い合わせ",
    ]);
  });

  it("names every area on the planet exactly once", () => {
    const sections = NAV.flatMap((i) => (i.section ? [i.section] : []));
    expect([...sections].sort()).toEqual(["about", "contact", "experience", "products", "skills"]);
  });

  it("gives every entry its own key", () => {
    const keys = NAV.map(navKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("offPlanetHref", () => {
  it("leads to an entry's own page when it has one", () => {
    expect(offPlanetHref(byLabel("制作実績"))).toBe("/products");
    expect(offPlanetHref(byLabel("ノート"))).toBe("/notes");
  });

  it("leads to the hub at the area otherwise", () => {
    expect(offPlanetHref(byLabel("自己紹介"))).toBe("/#about");
    expect(offPlanetHref(byLabel("技術スタック"))).toBe("/#skills");
    expect(offPlanetHref(byLabel("経歴・活動"))).toBe("/#experience");
    expect(offPlanetHref(byLabel("お問い合わせ"))).toBe("/#contact");
  });

  it("uses a hash the hub opens on arrival", () => {
    for (const item of NAV) {
      if (item.section === undefined || item.page !== undefined) continue;
      // Resolved from where the link is drawn: a relative "#about" would
      // stay on the reading page.
      const url = new URL(offPlanetHref(item), "https://miiiwa.com/notes/drag-the-sun");
      expect(url.pathname).toBe("/");
      expect(sectionFromHash(url.hash)).toBe(item.section);
    }
  });
});

describe("navItemForPath", () => {
  it("lights the index and everything under it", () => {
    expect(navItemForPath("/notes")).toBe(byLabel("ノート"));
    expect(navItemForPath("/notes/drag-the-sun")).toBe(byLabel("ノート"));
    expect(navItemForPath("/products")).toBe(byLabel("制作実績"));
    expect(navItemForPath("/products/imadoko")).toBe(byLabel("制作実績"));
  });

  it("lights nothing on pages that are not in the list", () => {
    expect(navItemForPath("/")).toBeUndefined();
    expect(navItemForPath("/privacy")).toBeUndefined();
    // A shared prefix is not containment.
    expect(navItemForPath("/notes-archive")).toBeUndefined();
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
  });

  it("is false for the other pages of the site", () => {
    expect(leadsToHub("/notes")).toBe(false);
    expect(leadsToHub("/products/imadoko")).toBe(false);
    expect(leadsToHub("/privacy")).toBe(false);
  });

  it("covers every entry that leads to an area rather than a page", () => {
    for (const item of NAV) {
      expect(leadsToHub(offPlanetHref(item))).toBe(item.page === undefined);
    }
  });
});
