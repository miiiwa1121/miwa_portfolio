/**
 * Facts about the site itself, as opposed to what is on it.
 *
 * `SITE_URL` used to be typed out in `layout.tsx`, `sitemap.ts`, `robots.ts`
 * and the privacy page separately. The reading pages need it once per page
 * for their canonical URL, which would have made a fifth and sixth copy.
 */
export const SITE_URL = "https://miiiwa.com";

/**
 * The AdSense publisher ID, in the `ca-pub-` form the ad script takes.
 *
 * `public/ads.txt` has to carry the same number in its `pub-` form and cannot
 * import it — it is a static file served as-is. `site.test.ts` holds the two
 * together, since a mismatch fails silently: the file is served, AdSense just
 * treats the inventory as unauthorised.
 */
export const ADSENSE_CLIENT = "ca-pub-3824645900927410";

/** An absolute URL on this site, for canonical links and the sitemap. */
export function siteUrl(path: string): string {
  if (!path.startsWith("/")) throw new Error(`path must start with "/": ${path}`);
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}
