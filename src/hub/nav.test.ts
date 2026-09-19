import { describe, expect, it } from "vitest";
import { sectionFromHash } from "@/state/sectionUrl";
import { NAV, leadsToHub, navItemForPath, navItemForSection, navKey, offPlanetHref } from "./nav";

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

  it("gives every entry its own key", () => {
    const keys = NAV.map(navKey);
    expect(new Set(keys).size).toBe(keys.length);
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

describe("navItemForPath", () => {
  it("lights nothing on pages that are not in the list", () => {
    expect(navItemForPath("/")).toBeUndefined();
    expect(navItemForPath("/products")).toBeUndefined();
    expect(navItemForPath("/notes")).toBeUndefined();
    expect(navItemForPath("/notes/drag-the-sun")).toBeUndefined();
    expect(navItemForPath("/privacy")).toBeUndefined();
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
