import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  href: string;
  children: React.ReactNode;
};

/**
 * The way up from a write-up to its index, in the voice of the hub's
 * "紹介を見る ›" rather than a breadcrumb trail: one level is all there is.
 */
export default function BackLink({ href, children }: Props) {
  return (
    <nav aria-label="パンくずリスト">
      <Link
        href={href}
        className="inline-flex items-center gap-0.5 whitespace-nowrap py-2 text-sm font-bold text-orange-700 hover:text-orange-600 transition-colors"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        {children}
      </Link>
    </nav>
  );
}
