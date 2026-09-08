import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The crawl is set on a grid of a whole number of full-width characters per
 * line (`w-[15em]` against the block's own font size, see About.tsx). The
 * cell count is a composition choice and moves; what these tests hold is the
 * thing that has to be true at any count. That only
 * holds while every character in the Japanese copy is one em wide, which
 * half-width Latin and digits are not: a stray `2026` is 4 characters that
 * occupy about 2 cells, so the line it lands on stops lining up with its
 * neighbours — and nothing else fails. The page still renders, the text is
 * still readable, and the only symptom is that the grid quietly stops being
 * a grid.
 *
 * So the copy is written in full-width forms (`２０２６`), and this is the
 * guard on that. It is deliberately a text scan rather than an import:
 * About.tsx is a React component, and the suite is a node environment with
 * no DOM by design (see vitest.config.ts).
 */

const SOURCE = readFileSync(
  fileURLToPath(new URL("./About.tsx", import.meta.url)),
  "utf8",
);

/**
 * The Japanese branch of `paragraphs` — everything between `isJa\n ? [` and
 * the `: [` that opens the English one. Anchored on both ends rather than
 * scanning the whole file, because the file legitimately contains half-width
 * Latin elsewhere: the English copy, the `About Me` heading, JSX itself, and
 * the comments.
 */
function japaneseCopy(): string {
  const start = SOURCE.indexOf("const paragraphs = isJa");
  expect(start, "the `paragraphs` array moved or was renamed").toBeGreaterThan(
    -1,
  );
  const open = SOURCE.indexOf("? [", start);
  const close = SOURCE.indexOf("\n    : [", open);
  expect(
    close,
    "the Japanese branch no longer ends at a `: [` English branch",
  ).toBeGreaterThan(open);
  return SOURCE.slice(open + 3, close);
}

/** Copy with the JSX taken out, leaving only what a reader actually sees. */
function visibleText(block: string): string {
  return block.replace(/<[^>]*>/g, "");
}

describe("the Japanese crawl copy", () => {
  it("is long enough to be the real copy and not an empty match", () => {
    // Guards the two helpers above: if the anchors ever slid past the text,
    // every other assertion here would pass against an empty string.
    expect(
      visibleText(japaneseCopy()).replace(/\s/g, "").length,
    ).toBeGreaterThan(500);
  });

  it("holds no half-width letters or digits, which would fall off the cell grid", () => {
    const offenders = visibleText(japaneseCopy()).match(/[A-Za-z0-9]+/g) ?? [];
    expect(
      offenders,
      `write these full-width instead (e.g. 2026 → ２０２６): ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("holds no half-width space, which is narrower than a cell too", () => {
    // `Ｓｕｋｉｍａ　Ｐａｒｋ` separates its words with U+3000, not U+0020.
    // Only spaces *inside* a line of copy count — the indentation around the
    // JSX is not part of what gets typeset.
    const inlineSpaces = visibleText(japaneseCopy())
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => / /.test(line));
    expect(inlineSpaces).toEqual([]);
  });

  it("never wraps a sentence across source lines, since JSX joins those with a space", () => {
    // The check above cannot see this one: the space is not in the file. JSX
    // condenses a newline *inside* a run of text into a single U+0020, so a
    // sentence split across two source lines renders with a half-width space
    // at the seam, and that line alone comes up short of a full row. This
    // actually happened to the first paragraph, and the only symptom was one
    // line out of sixty sitting a half-cell off.
    //
    // A newline next to a tag is dropped by JSX rather than condensed, so
    // wrapping *at* a tag is safe and must not be reported — that is what the
    // `<>` / `</>,` rows are, and it is also what putting the bold span on
    // its own line would be. Hence the test is about what sits either side of
    // the newline, not about how many rows hold copy: a seam is a newline
    // with real copy on both sides. "Real copy" is any non-ASCII character,
    // which the assertions above are what make a safe shorthand — every
    // character of the Japanese text is full-width, and every character of
    // the JSX around it (`<`, `>`, `,`) is not.
    const rows = japaneseCopy().split("\n").map((line) => line.trim());
    const isCopy = (char: string | undefined) =>
      char !== undefined && char.charCodeAt(0) > 0x7f;

    const seams = rows
      .map((row, i) => [row, rows[i + 1]] as const)
      .filter(([a, b]) => a && b && isCopy(a.at(-1)) && isCopy(b.at(0)))
      .map(([a, b]) => `…${a.slice(-8)} ⏎ ${b.slice(0, 8)}…`);

    expect(
      seams,
      "join these onto one source line — JSX inserts a space at ⏎",
    ).toEqual([]);
  });

  it("still names every product, so the full-width rewrite did not drop one", () => {
    // Full-width forms are easy to mistype and hard to eyeball. These are the
    // names the copy is actually about; a typo in one is a typo nothing else
    // in the suite would notice.
    const copy = japaneseCopy();
    for (const name of [
      "Ｍｉｉｉｗａ",
      "Ｐｙｔｈｏｎ",
      "４２ｔｏｋｙｏ",
      "ＧＣＩ",
      "ｉｍａｄｏｋｏ",
      "Ｓｕｋｉｍａ　Ｐａｒｋ",
      "ｍｅｓｅｎ",
      "Ｕｍｏｊａ",
    ]) {
      expect(copy, `${name} is missing from the Japanese copy`).toContain(name);
    }
  });
});
