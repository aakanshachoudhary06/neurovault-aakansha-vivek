import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Play, Zap } from 'lucide-react';

export default function PlaygroundDemo() {
  const [isHovered, setIsHovered] = useState(false);

  const scrollToAudio = () => {
    const element = document.getElementById('audio');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="demo" className="relative py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Playground <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Demo</span>
          </h2>
          
          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
            Try uploading a sample audio file and watch the magic happen in real-time
          </p>

          <motion.div
            className="relative inline-block"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <motion.button
              onClick={scrollToAudio}
              className="group relative px-12 py-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-bold text-xl overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10 flex items-center">
                <Play className="mr-3 group-hover:scale-110 transition-transform" size={24} />
                Try Now
                <Zap className="ml-3 group-hover:rotate-12 transition-transform" size={24} />
              </span>
              
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600"
                initial={{ x: '-100%' }}
                animate={{ x: isHovered ? '0%' : '-100%' }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>

            {/* Pulse rings */}
            <motion.div
              className="absolute inset-0 border-2 border-purple-500 rounded-2xl"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
            <motion.div
              className="absolute inset-0 border-2 border-blue-500 rounded-2xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.5,
              }}
            />
          </motion.div>

          {/* Demo preview cards */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Upload, title: 'Upload Audio', desc: 'Drag & drop or record' },
              { icon: Zap, title: 'AI Processing', desc: 'Instant transcription' },
              { icon: Play, title: 'Explore Results', desc: 'Interactive visualization' },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                >
                  <Icon size={32} className="text-blue-400 mb-4 mx-auto" />
                  <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                  <p className="text-white/60 text-sm">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}