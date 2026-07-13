"use client";

import { motion } from "framer-motion";
import { useLanguage } from "../LanguageContext";

export default function Hero() {
  const { language } = useLanguage();
  
  const t = {
    catchphrase: language === "ja" ? "面白いを最優先！" : "Fun First!",
    role: language === "ja" ? "駆け出し学生エンジニア・27卒" : "Junior Student Engineer / Class of '27"
  };
  return (
    <section id="hero" className="min-h-[90vh] flex items-center justify-center relative">
      <div className="max-w-6xl mx-auto px-4 text-center mt-[-10vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.h1 
            className="text-6xl md:text-8xl font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] via-white to-[var(--secondary)]"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {t.catchphrase}
          </motion.h1>
          <motion.p 
            className="text-xl md:text-2xl text-gray-300 font-medium tracking-wider mb-16"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Miiiwa <span className="text-[var(--primary)] mx-3">/</span> {t.role}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col items-center justify-center mt-12"
          >
            <span className="text-sm text-gray-500 tracking-widest mb-4 uppercase">Scroll Down</span>
            <div className="w-[1px] h-24 bg-gradient-to-b from-[var(--primary)] to-transparent relative overflow-hidden">
              <motion.div 
                className="w-full h-1/2 bg-white absolute top-0 shadow-[0_0_10px_#fff]"
                animate={{ top: ['-50%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
