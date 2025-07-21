import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ArrowRight, Zap } from 'lucide-react';

export default function HeroSection() {
  const titleRef = useRef();
  const subtitleRef = useRef();
  const ctaRef = useRef();

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.5 });
    
    // Split text animation
    const titleChars = titleRef.current.querySelectorAll('.char');
    const subtitleChars = subtitleRef.current.querySelectorAll('.char');
    
    tl.fromTo(titleChars, 
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power2.out" }
    )
    .fromTo(subtitleChars,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: "power2.out" },
      "-=0.4"
    )
    .fromTo(ctaRef.current,
      { opacity: 0, y: 30, scale: 0.8 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.7)" },
      "-=0.3"
    );
  }, []);

  const scrollToDemo = () => {
    const element = document.getElementById('demo');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Split text helper
  const splitText = (text) => {
    return text.split('').map((char, index) => (
      <span key={index} className="char inline-block">
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Neural particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <motion.h1 
          ref={titleRef}
          className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
        >
          {splitText('NeuroVault: Your AI Second Brain')}
        </motion.h1>
        
        <motion.p 
          ref={subtitleRef}
          className="text-xl md:text-2xl text-white/80 mb-4 font-light"
        >
          {splitText('From raw audio to organized insight — in seconds.')}
        </motion.p>
        
        <motion.p 
          className="text-lg text-white/60 mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          Convert meetings, lectures, and thoughts into structured knowledge you'll never lose.
        </motion.p>

        <motion.div 
          ref={ctaRef}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <motion.button
            onClick={scrollToDemo}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-lg overflow-hidden"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10 flex items-center">
              Get Early Access
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
            </span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600"
              initial={{ x: '-100%' }}
              whileHover={{ x: '0%' }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
          
          <motion.button
            onClick={scrollToDemo}
            className="group flex items-center text-white/80 hover:text-white transition-colors"
            whileHover={{ x: 5 }}
          >
            <Zap className="mr-2 group-hover:text-yellow-400 transition-colors" size={20} />
            Experience the Flow
          </motion.button>
        </motion.div>

        {/* Audio waveform visualization */}
        <motion.div 
          className="mt-16 flex justify-center items-center space-x-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
        >
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full"
              style={{ height: `${Math.random() * 40 + 10}px` }}
              animate={{
                height: [
                  `${Math.random() * 40 + 10}px`,
                  `${Math.random() * 60 + 20}px`,
                  `${Math.random() * 40 + 10}px`,
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}