import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { NOTES, PROJECTS, localizeProject, localizeProjects, notesForProduct, productPath } from "@/data";
import { statusLabel } from "@/detail/products/catalog";
import { CategoryBadge, StatusBadge } from "@/detail/products/Badges";
import SectionHeading from "@/detail/SectionHeading";
import { readingMetadata } from "@/reading/pageMeta";
import BackLink from "@/reading/BackLink";
import ProductActions from "@/reading/ProductActions";
import ProductList from "@/reading/ProductList";
import NoteList from "@/reading/NoteList";

type Params = { params: Promise<{ slug: string }> };

// Only the catalogue's own slugs exist; anything else is a 404 rather than an
// attempt to render at request time, which a static export cannot do anyway.
export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map(({ slug }) => ({ slug }));
}

/** The popup's small caps label above Overview and Tech Stack. */
const LABEL = "font-bold mb-3 border-b border-black/5 pb-2 text-xs tracking-widest uppercase text-gray-500";

function findProject(slug: string) {
  const source = PROJECTS.find((p) => p.slug === slug);
  return source ? localizeProject(source, "ja") : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const project = findProject((await params).slug);
  if (!project) return {};
  return readingMetadata({
    path: productPath(project.slug),
    title: `${project.title} — 制作実績`,
    description: project.description,
    image: project.image,
  });
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) notFound();

  const { default: Body } = await import(`@/content/products/${slug}.mdx`);
  const notes = notesForProduct(NOTES, slug);
  const others = localizeProjects(
    PROJECTS.filter((p) => p.slug !== slug),
    "ja"
  );

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
      <BackLink href="/products">制作実績の一覧</BackLink>

      <article className="mt-3">
        {/* The hub's popup, opened out into a page: the image with the status
            on it, the name and category, Overview and Tech Stack under the
            popup's small caps labels, and its buttons. */}
        <header className="rounded-3xl bg-white border border-black/5 overflow-hidden">
          <div className="relative h-56 sm:h-72 md:h-96 w-full border-b border-black/5 bg-gray-50">
            <Image
              src={project.image}
              alt={`${project.title} の画面`}
              fill
              priority
              sizes="(min-width: 896px) 896px, 100vw"
              className="object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
            <div className="absolute top-5 left-5 sm:top-6 sm:left-6">
              <StatusBadge size="lg" status={project.status} label={statusLabel(project.status, "ja")} />
            </div>
          </div>

          <div className="p-5 sm:p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <h1 className="min-w-0 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-950 [overflow-wrap:anywhere]">
                {project.title}
              </h1>
              <CategoryBadge size="lg" category={project.category} />
            </div>

            <div className="mt-8 space-y-6">
              <section aria-labelledby="overview-heading">
                <h2 id="overview-heading" className={LABEL}>
                  Overview
                </h2>
                <p className="text-gray-700 text-base sm:text-lg leading-relaxed">{project.description}</p>
              </section>
              <section aria-labelledby="stack-heading">
                <h2 id="stack-heading" className={LABEL}>
                  Tech Stack
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="px-3 py-1.5 bg-gray-50 border border-black/5 rounded-xl text-gray-700 text-sm font-medium"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="mt-8 pt-6 border-t border-black/5">
              <ProductActions project={project} />
            </div>
          </div>
        </header>

        {/* The write-up, on the sheet itself rather than in a card: on a
            375px phone a card's padding would take the column down to about
            17 characters a line. From md up it steps in to line up with the card's
            text above. */}
        <div className="mt-8 md:px-10">
          <div className="max-w-[44rem]">
            <Body />
          </div>
        </div>

        <section
          aria-labelledby="try-heading"
          className="mt-16 rounded-3xl bg-white border border-black/5 p-5 sm:p-8 md:p-10"
        >
          <h2 id="try-heading" className="text-xl sm:text-2xl font-black text-gray-950 [overflow-wrap:anywhere]">
            {project.title} を触ってみる
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-[1.85] text-gray-600">{project.description}</p>
          <div className="mt-6">
            <ProductActions project={project} />
          </div>
        </section>
      </article>

      {notes.length > 0 && (
        <section aria-labelledby="notes-heading" className="mt-20">
          <SectionHeading id="notes-heading" size="md" className="mb-8">
            このプロダクトについてのノート
          </SectionHeading>
          <NoteList notes={notes} titleAs="h3" />
        </section>
      )}

      <section aria-labelledby="others-heading" className="mt-20">
        <SectionHeading id="others-heading" size="md" className="mb-8">
          ほかの制作実績
        </SectionHeading>
        <ProductList projects={others} titleAs="h3" columns={2} />
      </section>
    </div>
  );
}
