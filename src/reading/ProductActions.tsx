import { ExternalLink } from "lucide-react";
import { GithubIcon } from "@/ui/icons";
import type { Project } from "@/data";
import { isPlaceholderUrl } from "@/detail/products/catalog";

type Props = {
  project: Project;
};

const BUTTON =
  "flex-1 py-3.5 sm:py-4 px-5 flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-bold text-sm sm:text-base transition-all";

/**
 * "Play Now" and "View Code", for a product's own page — the popup's pair,
 * with the popup's labels and shapes, since this page is where its Read More
 * leads.
 *
 * Trying the product is the one thing these pages exist to lead to, so Play
 * is the only filled button on them. The hub's `ProjectLinks` intercepts a
 * placeholder URL ("#") with a toast; a static page has no toast to show, so
 * an unreleased product says so in words, in the button's place, instead of
 * offering a dead button.
 *
 * Plain <a>, not next/link, for the same reason as `ProjectLinks`: a local
 * demo (`/archive/v1`) is a separate static build, not one of our routes.
 */
export default function ProductActions({ project }: Props) {
  const playable = !isPlaceholderUrl(project.demoUrl);
  const hasCode = !isPlaceholderUrl(project.githubUrl);

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      {playable ? (
        <a
          href={project.demoUrl}
          className={`${BUTTON} bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-[0_4px_0_#9a3412] hover:shadow-[0_2px_0_#9a3412] hover:translate-y-[2px] active:shadow-none active:translate-y-1`}
        >
          <ExternalLink size={18} aria-hidden="true" />
          Play Now
        </a>
      ) : (
        // Not a button, so it may wrap: at 320px the sentence is wider than
        // the column, and `BUTTON` would hold it to one line.
        <p className="flex-1 py-3.5 sm:py-4 px-5 flex items-center justify-center text-center rounded-2xl border border-dashed border-black/15 font-bold text-sm sm:text-base text-gray-600">
          開発中のため、まだ公開していません
        </p>
      )}
      {hasCode && (
        <a
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BUTTON} bg-white hover:bg-gray-50 border border-black/10 text-gray-800 hover:scale-[1.01] active:scale-95`}
        >
          <GithubIcon size={18} />
          View Code
        </a>
      )}
    </div>
  );
}
