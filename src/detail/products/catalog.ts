import type { Project } from "@/data";
import type { Language } from "@/state/LanguageContext";

/** Category filter values. "All" is the no-op option. */
export const CATEGORY_FILTERS = ["All", "WEB", "APP"] as const;
export type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

/** Status filter values, matching Project["status"] plus the no-op option. */
export const STATUS_FILTERS = ["All", "Public", "dev"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

/**
 * The catalogue filter. Pure and total: "All" always passes, and an unknown
 * value simply matches nothing rather than silently showing everything.
 */
export function filterProjects(
  projects: readonly Project[],
  category: CategoryFilter,
  status: StatusFilter
): Project[] {
  return projects.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      (status === "All" || p.status === status)
  );
}

const STATUS_LABELS_JA: Record<StatusFilter, string> = {
  All: "すべて",
  Public: "公開中",
  dev: "開発中",
};

/** Human label for a status. English uses the raw value as-is. */
export function statusLabel(status: string, language: Language): string {
  if (language === "en") return status;
  return STATUS_LABELS_JA[status as StatusFilter] ?? status;
}

/**
 * Projects that aren't public yet carry "#" as their URL. Treat those as
 * placeholders so the UI can intercept the click instead of navigating
 * to the top of the page.
 */
export function isPlaceholderUrl(url: string): boolean {
  return !url || url === "#";
}
