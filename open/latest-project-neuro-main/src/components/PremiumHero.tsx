import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { Play, ArrowRight } from 'lucide-react';

export default function PremiumHero() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 1 });
    
    tl.fromTo(titleRef.current, 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, ease: "power2.out" }
    )
    .fromTo(subtitleRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
      "-=0.5"
    )
    .fromTo(descriptionRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
      "-=0.4"
    )
    .fromTo(ctaRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
      "-=0.3"
    );
  }, []);

  const scrollToDemo = () => {
    const element = document.getElementById('audio');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-4xl mx-auto">
        <h1 
          ref={titleRef}
          className="text-7xl md:text-8xl font-bold text-white mb-8 tracking-tight leading-none"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          NeuroVault
        </h1>
        
        <p 
          ref={subtitleRef}
          className="text-2xl md:text-3xl text-white/90 mb-6 font-light tracking-wide"
        >
          Transform Audio into Structured Intelligence
        </p>
        
        <p 
          ref={descriptionRef}
          className="text-lg text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          Harness AI to convert spoken content into organized, actionable insights — seamlessly.
        </p>

        <div ref={ctaRef} className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <motion.button
            onClick={scrollToDemo}
            className="group relative px-8 py-4 bg-gradient-to-r from-[#0B1D35] to-[#2C0B35] text-white rounded-full font-semibold text-lg overflow-hidden border border-white/10"
            whileHover={{ 
              scale: 1.02,
              boxShadow: "0 0 30px rgba(0, 240, 255, 0.3)"
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <span className="relative z-10 flex items-center">
              Request Beta Access
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
            </span>
            
            {/* Ripple effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full"
              initial={{ scale: 0, opacity: 1 }}
              whileHover={{ scale: 1, opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          </motion.button>
          
          <motion.button
            onClick={scrollToDemo}
            className="group flex items-center text-white/70 hover:text-white transition-colors duration-300 font-medium"
            whileHover={{ x: 5 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mr-3 group-hover:border-cyan-400/50 transition-colors duration-300">
              <Play className="ml-1 group-hover:text-cyan-400 transition-colors duration-300" size={18} />
            </div>
            Watch Demo
          </motion.button>
        </div>
      </div>
    </section>
  );
}