import type { SectionType } from "@/types";

/**
 * What each area's card says.
 *
 * Shared rather than duplicated: the desktop stack (`SectionCard`) and the
 * handheld rail (`CardRail`) show the same five areas in two different
 * shapes, and copy kept in both would drift the moment either was edited.
 */
export const CARD_COPY: Record<
  NonNullable<SectionType>,
  { jaTitle: string; enTitle: string; sub: string; ja: string; en: string }
> = {
  about: {
    jaTitle: "自己紹介",
    enTitle: "About",
    sub: "About Me",
    ja: "「面白いを最優先！」がモットー。新規性を重視し、まだこの世にないものを探し求めている27卒の学生エンジニアです。",
    en: "My motto is \"Fun First!\" A Class-of-'27 student engineer who values novelty and searches for things that don't exist yet.",
  },
  products: {
    jaTitle: "制作実績",
    enTitle: "Products",
    sub: "Works",
    ja: "アイデアを形にしてきたプロダクトたち。ゲームからWebアプリまで、遊び心と技術を詰め込みました。",
    en: "Products where ideas took shape — from games to web apps, packed with playfulness and craft.",
  },
  skills: {
    jaTitle: "技術スタック",
    enTitle: "Skills",
    sub: "Tech Stack",
    ja: "フロントエンドを中心に、UXとデザインにこだわりながら日々新しい技術へ挑戦しています。",
    en: "Front-end focused, obsessed with UX and design, and always challenging new technology.",
  },
  experience: {
    jaTitle: "経歴・活動",
    enTitle: "Experience",
    sub: "Journey",
    ja: "これまでの学び・挑戦・活動の記録。学生ながら幅広くものづくりに取り組んできました。",
    en: "A record of learning, challenges, and activity — a wide range of making, all while studying.",
  },
  contact: {
    jaTitle: "お問い合わせ",
    enTitle: "Contact",
    sub: "Get in touch",
    ja: "お気軽にご連絡ください！SNSやフォームからいつでもどうぞ。",
    en: "Feel free to reach out — anytime via social links or the form.",
  },
};
