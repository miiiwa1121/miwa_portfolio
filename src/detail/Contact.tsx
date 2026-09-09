"use client";

import { useState } from "react";
import Section from "./Section";
import { motion } from "framer-motion";
import { MessageSquare, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/state/LanguageContext";

export default function Contact() {
  const { language } = useLanguage();
  const isJa = language === "ja";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("@miiiwa3330");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Section id="contact" title="Contact" className="mb-20">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="p-8 sm:p-12 md:p-16 rounded-3xl bg-white border border-black/10 shadow-xl shadow-black/5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 via-pink-400 to-orange-400"></div>

          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span>{isJa ? "ご連絡・ご相談いつでも歓迎です" : "Open to opportunities & chats"}</span>
          </div>

          <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-950 mb-4 tracking-tight">
            Let&apos;s build something <span className="text-orange-600">amazing</span>
          </h3>

          <p className="text-gray-600 mb-10 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            {isJa
              ? "プロダクト開発、ポートフォリオへのフィードバック、またはただの雑談でも大歓迎です！お気軽にご連絡ください。"
              : "I'm always open to discussing product development, feedback on my portfolio, or just having a chat! Feel free to reach out."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="https://x.com/miiiwa3330"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold shadow-[0_4px_0_#9a3412] hover:shadow-[0_2px_0_#9a3412] hover:translate-y-[2px] active:shadow-none active:translate-y-1 transition-all text-base"
            >
              <MessageSquare size={18} />
              <span>DM on X (@miiiwa3330)</span>
            </Link>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 font-bold border border-black/10 transition-all active:scale-95 text-base cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={18} className="text-emerald-600" />
                  <span className="text-emerald-700">{isJa ? "コピーしました！" : "Copied!"}</span>
                </>
              ) : (
                <>
                  <Copy size={18} />
                  <span>{isJa ? "IDをコピー" : "Copy Handle"}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
