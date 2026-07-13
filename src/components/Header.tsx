"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Terminal, Globe } from "lucide-react";
import { useTerminal } from "./TerminalContext";
import { useLanguage } from "./LanguageContext";

const GithubIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);

const TwitterIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
);

const navItems = [
  { name: "About", href: "#about" },
  { name: "Products", href: "#products" },
  { name: "Skills", href: "#skills" },
  { name: "Experience", href: "#experience" },
  { name: "Contact", href: "#contact" },
];

export default function Header() {
  const { openTerminal } = useTerminal();
  const { language, toggleLanguage } = useLanguage();

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10"
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tighter text-white">
          Miiiwa<span className="text-[var(--primary)]">.</span>
        </Link>

        <nav className="hidden md:flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm text-gray-300 hover:text-[var(--primary)] transition-colors font-medium tracking-wide"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={openTerminal}
            className="text-green-500 hover:text-green-400 bg-green-500/10 hover:bg-green-500/20 p-2 rounded-md transition-colors border border-green-500/30 flex items-center gap-2"
            title="Open Terminal Mode"
          >
            <Terminal size={18} />
            <span className="text-xs font-mono hidden sm:inline">TERMINAL</span>
          </button>
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-colors"
            title="Toggle Language"
          >
            <Globe size={16} className={language === 'en' ? 'text-[var(--primary)]' : 'text-white'} />
            <span className="text-xs font-bold w-6 text-center">{language === 'ja' ? 'JP' : 'EN'}</span>
          </button>
          
          <Link href="https://x.com/miiiwa3330" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
            <TwitterIcon size={20} />
          </Link>
          <Link href="https://github.com/miiiwa1121" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
            <GithubIcon size={20} />
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
