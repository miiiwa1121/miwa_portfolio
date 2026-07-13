import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Skills from "@/components/sections/Skills";
import Experience from "@/components/sections/Experience";
import Products from "@/components/sections/Products";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <Hero />
      <About />
      <Products />
      <Skills />
      <Experience />
      <Contact />
    </div>
  );
}
