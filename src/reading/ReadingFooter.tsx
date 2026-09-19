import Link from "next/link";
import { GithubIcon, XIcon } from "@/ui/icons";

const ICON_LINK =
  "w-11 h-11 rounded-full flex items-center justify-center bg-white text-gray-800 border border-black/5 hover:text-orange-600 hover:scale-105 active:scale-95 transition-all duration-200";

/**
 * The foot of the sheet: the round link buttons of the hub's dock, then the
 * copyright and the privacy policy, centred under a hairline as at the bottom
 * of the hub's detail sheet.
 *
 * gray-500, not the hub's gray-400: the dock's grey is tuned for the night
 * sky, and on this cream it sits at a contrast ratio of about 2.5:1.
 */
export default function ReadingFooter() {
  return (
    <footer className="mt-24 border-t border-black/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/miiiwa1121"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className={ICON_LINK}
          >
            <GithubIcon size={18} />
          </a>
          <a
            href="https://x.com/miiiwa3330"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            className={ICON_LINK}
          >
            <XIcon size={16} />
          </a>
        </div>
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
