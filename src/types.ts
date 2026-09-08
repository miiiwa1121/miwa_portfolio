/**
 * Vocabulary shared across layers that otherwise have no business depending
 * on each other — data/scene/state would each need to import a Context
 * module just to name a type. Defined once here so none of them do.
 */

export type Language = "ja" | "en";

export type SectionType = "about" | "products" | "skills" | "experience" | "contact" | null;
