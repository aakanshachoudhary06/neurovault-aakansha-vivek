import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, FileText, Network } from 'lucide-react';

const navItems = [
  { id: 'audio', label: 'Audio', icon: Mic },
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'graph', label: 'Graph', icon: Network },
];

export default function PremiumNavigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <motion.div
        className="flex items-center justify-center space-x-8 px-8 py-4 rounded-full transition-all duration-500"
        animate={{
          backgroundColor: isScrolled ? 'rgba(5, 5, 8, 0.8)' : 'rgba(5, 5, 8, 0.2)',
          backdropFilter: isScrolled ? 'blur(20px)' : 'blur(5px)',
          border: isScrolled ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.05)',
          scale: isScrolled ? 0.95 : 1,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-300 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Icon size={18} className="group-hover:text-cyan-400 transition-colors duration-300" />
              <span className="font-medium text-sm tracking-wide">{item.label}</span>
            </motion.button>
          );
        })}
        
        {/* Logo in center */}
        <motion.div
          className="absolute left-1/2 transform -translate-x-1/2 text-white font-bold text-lg tracking-tight"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          NeuroVault
        </motion.div>
      </motion.div>
    </motion.nav>
  );
}