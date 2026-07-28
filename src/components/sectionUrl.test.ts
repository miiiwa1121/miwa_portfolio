import { describe, expect, it } from "vitest";
import { hashForSection, sectionFromHash } from "./sectionUrl";

describe("sectionFromHash", () => {
  it("reads every real section", () => {
    for (const id of ["about", "products", "skills", "experience", "contact"]) {
      expect(sectionFromHash(`#${id}`)).toBe(id);
    }
  });

  it("tolerates a missing leading hash", () => {
    expect(sectionFromHash("products")).toBe("products");
  });

  it("reads an empty hash as no section", () => {
    expect(sectionFromHash("")).toBeNull();
    expect(sectionFromHash("#")).toBeNull();
  });

  it("refuses anything that is not a section, rather than trusting the URL", () => {
    for (const junk of ["#nope", "#Products", "#products/../x", "#<script>"]) {
      expect(sectionFromHash(junk), junk).toBeNull();
    }
  });
});

describe("hashForSection", () => {
  it("round-trips through sectionFromHash", () => {
    for (const id of ["about", "products", "skills", "experience", "contact"] as const) {
      expect(sectionFromHash(hashForSection(id))).toBe(id);
    }
  });

  it("gives an empty hash for no section, so the URL goes back to clean", () => {
    expect(hashForSection(null)).toBe("");
  });
});
