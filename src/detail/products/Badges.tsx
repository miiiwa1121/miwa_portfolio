import type { ProjectCategory, ProjectStatus } from "@/data";

/*
 * The two coloured labels every rendering of a project carries — the hub's
 * card and popup, and the reading pages' cards and write-ups. Kept here so a
 * status or a category is the same colour wherever it appears.
 *
 * No hooks and no "use client": server-rendered reading pages use them too.
 * The caller resolves the label's language.
 */

type Size = "sm" | "lg";

type StatusProps = {
  status: ProjectStatus;
  label: string;
  /** `sm` on a card, `lg` over a large image. */
  size?: Size;
};

export function StatusBadge({ status, label, size = "sm" }: StatusProps) {
  const isPublic = status === "Public";
  const lg = size === "lg";
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold backdrop-blur-md border shadow-sm ${lg ? "gap-2 px-3.5 py-1.5 text-xs sm:text-sm" : "gap-1.5 px-2.5 py-1 text-xs"
        } ${isPublic
          ? "bg-emerald-50/90 text-emerald-700 border-emerald-300/40"
          : "bg-orange-50/90 text-orange-700 border-orange-300/40"
        }`}
    >
      {/* A glow, not a shadow under a surface — see docs/tech.md. */}
      <span
        className={`rounded-full ${lg ? "w-2 h-2" : "w-1.5 h-1.5"} ${isPublic
            ? `bg-emerald-500 ${lg ? "shadow-[0_0_8px_#22c55e]" : "shadow-[0_0_6px_#22c55e]"}`
            : `bg-orange-500 ${lg ? "shadow-[0_0_8px_#f97316]" : "shadow-[0_0_6px_#f97316]"}`
          }`}
      />
      <span>{label}</span>
    </span>
  );
}

type CategoryProps = {
  category: ProjectCategory;
  size?: Size;
};

export function CategoryBadge({ category, size = "sm" }: CategoryProps) {
  return (
    <span
      className={`shrink-0 rounded-full text-xs font-bold border ${size === "lg" ? "px-3 py-1" : "px-2.5 py-0.5"} ${category === "WEB"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
          : "bg-purple-50 text-purple-700 border-purple-200/50"
        }`}
    >
      {category}
    </span>
  );
}
