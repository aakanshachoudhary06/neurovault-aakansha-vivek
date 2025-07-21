import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, MessageSquare, Mic, FileText, Network, Archive } from 'lucide-react';
import { Link } from 'react-router-dom';

const BrainIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 20} height={props.size || 20} fill="none" viewBox="0 0 24 24" {...props}>
    <path fill="currentColor" d="M8.5 2A3.5 3.5 0 0 0 5 5.5V6a3.5 3.5 0 0 0-3 3.5c0 .6.16 1.16.43 1.65A3.5 3.5 0 0 0 2 15.5C2 17.43 3.57 19 5.5 19H6v.5A2.5 2.5 0 0 0 8.5 22c.41 0 .8-.1 1.14-.28A2.5 2.5 0 0 0 12.5 22c.41 0 .8-.1 1.14-.28A2.5 2.5 0 0 0 16.5 22c1.38 0 2.5-1.12 2.5-2.5V19h.5A3.5 3.5 0 0 0 22 15.5c0-1.02-.41-1.94-1.07-2.6.07-.29.07-.61.07-.9a3.5 3.5 0 0 0-3-3.45V5.5A3.5 3.5 0 0 0 15.5 2c-.41 0-.8.1-1.14.28A2.5 2.5 0 0 0 11.5 2c-.41 0-.8.1-1.14.28A2.5 2.5 0 0 0 8.5 2Z"/>
  </svg>
);

const navItems = [
  { id: 'home', icon: Home, label: 'Home', section: 'hero' },
  { id: 'chat', icon: MessageSquare, label: 'Chat', section: 'chat' },
  { id: 'audio', icon: Mic, label: 'Audio', section: 'audio' },
  { id: 'summary', icon: FileText, label: 'Summary', section: 'summary' },
  { id: 'graph', icon: Network, label: 'Graph', section: 'graph' },
  { id: 'memory', icon: BrainIcon, label: 'Memory', section: 'memory' },
];

// SVGs for product icons
const ChromeIcon = (props) => (
  <svg width={20} height={20} viewBox="0 0 48 48" {...props}><circle cx="24" cy="24" r="20" fill="#fff"/><path fill="#EA4335" d="M24 4a20 20 0 0 1 17.32 10H24v8h20c0 3.31-.8 6.42-2.22 9.13L24 24V4z"/><path fill="#34A853" d="M24 44a20 20 0 0 1-17.32-10l17.32-10v8H4c0 3.31.8 6.42 2.22 9.13L24 44z"/><path fill="#4285F4" d="M44 24c0-11.05-8.95-20-20-20v20h20z"/><circle cx="24" cy="24" r="8" fill="#fff"/></svg>
);
const EdgeIcon = (props) => (
  <svg width={20} height={20} viewBox="0 0 48 48" {...props}><circle cx="24" cy="24" r="20" fill="#fff"/><path fill="#0078D4" d="M24 4a20 20 0 1 1 0 40V4z"/><path fill="#41BDF6" d="M24 44a20 20 0 0 1 0-40v40z"/></svg>
);
const SafariIcon = (props) => (
  <svg width={20} height={20} viewBox="0 0 48 48" {...props}><circle cx="24" cy="24" r="20" fill="#fff"/><path fill="#1B9AF7" d="M24 4a20 20 0 1 1 0 40V4z"/><path fill="#F44336" d="M24 44a20 20 0 0 1 0-40v40z"/></svg>
);
const MacIcon = (props) => (
  <svg width={20} height={20} viewBox="0 0 48 48" {...props}><rect x="8" y="12" width="32" height="24" rx="4" fill="#fff"/><rect x="12" y="16" width="24" height="16" rx="2" fill="#222"/><rect x="20" y="36" width="8" height="2" rx="1" fill="#888"/></svg>
);
const WindowsIcon = (props) => (
  <svg width={20} height={20} viewBox="0 0 48 48" {...props}><rect x="4" y="8" width="40" height="32" fill="#fff"/><rect x="8" y="12" width="32" height="24" fill="#00ADEF"/><rect x="24" y="12" width="2" height="24" fill="#fff"/><rect x="8" y="24" width="32" height="2" fill="#fff"/></svg>
);
const IOSIcon = (props) => (
  <svg width={20} height={20} viewBox="0 0 48 48" {...props}><rect x="14" y="8" width="20" height="32" rx="4" fill="#fff"/><rect x="18" y="12" width="12" height="24" rx="2" fill="#222"/><circle cx="24" cy="36" r="1" fill="#888"/></svg>
);
const AndroidIcon = (props) => (
  <svg width={20} height={20} viewBox="0 0 48 48" {...props}><rect x="12" y="14" width="24" height="20" rx="4" fill="#A4C639"/><rect x="16" y="18" width="16" height="12" rx="2" fill="#fff"/><circle cx="18" cy="34" r="2" fill="#A4C639"/><circle cx="30" cy="34" r="2" fill="#A4C639"/></svg>
);

function ProductItem({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-fuchsia-600/20 text-white transition-colors w-full"
      type="button"
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default function Navigation() {
  const [activeSection, setActiveSection] = useState('home');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [comingSoon, setComingSoon] = useState('');

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
    setIsExpanded(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = navItems.map(item => item.section);
      const currentSection = sections.find(section => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      
      if (currentSection) {
        setActiveSection(currentSection);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 1 }}
    >
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-full px-6 py-4">
        <div className="flex items-center space-x-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeSection === item.section;
            if (item.id === 'memory') {
              return (
                <Link
                  key={item.id}
                  to="/memory"
                  className={`relative p-3 rounded-full transition-all duration-300 group ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={20} />
                  {/* Tooltip */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                    {item.label}
                  </div>
                </Link>
              );
            }
            return (
              <motion.button
                key={item.id}
                onClick={() => scrollToSection(item.section)}
                className={`relative p-3 rounded-full transition-all duration-300 group ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ rotateY: isActive ? 360 : 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <Icon size={20} />
                </motion.div>
                {isActive && (
                  <motion.div
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"
                    layoutId="activeIndicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
                {/* Tooltip */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  {item.label}
                </div>
              </motion.button>
            );
          })}
          {/* Products Button */}
          <motion.button
            key="products"
            onMouseEnter={() => setShowProducts(true)}
            onMouseLeave={() => setShowProducts(false)}
            className="relative p-3 rounded-full transition-all duration-300 group text-white/60 hover:text-white hover:bg-white/10"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Archive size={20} />
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              Products
            </div>
            {/* Products Popup */}
            <AnimatePresence>
              {showProducts && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-1/2 -translate-x-1/2 top-14 z-50 bg-[#151A2B] border border-white/10 rounded-2xl shadow-xl p-6 flex flex-col gap-4 min-w-[320px]"
                  onMouseEnter={() => setShowProducts(true)}
                  onMouseLeave={() => setShowProducts(false)}
                >
                  <div className="font-bold text-lg text-white mb-2">Products</div>
                  <div className="grid grid-cols-2 gap-4">
                    <ProductItem icon={<ChromeIcon />} label="Chrome Extension" onClick={() => setComingSoon('Chrome Extension')} />
                    <ProductItem icon={<EdgeIcon />} label="Edge Extension" onClick={() => setComingSoon('Edge Extension')} />
                    <ProductItem icon={<SafariIcon />} label="Safari Extension" onClick={() => setComingSoon('Safari Extension')} />
                    <ProductItem icon={<MacIcon />} label="Mac OS App" onClick={() => setComingSoon('Mac OS App')} />
                    <ProductItem icon={<WindowsIcon />} label="Windows App" onClick={() => setComingSoon('Windows App')} />
                    <ProductItem icon={<IOSIcon />} label="iOS App" onClick={() => setComingSoon('iOS App')} />
                    <ProductItem icon={<AndroidIcon />} label="Android App" onClick={() => setComingSoon('Android App')} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
      {/* Coming Soon Modal */}
      <AnimatePresence>
        {comingSoon && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setComingSoon('')}
          >
            <div className="bg-[#22253A] text-white rounded-2xl shadow-xl px-8 py-6 text-center">
              <div className="text-xl font-bold mb-2">{comingSoon}</div>
              <div className="text-lg">Coming soon!</div>
              <button
                className="mt-4 px-4 py-2 bg-fuchsia-600 rounded-lg text-white font-semibold"
                onClick={() => setComingSoon('')}
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}