import type { Language } from "@/components/LanguageContext";

export type ProjectCategory = "WEB" | "APP";
export type ProjectStatus = "Public" | "dev";

/** A value that has one form per supported language. */
export type Localized<T> = Record<Language, T>;

/**
 * How a project is authored. Only the prose is per-language — everything else
 * (image, tags, category, status, links) describes the project itself and was
 * previously copy-pasted into both a `ja` and an `en` object, where the two
 * could and did drift apart.
 */
export type ProjectSource = {
  /** Stable identity, also the React key. Replaces a hand-numbered id. */
  slug: string;
  title: Localized<string>;
  description: Localized<string>;
  image: string;
  tags: string[];
  category: ProjectCategory;
  status: ProjectStatus;
  /** "#" means "not published yet" — see isPlaceholderUrl. */
  githubUrl: string;
  demoUrl: string;
};

/** A project resolved into a single language. This is what the UI renders. */
export type Project = Omit<ProjectSource, "title" | "description"> & {
  title: string;
  description: string;
};

/** Resolve one project's prose into `language`. */
export function localizeProject(project: ProjectSource, language: Language): Project {
  return {
    ...project,
    title: project.title[language],
    description: project.description[language],
  };
}

/** Resolve a whole catalogue, preserving authoring order. */
export function localizeProjects(
  projects: readonly ProjectSource[],
  language: Language
): Project[] {
  return projects.map((p) => localizeProject(p, language));
}
