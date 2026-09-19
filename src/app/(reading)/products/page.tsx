import type { Metadata } from "next";
import { PROJECTS, localizeProjects } from "@/data";
import SectionHeading from "@/detail/SectionHeading";
import { readingMetadata } from "@/reading/pageMeta";
import ProductList from "@/reading/ProductList";

const DESCRIPTION =
  "Miiiwa が作ってきたプロダクトの一覧です。ブラウザで遊べるゲームや Web サービスから、開発中のアプリまで。それぞれのページに、作った理由と中身の話を書いています。";

export const metadata: Metadata = readingMetadata({
  path: "/products",
  title: "制作実績",
  description: DESCRIPTION,
  type: "website",
});

export default function ProductsIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 md:pt-10">
      <SectionHeading as="h1">Products</SectionHeading>
      <p className="mt-5 mb-10 md:mb-14 max-w-3xl text-base sm:text-lg leading-relaxed text-gray-600">{DESCRIPTION}</p>
      <ProductList projects={localizeProjects(PROJECTS, "ja")} />
    </div>
  );
}
