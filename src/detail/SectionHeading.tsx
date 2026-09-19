import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** `h2` inside the hub's sheet; a reading page's own title is its `h1`. */
  as?: "h1" | "h2";
  /** `lg` is a whole area's title; `md` heads a part of a page. */
  size?: "lg" | "md";
  /** For a section's `aria-labelledby`. */
  id?: string;
  className?: string;
};

const SIZES = {
  lg: { bar: "w-2.5 h-8 sm:h-9", text: "text-3xl sm:text-4xl md:text-5xl" },
  md: { bar: "w-2 h-6 sm:h-7", text: "text-2xl sm:text-3xl" },
} as const;

/**
 * The orange bar and the heavy title that open every area of the detail
 * sheet — and, drawn by the same component, every reading page, so the two
 * read as one site.
 */
export default function SectionHeading({ children, as: Tag = "h2", size = "lg", id, className = "" }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span aria-hidden="true" className={`${SIZES[size].bar} shrink-0 bg-orange-600 rounded-full inline-block`} />
      <Tag id={id} className={`${SIZES[size].text} min-w-0 font-black tracking-tight text-gray-950 [overflow-wrap:anywhere]`}>
        {children}
      </Tag>
    </div>
  );
}
