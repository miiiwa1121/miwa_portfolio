import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { productPath, type Project } from "@/data";
import { CARD_TAG_COUNT, statusLabel } from "@/detail/products/catalog";
import { CategoryBadge, StatusBadge } from "@/detail/products/Badges";

type Props = {
  projects: readonly Project[];
  /** Heading level of each card's title — `h2` on the index, `h3` under a section heading. */
  titleAs?: "h2" | "h3";
  /** 3 on the index, which is as wide as the hub's sheet; 2 in a write-up's narrower column. */
  columns?: 2 | 3;
};

/**
 * Products as the hub's card grid: image with the status on it, name and
 * category, two lines of description, the first few tags.
 *
 * The hub's card opens its popup; on a static page the whole card is simply
 * the link to the product's own page. It carries no Code / Play of its own —
 * a link inside a link is not valid HTML — and the page it opens leads with
 * Play anyway.
 *
 * `minmax(0, 1fr)`, not a bare `1fr`: a bare fraction refuses to shrink
 * below the longest unbreakable word, which at 320px pushes a card past the
 * screen edge.
 */
export default function ProductList({ projects, titleAs: Title = "h2", columns = 3 }: Props) {
  return (
    <ul
      className={`grid grid-cols-[minmax(0,1fr)] gap-6 md:gap-8 ${columns === 3
          ? "md:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,1fr))]"
          : "sm:grid-cols-[repeat(2,minmax(0,1fr))]"
        }`}
    >
      {projects.map((project) => (
        <li key={project.slug} className="flex">
          <Link
            href={productPath(project.slug)}
            className="group flex-1 rounded-3xl bg-white border border-black/5 overflow-hidden flex flex-col hover:border-orange-300 motion-safe:hover:-translate-y-1 transition-[border-color,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <div className="relative w-full overflow-hidden h-48 bg-gray-50">
              <Image
                src={project.image}
                alt=""
                fill
                sizes={columns === 3 ? "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" : "(min-width: 640px) 50vw, 100vw"}
                className="object-cover motion-safe:group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3.5 right-3.5">
                <StatusBadge status={project.status} label={statusLabel(project.status, "ja")} />
              </div>
            </div>

            <div className="flex-1 flex flex-col p-6">
              <div className="flex justify-between items-start mb-2 gap-2">
                <Title className="min-w-0 text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1 [overflow-wrap:anywhere]">
                  {project.title}
                </Title>
                <CategoryBadge category={project.category} />
              </div>

              <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-2 leading-relaxed">{project.description}</p>

              <div className="flex flex-wrap gap-1.5 mb-6">
                {project.tags.slice(0, CARD_TAG_COUNT).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 bg-gray-50 border border-black/5 rounded-lg text-gray-600 font-medium"
                  >
                    {tag}
                  </span>
                ))}
                {project.tags.length > CARD_TAG_COUNT && (
                  <span className="text-xs px-2.5 py-1 bg-gray-50 border border-black/5 rounded-lg text-gray-500 font-medium">
                    +{project.tags.length - CARD_TAG_COUNT}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-black/5 mt-auto">
                <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-sm font-bold text-orange-700 group-hover:text-orange-600">
                  紹介を読む
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className="motion-safe:group-hover:translate-x-0.5 transition-transform duration-200"
                  />
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
