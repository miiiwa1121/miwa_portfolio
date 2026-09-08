import Link from "next/link";

export default function Footer() {
  return (
    <footer className="flex items-center gap-3 text-gray-400 hover:text-gray-300 text-xs font-mono font-medium tracking-wide transition-colors">
      <span>© {new Date().getFullYear()} Miiiwa</span>
      <span>•</span>
      <Link
        href="/privacy"
        className="underline text-gray-400 hover:text-orange-400 transition-colors"
      >
        Privacy Policy
      </Link>
    </footer>
  );
}
