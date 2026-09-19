import Link from "next/link";
import type { SectionType } from "@/types";
import { NAV, leadsToHub, navKey, offPlanetHref, type NavItem } from "./nav";

type Props = {
  isJa: boolean;
  /** The entry drawn lit. */
  current: NavItem | undefined;
  /**
   * Given on the hub, where an area is a camera flight rather than a page:
   * its entry becomes a button that calls this. Without it (the reading
   * pages) every entry is a link — see `offPlanetHref`, and `leadsToHub`
   * for why the ones into the hub are plain <a>.
   */
  onSectionClick?: (id: NonNullable<SectionType>) => void;
  className?: string;
};

/**
 * The white pill of navigation in the header's top right — the hub's and the
 * reading pages', drawn by this one component so the two cannot drift apart.
 */
export default function NavPills({ isJa, current, onSectionClick, className = "" }: Props) {
  return (
    <nav
      aria-label={isJa ? "メニュー" : "Menu"}
      className={`gap-1.5 pointer-events-auto bg-white px-2 py-2 rounded-full border border-black/5 shadow-sm ${className}`}
    >
      {NAV.map((item) => {
        const lit = item === current;
        const itemClass = `px-4 py-2 rounded-full text-base font-bold whitespace-nowrap transition-all duration-200 ${lit
            ? "bg-orange-600 text-white shadow-sm"
            : "text-gray-700 hover:text-orange-600 hover:bg-orange-50/80"
          }`;
        const label = isJa ? item.ja : item.en;

        if (item.section !== undefined && onSectionClick) {
          const id = item.section;
          return (
            <button key={navKey(item)} onClick={() => onSectionClick(id)} className={itemClass}>
              {label}
            </button>
          );
        }
        const href = offPlanetHref(item);
        const linkProps = { href, "aria-current": lit ? ("page" as const) : undefined, className: itemClass };
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
    </nav>
  );
}
