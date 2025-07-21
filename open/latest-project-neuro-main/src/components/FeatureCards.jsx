import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Mic, FileText, Sparkles, Network, Search } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Mic,
    title: 'Record Audio',
    description: 'Capture your ideas, meetings, or thoughts effortlessly — in real-time.',
    gradient: 'from-red-500 to-pink-500',
  },
  {
    icon: FileText,
    title: 'Transcribe Instantly',
    description: 'Your words turned into structured text with pinpoint accuracy.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Sparkles,
    title: 'Summarize the Essence',
    description: 'AI condenses long recordings into crisp, actionable highlights.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Network,
    title: 'Visualize Knowledge',
    description: 'Watch your thoughts link together in a glowing graph view — inspired by Obsidian.',
    gradient: 'from-green-500 to-teal-500',
  },
  {
    icon: Search,
    title: 'Search + Recall',
    description: 'Your entire memory vault is searchable by keyword, context, or speaker.',
    gradient: 'from-yellow-500 to-orange-500',
  },
];

export default function FeatureCards() {
  const containerRef = useRef();
  const cardsRef = useRef([]);

  useEffect(() => {
    const cards = cardsRef.current;
    
    gsap.fromTo(cards, 
      { 
        opacity: 0, 
        y: 100,
        scale: 0.8,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
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
    <section className="relative py-20 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            From Voice to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Clarity</span> in Seconds
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Experience the seamless flow from raw audio to organized knowledge
          </p>
        </motion.div>

        <div 
          ref={containerRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={index}
                ref={el => cardsRef.current[index] = el}
                className="group relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-500"
                whileHover={{ 
                  scale: 1.05,
                  rotateY: 5,
                  rotateX: 5,
                }}
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-2xl bg-gradient-to-br ${feature.gradient} blur-xl`} />
                
                <div className="relative z-10">
                  <motion.div 
                    className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.8 }}
                  >
                    <Icon size={32} className="text-white" />
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-white/70 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Neural connection lines */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-px h-8 bg-gradient-to-b from-transparent via-blue-400 to-transparent"
                      style={{
                        left: `${20 + i * 15}%`,
                        top: `${Math.random() * 80}%`,
                      }}
                      animate={{
                        opacity: [0, 1, 0],
                        scaleY: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}