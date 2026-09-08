import type { SectionType } from "@/types";

/**
 * The open section, expressed in the URL.
 *
 * Without this the site had no addressable state at all: the browser's back
 * button left the site instead of closing the panel, and there was no way to
 * link anyone to a particular section.
 *
 * A hash, not a path. The site is a single statically exported document with
 * one 3D scene that must survive navigation, so real routes would mean either
 * reloading the whole world or keeping the canvas in a layout above them —
 * a restructure, and a separate decision. A hash buys the back button and
 * shareable links today without touching the export.
 *
 * Note what this deliberately does NOT fix: the section content is still
 * rendered on the client, so it stays absent from the prerendered HTML and
 * invisible to anything that does not run JavaScript.
 */

const SECTION_IDS = ["about", "products", "skills", "experience", "contact"] as const;

/** Parse a section out of a location hash. Unknown values read as none. */
export function sectionFromHash(hash: string): SectionType {
  const id = hash.replace(/^#/, "");
  return (SECTION_IDS as readonly string[]).includes(id) ? (id as SectionType) : null;
}

/** The hash a section should be shown at. Empty for "no section". */
export function hashForSection(section: SectionType): string {
  return section ? `#${section}` : "";
}
