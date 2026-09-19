import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NOTES, PROJECTS, formatNoteDate, localizeProjects, notePath, sortNotesNewestFirst } from "@/data";
import SectionHeading from "@/detail/SectionHeading";
import { readingMetadata } from "@/reading/pageMeta";
import BackLink from "@/reading/BackLink";
import NoteList from "@/reading/NoteList";
import ProductList from "@/reading/ProductList";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return NOTES.map(({ slug }) => ({ slug }));
}

/** How many other entries to suggest under a note. */
const MORE_NOTES = 5;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const note = NOTES.find((n) => n.slug === slug);
  if (!note) return {};
  return readingMetadata({ path: notePath(note.slug), title: note.title, description: note.description });
}

export default async function NotePage({ params }: Params) {
  const { slug } = await params;
  const note = NOTES.find((n) => n.slug === slug);
  if (!note) notFound();

  const { default: Body } = await import(`@/content/notes/${slug}.mdx`);
  const products = localizeProjects(
    PROJECTS.filter((p) => note.products.includes(p.slug)),
    "ja"
  );
  const more = sortNotesNewestFirst(NOTES.filter((n) => n.slug !== slug)).slice(0, MORE_NOTES);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
      <BackLink href="/notes">ノートの一覧</BackLink>

      <article className="mt-3">
        {/* The title card: the date in the Experience timeline's orange pill,
            the title, the summary as the lead. */}
        <header className="rounded-3xl bg-white border border-black/5 p-5 sm:p-8 md:p-10">
          <time
            dateTime={note.date}
            className="inline-block text-orange-700 font-mono text-xs sm:text-sm font-bold bg-orange-50 border border-orange-200/60 px-3 py-1 rounded-full tabular-nums"
          >
            {formatNoteDate(note.date)}
          </time>
          <h1 className="mt-5 text-[1.75rem] sm:text-4xl md:text-[2.625rem] font-black leading-[1.35] tracking-tight text-gray-950 [overflow-wrap:anywhere]">
            {note.title}
          </h1>
          <p className="mt-5 text-base sm:text-lg leading-[1.9] text-gray-600">{note.description}</p>
          <p className="mt-6 pt-5 border-t border-black/5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-gray-500">
            {note.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </p>
        </header>

        {/* On the sheet rather than in a card, as on a product's page. */}
        <div className="mt-8 md:px-10">
          <div className="max-w-[44rem]">
            <Body />
          </div>
        </div>
      </article>

      {products.length > 0 && (
        <section aria-labelledby="products-heading" className="mt-20">
          <SectionHeading id="products-heading" size="md" className="mb-8">
            このノートに出てくるプロダクト
          </SectionHeading>
          <ProductList projects={products} titleAs="h3" columns={2} />
        </section>
      )}

      {more.length > 0 && (
        <section aria-labelledby="more-heading" className="mt-20">
          <SectionHeading id="more-heading" size="md" className="mb-8">
            ほかのノート
          </SectionHeading>
          <NoteList notes={more} titleAs="h3" />
        </section>
      )}
    </div>
  );
}
