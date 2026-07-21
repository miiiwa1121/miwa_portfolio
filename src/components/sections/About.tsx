"use client";

import { useLanguage } from "../LanguageContext";
import { motion } from "framer-motion";

export default function About() {
  const { language } = useLanguage();
  
  const t = {
    title: language === "ja" ? "自己紹介" : "About Me",
    p1: language === "ja" 
      ? <>初めまして、<span className="font-bold">Miiiwa</span>です。<br className="hidden xl:block" />「面白いを最優先！」をモットーに、日々新しい技術に触れながらプロダクト開発に挑戦している駆け出し学生エンジニア（27卒）です。</>
      : <>Hello, I&apos;m <span className="font-bold">Miiiwa</span>.<br className="hidden xl:block" />A junior student engineer (Class of &apos;27) challenging product development every day with the motto &quot;Fun First!&quot;.</>,
    p2: language === "ja"
      ? "ただ動くものを作るだけでなく、ユーザーにとって「使ってて楽しい」「デザインがカッコいい」と思えるような体験（UX）を提供することを大切にしています。"
      : "I don't just build things that work. I value providing an experience (UX) that makes users feel 'this is fun to use' and 'the design is cool'.",
    p3: language === "ja"
      ? "とにかく新規性重視で、まだこの世にないものを探し求めて、日々を過ごしています！"
      : "I strongly focus on novelty, always searching for things that don't exist in this world yet!",
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5 }}
      className="pointer-events-auto w-full max-w-lg text-gray-900 bg-white/20 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-black/10 shadow-xl"
    >
      <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-8">
        {t.title}
      </h2>
      <div className="space-y-6 text-gray-800 leading-loose text-base sm:text-lg font-medium">
        <p>{t.p1}</p>
        <p>{t.p2}</p>
        <p>{t.p3}</p>
      </div>
    </motion.div>
  );
}
