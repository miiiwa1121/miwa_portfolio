import type { SectionType } from "@/types";

export type NavItem = { id: NonNullable<SectionType>; ja: string; en: string };

export const NAV: NavItem[] = [
  { id: "about", ja: "自己紹介", en: "About" },
  { id: "products", ja: "制作実績", en: "Products" },
  { id: "skills", ja: "技術スタック", en: "Skills" },
  { id: "experience", ja: "経歴・活動", en: "Experience" },
  { id: "contact", ja: "お問い合わせ", en: "Contact" },
];
