/**
 * How a note is authored.
 *
 * A note is a short dev-diary entry, not a manual: what was built, what went
 * wrong, and what it felt like. Only the facts about the entry live here —
 * the prose is `src/content/notes/<slug>.mdx`, which repeats none of them
 * (the page draws the title and date from this record, not from the MDX).
 *
 * Japanese only. The reading pages are written for search visitors, and the
 * site's language toggle is client state that a statically exported page
 * cannot be served in two versions of.
 */
export type NoteSource = {
  /** URL segment and MDX file name. */
  slug: string;
  title: string;
  /** One or two sentences: the summary on the index and the meta description. */
  description: string;
  /**
   * The day the work the note tells of was done, `YYYY-MM-DD` — not the day
   * the note went online (the user's call, devlog 2026-09-20). The pages show
   * it, and the sitemap gives it as the note's `lastModified`.
   */
  date: string;
  tags: string[];
  /**
   * Products the entry is about, by `ProjectSource.slug`. Their pages list
   * the entry, and the entry ends by pointing back at them.
   */
  products: string[];
};

/** Where a note is served. */
export function notePath(slug: string): string {
  return `/notes/${slug}`;
}

/**
 * Newest first. Entries sharing a date keep their authored order, so a day
 * with two entries reads in the order they were written down.
 */
export function sortNotesNewestFirst(notes: readonly NoteSource[]): NoteSource[] {
  return notes
    .map((note, index) => ({ note, index }))
    .sort((a, b) => (a.note.date === b.note.date ? a.index - b.index : a.note.date < b.note.date ? 1 : -1))
    .map(({ note }) => note);
}

/** The entries about one product, newest first. */
export function notesForProduct(notes: readonly NoteSource[], productSlug: string): NoteSource[] {
  return sortNotesNewestFirst(notes.filter((note) => note.products.includes(productSlug)));
}

/** `2026-09-19` → `2026年9月19日`. Parsed by hand: `Date` would read it as UTC. */
export function formatNoteDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`not a YYYY-MM-DD date: ${date}`);
  const [, y, m, d] = match;
  return `${Number(y)}年${Number(m)}月${Number(d)}日`;
}
