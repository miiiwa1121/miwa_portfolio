"use client";

import { useAppState } from "@/components/AppStateContext";
import Scene from "@/components/3d/Scene";
import About from "@/components/sections/About";
import Products from "@/components/sections/Products";
import Skills from "@/components/sections/Skills";
import Experience from "@/components/sections/Experience";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/Footer";
import { X } from "lucide-react";

export default function Home() {
  const { activeSection, setActiveSection } = useAppState();

  return (
    <main className="w-full relative min-h-screen">
      {/* 3D Scene fixed in the background */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#0a0a0a]">
        <Scene />
      </div>
      
      {/* Small UI hint overlay (only visible in top hero view) */}
      <div className="fixed top-8 left-8 pointer-events-none z-10 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hidden md:block">
        <p className="text-white text-sm font-bold tracking-widest">
          DRAG TO ROTATE &bull; SCROLL TO EXPLORE &bull; CLICK TO ZOOM
        </p>
      </div>

      {/* HOME Button for zooming out (visible when an object is clicked) */}
      <div 
        className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
          activeSection !== null ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20 pointer-events-none"
        }`}
      >
        <button
          onClick={() => setActiveSection(null)}
          className="flex items-center gap-2 px-6 py-3 bg-black/80 backdrop-blur-md border border-[var(--primary)] text-[var(--primary)] rounded-full shadow-[0_0_15px_rgba(0,240,255,0.2)] hover:bg-[var(--primary)] hover:text-black transition-all font-bold tracking-widest"
        >
          <X size={18} /> HOME
        </button>
      </div>

      {/* Spacer to allow the 3D scene to act as the Hero section */}
      <div className="w-full h-[100svh] pointer-events-none"></div>

      {/* Standard Scrolling Content Overlaying the 3D Scene */}
      <div className="relative z-20 bg-black/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pb-20">
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
