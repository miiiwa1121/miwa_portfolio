import Link from "next/link";
import type { SectionType } from "@/types";
import { NAV, PAGE_LINKS, leadsToHub, navKey, offPlanetHref, type NavEntry } from "./nav";

type Props = {
  isJa: boolean;
  /** The entry drawn lit. */
  current: NavEntry | undefined;
  /**
   * Given on the hub, where an area is a camera flight rather than a page:
   * its entry becomes a button that calls this. Without it (the reading
   * pages) every area is a link — see `offPlanetHref`, and `leadsToHub`
   * for why the ones into the hub are plain <a>. The page links after the
   * divider are next/link everywhere.
   */
  onSectionClick?: (id: NonNullable<SectionType>) => void;
  className?: string;
};

const itemClass = (lit: boolean) =>
  `px-4 py-2 rounded-full text-base font-bold whitespace-nowrap transition-all duration-200 ${lit
    ? "bg-orange-600 text-white shadow-sm"
    : "text-gray-700 hover:text-orange-600 hover:bg-orange-50/80"
  }`;

/**
 * The white pill of navigation in the header's top right — the hub's and the
 * reading pages', drawn by this one component so the two cannot drift apart.
 * The five areas, then a divider, then the pages off the planet (`PAGE_LINKS`).
 */
export default function NavPills({ isJa, current, onSectionClick, className = "" }: Props) {
  return (
    <nav
      aria-label={isJa ? "メニュー" : "Menu"}
      className={`gap-1.5 pointer-events-auto bg-white px-2 py-2 rounded-full border border-black/5 shadow-sm ${className}`}
    >
      {NAV.map((item) => {
        const lit = item === current;
        const label = isJa ? item.ja : item.en;

        if (onSectionClick) {
          const id = item.section;
          return (
            <button key={navKey(item)} onClick={() => onSectionClick(id)} className={itemClass(lit)}>
              {label}
            </button>
          );
        }
        const href = offPlanetHref(item);
        const linkProps = { href, "aria-current": lit ? ("page" as const) : undefined, className: itemClass(lit) };
        return leadsToHub(href) ? (
          <a key={navKey(item)} {...linkProps}>
            {label}
          </a>
        ) : (
          <Link key={navKey(item)} {...linkProps}>
            {label}
          </Link>
        );
      })}

      {/* The "｜" between the planet and the pages off it. */}
      <span aria-hidden="true" className="self-center w-px h-5 mx-1 bg-black/15" />

      {PAGE_LINKS.map((link) => {
        const lit = link === current;
        return (
          <Link
            key={navKey(link)}
            href={link.page}
            aria-current={lit ? "page" : undefined}
            className={itemClass(lit)}
          >
            {isJa ? link.ja : link.en}
          </Link>
        );
      })}
    </nav>
  );
}
