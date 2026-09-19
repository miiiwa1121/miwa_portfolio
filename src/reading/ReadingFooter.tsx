import Link from "next/link";

/**
 * The foot of the sheet: the copyright and the privacy policy, centred under a
 * hairline as at the bottom of the hub's detail sheet.
 *
 * gray-500, not the hub's gray-400: the dock's grey is tuned for the night
 * sky, and on this cream it sits at a contrast ratio of about 2.5:1.
 */
export default function ReadingFooter() {
  return (
    <footer className="mt-24 border-t border-black/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-mono text-gray-500">
          <span>© {new Date().getFullYear()} Miiiwa</span>
          <span aria-hidden="true">•</span>
          <Link
            href="/privacy"
            className="whitespace-nowrap py-2 underline underline-offset-2 hover:text-orange-600 transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
