import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ADSENSE_CLIENT, SITE_URL, siteUrl } from "./site";

const ADS_TXT = readFileSync(fileURLToPath(new URL("../../public/ads.txt", import.meta.url)), "utf8");

describe("siteUrl", () => {
  it("joins a root-relative path onto the site", () => {
    expect(siteUrl("/notes/a")).toBe("https://miiiwa.com/notes/a");
  });

  it("gives the bare origin for the top page, as the layout's canonical does", () => {
    expect(siteUrl("/")).toBe(SITE_URL);
  });

  it("refuses a relative path rather than gluing it onto the host", () => {
    expect(() => siteUrl("notes")).toThrow();
  });
});

describe("public/ads.txt", () => {
  // Blank lines and comments are allowed by the spec; only records count.
  const records = ADS_TXT.split("\n")
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((field) => field.trim()));

  it("authorises the same publisher the ad script loads", () => {
    const publisher = ADSENSE_CLIENT.replace(/^ca-/, "");
    expect(records).toContainEqual(["google.com", publisher, "DIRECT", "f08c47fec0942fa0"]);
  });

  it("names no other Google publisher", () => {
    const google = records.filter(([domain]) => domain === "google.com");
    expect(google).toHaveLength(1);
  });
});
