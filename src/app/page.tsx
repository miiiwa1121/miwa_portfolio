"use client";

import { useAppState } from "@/components/AppStateContext";
import { useLanguage } from "@/components/LanguageContext";
import Scene from "@/components/3d/Scene";
import About from "@/components/sections/About";
import Products from "@/components/sections/Products";
import Skills from "@/components/sections/Skills";
import Experience from "@/components/sections/Experience";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/Footer";
import { Globe, Crosshair, ChevronRight } from "lucide-react";
import Image from "next/image"; // For logo if needed, using text for now

export default function Home() {
  const { activeSection, setActiveSection } = useAppState();
  const { language, toggleLanguage } = useLanguage();

  return (
    <main className="w-full relative min-h-screen font-sans">
      {/* 3D Scene fixed in the background */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#fff9e6]">
        <Scene />
      </div>

      {/* --- UI OVERLAY (Hero Section) --- */}
      <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
        
        {/* Top Header */}
        <header className="flex justify-between items-start w-full">
          {/* Top Left: Logo & Recruitment Button */}
          <div className="flex flex-col gap-3 pointer-events-auto">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-gray-100">
              {/* Placeholder for Logo */}
              <div className="w-8 h-8 bg-yellow-400 rounded-md flex items-center justify-center font-bold text-white">Haru</div>
              <span className="font-bold text-gray-800 text-lg">App Factory はる</span>
            </div>
            <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow-[0_4px_0_#c2410c] active:shadow-[0_0px_0_#c2410c] active:translate-y-1 transition-all text-sm w-max">
              採用特設サイト<br/>
              <span className="text-xs font-normal">エンジニア積極採用中！</span>
            </button>
          </div>

          {/* Top Right: Global Navigation */}
          <nav className="hidden lg:flex gap-6 pointer-events-auto bg-white/80 backdrop-blur-md px-6 py-4 rounded-full shadow-sm border border-gray-100">
            {["メッセージ", "企業情報", "事業内容", "制作実績", "採用情報", "お知らせ", "ブログ", "お問い合わせ"].map((item) => (
              <a key={item} href={`#${item}`} className="text-gray-800 font-bold hover:text-orange-500 transition-colors text-sm">
                {item}
              </a>
            ))}
          </nav>
        </header>

        {/* Middle Section */}
        <div className="flex-1 flex items-center justify-between w-full relative">
          
          {/* Left Side: White Card (Company Info) */}
          <div className="pointer-events-auto bg-white rounded-3xl p-8 shadow-xl max-w-sm border-4 border-gray-100 ml-4">
            <h2 className="text-2xl font-black text-gray-800 mb-2">会社概要</h2>
            <p className="text-sm text-gray-500 font-bold mb-4 uppercase tracking-widest">Company</p>
            <p className="text-gray-700 font-medium mb-8 leading-relaxed">
              鹿児島市に拠点を構えるゲーム開発会社です。遊び心溢れるボクセルアートの世界へようこそ！
            </p>
            <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full shadow-[0_4px_0_#c2410c] active:shadow-[0_0px_0_#c2410c] active:translate-y-1 transition-all flex items-center gap-2">
              More <ChevronRight size={18} />
            </button>
          </div>

          {/* Center: Target Cursor */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-pink-500 opacity-80 pointer-events-none">
            <Crosshair size={48} strokeWidth={1.5} />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex justify-end w-full pb-4 pr-4 pointer-events-auto">
          {/* Bottom Right: Language Switcher */}
          <button 
            onClick={toggleLanguage}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-800 shadow-md hover:scale-110 transition-transform border-2 border-gray-200"
          >
            <Globe size={24} />
          </button>
        </div>
      </div>
      
      {/* Spacer to allow the 3D scene to act as the Hero section */}
      <div className="w-full h-[100svh] pointer-events-none"></div>

      {/* Standard Scrolling Content Overlaying the 3D Scene */}
      <div className="relative z-20 bg-white border-t-4 border-gray-200 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] pb-20">
        <About />
        <Products />
        <Skills />
        <Experience />
        <Contact />
        <Footer />
      </div>
    </main>
  );
}
