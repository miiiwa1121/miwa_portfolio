import type { MetadataRoute } from "next";
import { NOTES, PROJECTS, notePath, productPath, sortNotesNewestFirst } from "@/data";
import { siteUrl } from "@/data/site";

export const dynamic = "force-static";

/**
 * Every page a search engine should know about. The reading pages are listed
 * from the same data their routes are generated from, so a new product or
 * note cannot exist without also being here (`sitemap.test.ts`).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const notes = sortNotesNewestFirst(NOTES);
  const newestNote = notes[0] ? new Date(notes[0].date) : now;

  return [
    { url: siteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: siteUrl("/products"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...PROJECTS.map((p) => ({
      url: siteUrl(productPath(p.slug)),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: siteUrl("/notes"), lastModified: newestNote, changeFrequency: "weekly", priority: 0.8 },
    ...notes.map((n) => ({
      url: siteUrl(notePath(n.slug)),
      lastModified: new Date(n.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
    { url: siteUrl("/privacy"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
