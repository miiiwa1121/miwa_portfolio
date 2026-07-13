"use client";

import Section from "@/components/Section";
import { motion } from "framer-motion";
import { Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "../LanguageContext";

export default function Contact() {
  const { language } = useLanguage();
  return (
    <Section id="contact" title="Contact" className="mb-20">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="p-8 md:p-12 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]"></div>
          
          <h3 className="text-2xl md:text-4xl font-bold text-white mb-6">Let's build something <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">amazing</span></h3>
          <p className="text-gray-400 mb-10 text-lg">
            {language === "ja" 
              ? "プロダクト開発、ポートフォリオへのフィードバック、またはただの雑談でも大歓迎です！お気軽にご連絡ください。" 
              : "I'm always open to discussing product development, feedback on my portfolio, or just having a chat! Feel free to reach out."}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link 
              href="https://x.com/miiiwa3330" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform"
            >
              <MessageSquare size={20} />
              DM on X
            </Link>
            <Link 
              href="mailto:contact@example.com" 
              className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 rounded-full bg-white/10 text-white font-bold border border-white/20 hover:bg-white/20 hover:scale-105 transition-all"
            >
              <Mail size={20} />
              Email Me
            </Link>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
