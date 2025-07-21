import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const techStack = [
  {
    name: 'OpenAI',
    logo: '🤖',
    description: 'GPT-4 & Whisper API',
    color: 'from-green-400 to-blue-500',
  },
  {
    name: 'Claude',
    logo: '🧠',
    description: 'Advanced reasoning',
    color: 'from-purple-400 to-pink-500',
  },
  {
    name: 'Google Gemini',
    logo: '✨',
    description: 'Multimodal AI',
    color: 'from-yellow-400 to-orange-500',
  },
  {
    name: 'Meta LLaMA',
    logo: '🦙',
    description: 'Open-source power',
    color: 'from-blue-400 to-cyan-500',
  },
  {
    name: 'Mistral',
    logo: '🌪️',
    description: 'European excellence',
    color: 'from-red-400 to-pink-500',
  },
];

export default function TechStack() {
  const containerRef = useRef();
  const logosRef = useRef([]);

  useEffect(() => {
    const logos = logosRef.current;
    
    gsap.fromTo(logos, 
      { 
        opacity: 0, 
        y: 50,
        scale: 0.5,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        }
      }
    );
  }, []);

  return (
    <section className="relative py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Meet Your AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Co-Pilots</span>
          </h2>
          <p className="text-xl text-white/60">
            Backed by the world's most advanced LLMs
          </p>
        </motion.div>

        <div 
          ref={containerRef}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8"
        >
          {techStack.map((tech, index) => (
            <motion.div
              key={index}
              ref={el => logosRef.current[index] = el}
              className="group relative bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-500 text-center"
              whileHover={{ 
                scale: 1.1,
                y: -10,
              }}
            >
              {/* Gradient glow */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-2xl bg-gradient-to-br ${tech.color} blur-xl`} />
              
              <div className="relative z-10">
                <motion.div 
                  className="text-4xl mb-4"
                  whileHover={{ 
                    scale: 1.2,
                    rotate: [0, -10, 10, -10, 0],
                  }}
                  transition={{ duration: 0.5 }}
                >
                  {tech.logo}
                </motion.div>
                
                <h3 className="text-lg font-bold text-white mb-2">
                  {tech.name}
                </h3>
                
                <p className="text-sm text-white/60">
                  {tech.description}
                </p>
              </div>

              {/* Floating particles */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{
                      left: `${20 + i * 30}%`,
                      top: `${20 + i * 20}%`,
                    }}
                    animate={{
                      y: [-10, -20, -10],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}