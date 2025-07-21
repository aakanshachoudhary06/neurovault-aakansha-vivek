import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Shield, Bot, Link, Users } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';

const features = [
  {
    icon: Mic,
    title: 'Turn conversations into memory',
    description: 'Every voice message becomes part of your structured intelligence.',
    gradient: 'from-cyan-400 to-blue-500',
  },
  {
    icon: Shield,
    title: 'Your voice, your vault',
    description: 'Private and encrypted memory—only you access your data.',
    gradient: 'from-green-400 to-emerald-500',
  },
  {
    icon: Bot,
    title: 'Smart agents that listen',
    description: 'Powered by GPT-4o, Claude, and DeepSeek.',
    gradient: 'from-purple-400 to-pink-500',
  },
  {
    icon: Link,
    title: 'Connected voice sources',
    description: 'Zoom, Google Meet, and audio uploads all flow into your brain.',
    gradient: 'from-orange-400 to-red-500',
  },
  {
    icon: Users,
    title: 'Collaborate with context',
    description: 'Share memory, summaries, and graphs with your team.',
    gradient: 'from-indigo-400 to-purple-500',
  },
];

export default function VoiceMemoryEngine() {
  return (
    <section className="relative py-32 px-6 bg-gradient-to-br from-[#081F5C] via-[#0B0E11] to-[#000000] overflow-hidden">
      <AnimatedBackground />
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-20 relative z-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Build your own voice-based
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              memory engine
            </span>
          </h2>
          <p className="text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
            Transform every conversation into structured knowledge that grows with you
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={index}
                className="group relative bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all duration-500"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.02,
                  y: -5,
                }}
              >
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl bg-gradient-to-br ${feature.gradient} blur-xl`} />
                
                <div className="relative z-10">
                  <motion.div 
                    className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.8 }}
                  >
                    <Icon size={28} className="text-white" />
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4 leading-tight">
                    {feature.title}
                  </h3>
                  
                  <p className="text-white/70 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Soft glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{
                    background: `radial-gradient(circle at center, ${feature.gradient.includes('cyan') ? 'rgba(34, 211, 238, 0.1)' : 
                      feature.gradient.includes('green') ? 'rgba(16, 185, 129, 0.1)' :
                      feature.gradient.includes('purple') ? 'rgba(168, 85, 247, 0.1)' :
                      feature.gradient.includes('orange') ? 'rgba(251, 146, 60, 0.1)' :
                      'rgba(99, 102, 241, 0.1)'} 0%, transparent 70%)`,
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