import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Shield, Network, Share2 } from 'lucide-react';

const features = [
  {
    icon: Settings,
    title: 'Personalize Your Brain',
    description: 'Customize tags, summaries, and graphs to fit your workflow.',
    color: 'from-blue-500 to-purple-500',
    details: 'Create custom categories, set personal shortcuts, and train the AI to understand your unique thinking patterns.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: "We don't peek. Your knowledge is yours.",
    color: 'from-green-500 to-teal-500',
    details: 'End-to-end encryption, local processing options, and complete data ownership. Your thoughts stay private.',
  },
  {
    icon: Network,
    title: 'Link Your Thinking',
    description: 'Knowledge is visual. Use graphs to make connections instantly.',
    color: 'from-purple-500 to-pink-500',
    details: 'Interactive knowledge graphs reveal hidden connections between your ideas, just like neurons in your brain.',
  },
  {
    icon: Share2,
    title: 'Collaborate Later',
    description: 'Export to Obsidian, Notion, or PDF.',
    color: 'from-orange-500 to-red-500',
    details: 'Seamless integration with your existing tools. Export in multiple formats without losing structure.',
  },
];

export default function UniqueFeatures() {
  const [hoveredIndex, setHoveredIndex] = useState(null);

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
            What Makes <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">NeuroVault</span> Unique?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isHovered = hoveredIndex === index;
            
            return (
              <motion.div
                key={index}
                className="group relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-500 cursor-pointer overflow-hidden"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                {/* Gradient background */}
                <motion.div 
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                  initial={{ scale: 0 }}
                  animate={{ scale: isHovered ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Neural network lines */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-px bg-gradient-to-b from-transparent via-blue-400 to-transparent"
                      style={{
                        left: `${10 + i * 15}%`,
                        top: '0%',
                        height: '100%',
                      }}
                      animate={{
                        opacity: [0, 1, 0],
                        scaleY: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>

                <div className="relative z-10">
                  <motion.div 
                    className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} mb-6`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.8 }}
                  >
                    <Icon size={32} className="text-white" />
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-white/70 leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="border-t border-white/10 pt-4">
                          <p className="text-white/60 text-sm leading-relaxed">
                            {feature.details}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Pulse effect */}
                <motion.div
                  className="absolute inset-0 border border-white/20 rounded-2xl opacity-0"
                  animate={{
                    opacity: isHovered ? [0, 1, 0] : 0,
                    scale: isHovered ? [1, 1.05, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: isHovered ? Infinity : 0,
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}