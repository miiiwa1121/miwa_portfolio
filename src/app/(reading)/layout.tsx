import ReadingHeader from "@/reading/ReadingHeader";
import ReadingFooter from "@/reading/ReadingFooter";
import ReadingDock from "@/reading/ReadingDock";

/**
 * The shell of every reading page — the products' write-ups, the notes, and
 * their indexes. A route group, so the URLs stay `/products/...` and
 * `/notes/...` without a segment for the group itself.
 *
 * These pages are ordinary scrolling HTML on purpose. The hub is a 3D canvas
 * whose words mostly exist inside WebGL or behind interactions; everything a
 * search engine or an ad reviewer is meant to read lives here instead.
 *
 * They are dressed as the hub's detail sheet — its cream, its header, its
 * section headings and cards — so that arriving here from the planet (the
 * popup's Read More, the Note entry) does not feel like leaving the site.
 * `safe-inset` for the same reason as the hub's chrome: the root layout draws
 * the page under the notch (`viewportFit: "cover"`).
 */
export default function ReadingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground safe-inset">
      <ReadingHeader />
      <main className="flex-1 pt-24 sm:pt-28 md:pt-32">{children}</main>
      <ReadingFooter />
      <ReadingDock />
    </div>
  );
}
