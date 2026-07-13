export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#020202] py-8 mt-20 relative z-10">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} Miiiwa. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
