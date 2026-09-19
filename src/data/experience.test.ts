import { describe, expect, it } from "vitest";
import { EXPERIENCE } from "./experience";
import { PROJECTS } from "./projects";

/** "2025" sorts before "2025.01": a bare year stands for the whole year's start. */
const sortKey = (period: string) => {
  const [year, month = "0"] = period.split(".");
  return Number(year) * 100 + Number(month);
};

describe("the Experience timeline", () => {
  it("writes every period as a year or a year and month", () => {
    for (const e of EXPERIENCE) {
      expect(e.period, e.title.ja).toMatch(/^\d{4}(\.(0[1-9]|1[0-2]))?$/);
    }
  });

  // Rendered in array order, so an entry filed in the wrong place would sit in
  // the wrong place on screen with nothing to say so.
  it("runs oldest first", () => {
    const keys = EXPERIENCE.map((e) => sortKey(e.period));
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i], `${EXPERIENCE[i].period} ${EXPERIENCE[i].title.ja}`).toBeGreaterThanOrEqual(keys[i - 1]);
    }
  });

  it("gives every milestone prose in both languages", () => {
    for (const e of EXPERIENCE) {
      expect(e.title.en, e.title.ja).toBeTruthy();
      expect(e.description.ja, e.title.ja).toBeTruthy();
      expect(e.description.en, e.title.ja).toBeTruthy();
    }
  });

  // A slug that matches nothing would leave a card that looks tappable and
  // opens Products with no project in front of it.
  it("links only to projects that exist", () => {
    const slugs = new Set(PROJECTS.map((p) => p.slug));
    const linked = EXPERIENCE.filter((e) => e.project);
    expect(linked.length).toBeGreaterThan(0);
    for (const e of linked) {
      expect(slugs.has(e.project!), `${e.title.ja} -> ${e.project}`).toBe(true);
    }
  });
});
