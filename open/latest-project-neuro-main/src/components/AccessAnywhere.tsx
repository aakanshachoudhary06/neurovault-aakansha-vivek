import React from 'react';
import { motion } from 'framer-motion';
import { Chrome, Smartphone, Monitor, Tablet } from 'lucide-react';

const platforms = [
  { icon: Chrome, name: 'Chrome', color: '#4285F4' },
  { icon: Chrome, name: 'Edge', color: '#0078D4' },
  { icon: Chrome, name: 'Safari', color: '#006CFF' },
  { icon: Monitor, name: 'Windows', color: '#0078D4' },
  { icon: Monitor, name: 'MacOS', color: '#007AFF' },
  { icon: Smartphone, name: 'iOS', color: '#007AFF' },
  { icon: Tablet, name: 'Android', color: '#34A853' },
];

export default function AccessAnywhere() {
  return (
    <section className="relative py-32 px-6 bg-gradient-to-br from-[#0B0E11] via-[#1a1a2e] to-[#0B0E11]">
      {/* Soft glow behind headline */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
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
            One Vault, All Devices
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Access your memory from anywhere, on any device
          </p>
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center items-center gap-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {platforms.map((platform, index) => {
            const Icon = platform.icon;
            
            return (
              <motion.div
                key={index}
                className="flex flex-col items-center space-y-4 group"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.1 }}
              >
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:shadow-lg"
                  style={{ 
                    backgroundColor: `${platform.color}20`,
                    border: `1px solid ${platform.color}30`,
                    boxShadow: `0 0 20px ${platform.color}20`
                  }}
                >
                  <Icon 
                    size={32} 
                    style={{ color: platform.color }}
                  />
                </div>
                <span className="text-white/70 font-medium text-sm group-hover:text-white transition-colors duration-300">
                  {platform.name}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <p className="text-white/50 text-lg">
            Seamless sync across all your devices
          </p>
        </motion.div>
      </div>
    </section>
  );
}