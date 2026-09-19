import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { leadsToHub } from "@/hub/nav";

/**
 * How the prose of the reading pages (`src/content/**\/*.mdx`) is typeset.
 *
 * Required by `@next/mdx` in the App Router, at this exact location (beside
 * `app/`). Every MDX file in the site goes through here, so this is the one
 * place the long-form type scale lives.
 *
 * Tuned for Japanese running text rather than Latin: 17px with a 1.95 line
 * height (kanji and kana fill the em box, so they need more air between lines
 * than Latin does at 1.6), and the column width is set by the page, not here
 * — about 40 full-width characters.
 *
 * Borders, not shadows, for anything boxed (code, tables): the site's rule in
 * docs/tech.md, "柔らかい環境光的な box-shadow は採用しない".
 */
const components: MDXComponents = {
  // The orange bar of the hub's section headings, as a rule down the left of
  // the heading so it spans a title that wraps.
  h2: ({ children }) => (
    <h2 className="relative mt-16 mb-5 pl-4 text-[1.5rem] sm:text-[1.75rem] font-black leading-[1.4] tracking-tight text-gray-950 [overflow-wrap:anywhere] before:absolute before:left-0 before:top-[0.2em] before:bottom-[0.2em] before:w-1.5 before:rounded-full before:bg-orange-600">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-11 mb-3 text-[1.125rem] sm:text-[1.25rem] font-bold leading-[1.5] text-gray-950">{children}</h3>
  ),
  p: ({ children }) => <p className="my-6 text-[1.0625rem] leading-[1.95] text-gray-800">{children}</p>,
  // A link to another reading page is a route of this app, so it is a
  // next/link. Anything else stays a plain <a> — including /archive/*, which
  // is a separate static build that <Link> would try to prefetch as one of
  // our routes (see ProjectLinks), and the hub, which has to be entered with
  // a full load (see `leadsToHub`).
  a: ({ href = "", children }) => {
    const className =
      "text-orange-700 underline decoration-orange-300 underline-offset-4 hover:decoration-orange-600 transition-colors";
    return href.startsWith("/") && !href.startsWith("/archive") && !leadsToHub(href) ? (
      <Link href={href} className={className}>
        {children}
      </Link>
    ) : (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
  strong: ({ children }) => <strong className="font-bold text-gray-950">{children}</strong>,
  ul: ({ children }) => (
    <ul className="my-6 pl-6 list-disc marker:text-orange-500 space-y-2 text-[1.0625rem] leading-[1.9] text-gray-800">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-6 pl-6 list-decimal marker:text-gray-400 marker:font-mono space-y-2 text-[1.0625rem] leading-[1.9] text-gray-800">
      {children}
    </ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-8 border-l-2 border-orange-300 pl-5 text-gray-600 [&_p]:text-gray-600">
      {children}
    </blockquote>
  ),
  // Inline code. Inside a <pre> the same element is reset by the pre's own
  // descendant selector, so a code block does not get a pill per line.
  code: ({ children }) => (
    <code className="font-mono text-[0.88em] px-1.5 py-0.5 rounded-md bg-black/[0.045] text-gray-900 [overflow-wrap:anywhere]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-8 overflow-x-auto rounded-2xl border border-black/5 bg-white p-5 text-[0.875rem] leading-[1.75] text-gray-900 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[1em] [&_code]:[overflow-wrap:normal]">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-8 overflow-x-auto">
      <table className="w-full border-collapse text-[0.9375rem] leading-[1.7] tabular-nums">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-black/20 px-3 py-2 text-left font-bold text-gray-950 whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-black/5 px-3 py-2 align-top text-gray-800">{children}</td>,
  hr: () => <hr className="my-14 border-0 border-t border-black/10" />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
