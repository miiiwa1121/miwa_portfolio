"use client";

import Section from "@/components/Section";
import Image from "next/image";
import { useLanguage } from "../LanguageContext";

export default function About() {
  const { language } = useLanguage();
  
  const t = {
    title: language === "ja" ? "About" : "About Me",
    p1: language === "ja" 
      ? <>初めまして、<span className="text-white font-bold">Miiiwa</span>です。<br className="hidden md:block" />「面白いを最優先！」をモットーに、日々新しい技術に触れながらプロダクト開発に挑戦している駆け出し学生エンジニア（27卒）です。</>
      : <>Hello, I'm <span className="text-white font-bold">Miiiwa</span>.<br className="hidden md:block" />A junior student engineer (Class of '27) challenging product development every day with the motto "Fun First!".</>,
    p2: language === "ja"
      ? "ただ動くものを作るだけでなく、ユーザーにとって「使ってて楽しい」「デザインがカッコいい」と思えるような体験（UX）を提供することを大切にしています。"
      : "I don't just build things that work. I value providing an experience (UX) that makes users feel 'this is fun to use' and 'the design is cool'.",
    p3: language === "ja"
      ? "とにかく新規性重視で、まだこの世にないものを探し求めて、日々を過ごしています！"
      : "I strongly focus on novelty, always searching for things that don't exist in this world yet!",
  };
  return (
    <Section id="about" title={t.title}>
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 text-gray-300 leading-relaxed text-lg">
          <p>{t.p1}</p>
          <p>{t.p2}</p>
          <p>{t.p3}</p>
        </div>
        
        <div className="relative w-full aspect-square max-w-md mx-auto md:max-w-none rounded-2xl overflow-hidden border border-black/10 bg-black/5 shadow-sm backdrop-blur-sm group">
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 mix-blend-overlay"></div>
          <Image 
            src="/images/me1.png"
            alt="Miiiwa"
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </div>
    </Section>
  );
}
