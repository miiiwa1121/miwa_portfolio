import type { SectionType } from "@/types";
import { hashForSection } from "@/state/sectionUrl";

type Label = { ja: string; en: string };

/**
 * One entry of the site navigation.
 *
 * Most entries are an area on the planet (`section`): on the hub, choosing one
 * flies the camera there. An entry may also — or instead — have a page of its
 * own off the planet (`page`). "Note" has only that: no building, no marker,
 * no card, no place on the tour. The union makes an entry with neither
 * unwritable.
 */
export type NavItem = Label &
  (
    | { section: NonNullable<SectionType>; page?: string }
    | { section?: undefined; page: string }
  );

/**
 * The navigation, in the order it is drawn — the same list on the hub, in the
 * full-screen menu and on the reading pages. The pages off the planet sit in
 * it like any other entry rather than after a divider (the user's call).
 */
export const NAV: readonly NavItem[] = [
  { section: "about", ja: "自己紹介", en: "About" },
  { section: "products", page: "/products", ja: "制作実績", en: "Products" },
  { section: "skills", ja: "技術スタック", en: "Skills" },
  { section: "experience", ja: "経歴・活動", en: "Experience" },
  { page: "/notes", ja: "ノート", en: "Note" },
  { section: "contact", ja: "お問い合わせ", en: "Contact" },
];

/** A stable identity for an entry — React keys. */
export function navKey(item: NavItem): string {
  return item.section ?? item.page;
}

/**
 * Where an entry leads from a page off the planet: its own page if it has one,
 * otherwise its area on the hub, opened through the hash the hub reads on
 * arrival (`sectionUrl`).
 */
export function offPlanetHref(item: NavItem): string {
  if (item.section === undefined) return item.page;
  return item.page ?? `/${hashForSection(item.section)}`;
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

/** The entry lit on a page off the planet: the one whose page contains it. */
export function navItemForPath(pathname: string): NavItem | undefined {
  return NAV.find(({ page }) => page !== undefined && (pathname === page || pathname.startsWith(`${page}/`)));
}
