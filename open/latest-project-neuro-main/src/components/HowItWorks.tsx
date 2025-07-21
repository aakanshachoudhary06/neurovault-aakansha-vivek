import React from 'react';
import { motion } from 'framer-motion';
import { Mic, FileText, Sparkles, Network } from 'lucide-react';

const steps = [
  {
    icon: Mic,
    title: 'Capture',
    description: 'Record meetings, calls, or upload audio files',
    color: '#22D3EE',
  },
  {
    icon: FileText,
    title: 'Transcribe',
    description: 'AI converts speech to structured text with context',
    color: '#10B981',
  },
  {
    icon: Sparkles,
    title: 'Summarize',
    description: 'Extract key insights, action items, and decisions',
    color: '#A855F7',
  },
  {
    icon: Network,
    title: 'Visualize',
    description: 'Connect ideas in an interactive knowledge graph',
    color: '#F59E0B',
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-32 px-6 bg-gradient-to-br from-[#0B0E11] via-[#081F5C] to-[#0B0E11]">
      {/* Subtle node pattern background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #22D3EE 2px, transparent 2px),
                           radial-gradient(circle at 75% 75%, #A855F7 2px, transparent 2px)`,
          backgroundSize: '100px 100px',
        }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            How It Works
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Four simple steps to transform audio into actionable intelligence
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-y-1/2 hidden lg:block" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              
              return (
                <motion.div
                  key={index}
                  className="relative text-center"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  {/* Step number */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>

                  <motion.div
                    className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all duration-500"
                    whileHover={{ scale: 1.05, y: -10 }}
                  >
                    {/* Icon with glow */}
                    <motion.div
                      className="relative mb-6"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.8 }}
                    >
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                        style={{ 
                          background: `linear-gradient(135deg, ${step.color}20, ${step.color}40)`,
                          boxShadow: `0 0 30px ${step.color}30`
                        }}
                      >
                        <Icon size={32} style={{ color: step.color }} />
                      </div>
                    </motion.div>

                    <h3 className="text-2xl font-bold text-white mb-4">
                      {step.title}
                    </h3>
                    
                    <p className="text-white/70 leading-relaxed">
                      {step.description}
                    </p>
                  </motion.div>

                  {/* Connection arrow for mobile */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center mt-8 lg:hidden">
                      <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}