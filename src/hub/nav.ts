import type { SectionType } from "@/types";
import { hashForSection } from "@/state/sectionUrl";

type Label = { ja: string; en: string };

/**
 * One area on the planet, as the navigation names it: on the hub, choosing
 * one flies the camera there; off the planet, it leads to the hub with that
 * area's sheet open.
 */
export type NavItem = Label & {
  section: NonNullable<SectionType>;
};

/**
 * A page of its own off the planet, drawn after the areas past a divider
 * ("｜" on the header, a rule in the full-screen menu). It has no building, no
 * marker, no card and no place on the tour — choosing it leaves the diorama.
 */
export type PageLink = Label & {
  page: string;
};

/** Whatever a navigation drawing may light: an area or a page. */
export type NavEntry = NavItem | PageLink;

/**
 * The areas, in the order they are drawn — the same list on the hub, in the
 * full-screen menu and on the reading pages.
 */
export const NAV: readonly NavItem[] = [
  { section: "about", ja: "自己紹介", en: "About" },
  { section: "products", ja: "制作実績", en: "Products" },
  { section: "skills", ja: "技術スタック", en: "Skills" },
  { section: "experience", ja: "経歴・活動", en: "Experience" },
  { section: "contact", ja: "お問い合わせ", en: "Contact" },
];

/**
 * The pages off the planet, drawn after `NAV`. The notes are here in words,
 * not only behind the monitor button's unlabelled book icon: they are the
 * site's answer to the AdSense "low value content" rejection, and a reviewer
 * who reads only the labelled navigation — five areas, all one page — sees
 * the two-page site that was rejected (devlog 2026-09-20).
 */
export const PAGE_LINKS: readonly PageLink[] = [{ page: "/notes", ja: "ノート", en: "Note" }];

/** A stable identity for an entry — React keys. */
export function navKey(item: NavEntry): string {
  return "section" in item ? item.section : item.page;
}

/**
 * Where an area leads from a page off the planet: the hub, opened on that
 * area through the hash the hub reads on arrival (`sectionUrl`).
 */
export function offPlanetHref(item: NavItem): string {
  return `/${hashForSection(item.section)}`;
}

/**
 * Whether a link drawn off the planet goes into the hub — and so has to be a
 * plain <a>, a full page load, rather than next/link. Both reasons measured
 * on the production build (devlog 2026-09-19):
 *
 * - The hub's state (`AppStateProvider`) lives in the root layout, so it
 *   survives a client-side navigation, and it reads the hash only when it
 *   first mounts. `<Link href="/#experience">` from a reading page landed on
 *   the diorama with the sheet shut and the URL still saying #experience.
 * - next/link prefetches its target as soon as it is on screen. The logo is
 *   on screen on every reading page, and prefetching `/` pulled the hub's
 *   three.js bundle — three chunks, 1.27 MB — for readers who may never go
 *   there.
 */
export function leadsToHub(href: string): boolean {
  return href === "/" || href.startsWith("/#");
}

/** The entry lit on the hub: the open (or focused) area, if any. */
export function navItemForSection(section: SectionType): NavItem | undefined {
  return section ? NAV.find((item) => item.section === section) : undefined;
}

/** The entry lit on a page off the planet: the page link whose page contains it. */
export function pageLinkForPath(pathname: string): PageLink | undefined {
  return PAGE_LINKS.find(({ page }) => pathname === page || pathname.startsWith(`${page}/`));
}
