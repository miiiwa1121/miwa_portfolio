import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatNoteDate, notePath, type NoteSource } from "@/data";

type Props = {
  notes: readonly NoteSource[];
  /** Heading level of each entry's title — `h2` on the index, `h3` under a section heading. */
  titleAs?: "h2" | "h3";
};

/**
 * Notes as cards in the voice of the hub's Experience timeline: the date in
 * the same orange pill as a milestone's period, a bold title, the summary,
 * and the "›" call to action at the foot. The whole card is the link.
 *
 * Two columns at most, unlike the products' three: a note's title is a
 * sentence (the longest runs to 27 characters), not a product's name.
 */
export default function NoteList({ notes, titleAs: Title = "h2" }: Props) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[repeat(2,minmax(0,1fr))] gap-6">
      {notes.map((note) => (
        <li key={note.slug} className="flex">
          <Link
            href={notePath(note.slug)}
            className="group flex-1 flex flex-col p-6 sm:p-7 rounded-2xl bg-white border border-black/5 hover:border-orange-300/80 motion-safe:hover:-translate-y-1 transition-[border-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <time
              dateTime={note.date}
              className="self-start text-orange-700 font-mono text-xs sm:text-sm font-bold bg-orange-50 border border-orange-200/60 px-3 py-1 rounded-full tabular-nums"
            >
              {formatNoteDate(note.date)}
            </time>
            <Title className="mt-4 font-bold text-gray-950 text-lg sm:text-xl leading-[1.5] group-hover:text-orange-600 transition-colors [overflow-wrap:anywhere]">
              {note.title}
            </Title>
            <p className="mt-2 flex-1 text-gray-600 text-sm sm:text-base leading-relaxed">{note.description}</p>
            <div className="mt-4 pt-4 border-t border-black/5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <span className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-xs text-gray-500">
                {note.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </span>
              <span className="ml-auto inline-flex items-center gap-0.5 whitespace-nowrap text-sm font-bold text-orange-700 group-hover:text-orange-600">
                読む
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  className="motion-safe:group-hover:translate-x-0.5 transition-transform duration-200"
                />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
