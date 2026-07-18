"use client";

import { useAppState } from "./AppStateContext";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import About from "./sections/About";
import Products from "./sections/Products";
import Skills from "./sections/Skills";
import Experience from "./sections/Experience";
import Contact from "./sections/Contact";

export default function SidePanel() {
  const { activeSection, setActiveSection } = useAppState();

  const renderContent = () => {
    switch (activeSection) {
      case "about": return <About />;
      case "products": return <Products />;
      case "skills": return <Skills />;
      case "experience": return <Experience />;
      case "contact": return <Contact />;
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      {activeSection && (
        <>
          {/* Backdrop (invisible but catches clicks to close the panel) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-auto"
            onClick={() => setActiveSection(null)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[500px] md:w-[600px] z-50 bg-black/80 backdrop-blur-xl border-l border-white/10 shadow-2xl overflow-y-auto custom-scrollbar pointer-events-auto"
          >
            <div className="sticky top-0 right-0 p-4 flex justify-end z-10 bg-gradient-to-b from-black/80 to-transparent">
              <button 
                onClick={() => setActiveSection(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white backdrop-blur-md"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="px-6 pb-20 pt-4">
              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
