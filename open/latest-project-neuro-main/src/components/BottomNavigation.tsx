import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, MessageSquare, Mic, FileText, Network, X } from 'lucide-react';

const BrainIcon = (props: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" d="M8.5 2A3.5 3.5 0 0 0 5 5.5V6a3.5 3.5 0 0 0-3 3.5c0 .6.16 1.16.43 1.65A3.5 3.5 0 0 0 2 15.5C2 17.43 3.57 19 5.5 19H6v.5A2.5 2.5 0 0 0 8.5 22c.41 0 .8-.1 1.14-.28A2.5 2.5 0 0 0 12.5 22c.41 0 .8-.1 1.14-.28A2.5 2.5 0 0 0 16.5 22c1.38 0 2.5-1.12 2.5-2.5V19h.5A3.5 3.5 0 0 0 22 15.5c0-1.02-.41-1.94-1.07-2.6.07-.29.07-.61.07-.9a3.5 3.5 0 0 0-3-3.45V5.5A3.5 3.5 0 0 0 15.5 2c-.41 0-.8.1-1.14.28A2.5 2.5 0 0 0 11.5 2c-.41 0-.8.1-1.14.28A2.5 2.5 0 0 0 8.5 2Z"/>
  </svg>
);

const navItems = [
  { 
    id: 'home', 
    icon: Home, 
    label: 'Home', 
    path: '/',
    description: 'Return to the main dashboard and overview of your AI-powered workspace.'
  },
  { 
    id: 'chat', 
    icon: MessageSquare, 
    label: 'Chat', 
    path: '/chat',
    description: 'Engage in intelligent conversations with our AI assistant for real-time help.'
  },
  { 
    id: 'audio', 
    icon: Mic, 
    label: 'Audio', 
    path: '/audio',
    description: 'Convert speech to text and analyze audio content with advanced AI processing.'
  },
  { 
    id: 'summary', 
    icon: FileText, 
    label: 'Summary', 
    path: '/summary',
    description: 'Generate intelligent summaries of your documents and content automatically.'
  },
  { 
    id: 'graph', 
    icon: Network, 
    label: 'Graph', 
    path: '/graph',
    description: 'Explore knowledge graphs and visualize connections in your data.'
  },
  {
    id: 'memory',
    icon: BrainIcon,
    label: 'Memory',
    path: '/memory',
    description: 'View and manage your private memory vault: audio, summaries, and chat history.'
  },
];

const DOCK_ICON_SIZE = 44;
const DOCK_ICON_SIZE_EXPANDED = 80;
const DOCK_PADDING = 24;
const DOCK_MAX_WIDTH = 600;

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pointerX, setPointerX] = useState<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track mouse position for dock effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    setPointerX(e.clientX - rect.left);
  };
  const handleMouseLeaveDock = () => {
    setPointerX(null);
    setExpandedItem(null);
    setIsExpanded(false);
  };

  // Expanded popover logic
  const closeExpanded = useCallback(() => {
    setExpandedItem(null);
    setIsExpanded(false);
  }, []);

  // Keyboard/Outside click accessibility
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeExpanded();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeExpanded]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) closeExpanded();
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded, closeExpanded]);
  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  // Responsive dock width
  const [dockWidth, setDockWidth] = useState(DOCK_MAX_WIDTH);
  useEffect(() => {
    const updateWidth = () => {
      setDockWidth(Math.min(window.innerWidth - DOCK_PADDING * 2, DOCK_MAX_WIDTH));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate icon scale based on pointer proximity (macOS dock effect)
  const getIconScale = (index: number) => {
    if (pointerX == null) return 1;
    if (!navRef.current) return 1;
    const iconCount = navItems.length;
    const iconSpacing = dockWidth / iconCount;
    const iconCenter = iconSpacing * (index + 0.5);
    const dist = Math.abs(pointerX - iconCenter);
    if (dist < 40) return 1.8;
    if (dist < 80) return 1.3;
    if (dist < 120) return 1.12;
    return 1;
  };
  const getIconYOffset = (index: number) => {
    if (pointerX == null) return 0;
    if (!navRef.current) return 0;
    const iconCount = navItems.length;
    const iconSpacing = dockWidth / iconCount;
    const iconCenter = iconSpacing * (index + 0.5);
    const dist = Math.abs(pointerX - iconCenter);
    if (dist < 40) return -18;
    if (dist < 80) return -10;
    if (dist < 120) return -4;
    return 0;
  };

  // Find the hovered icon for popover (popover only shows on hover/focus)
  const popoverIndex = expandedItem
    ? navItems.findIndex((item) => item.id === expandedItem)
    : -1;
  const popoverItem =
    popoverIndex !== -1 ? navItems[popoverIndex] : null;
  const popoverCenter =
    popoverIndex !== -1 && navRef.current
      ? (dockWidth / navItems.length) * (popoverIndex + 0.5)
      : null;

  return (
    <motion.nav
      className="fixed left-0 right-0 bottom-0 z-50 flex justify-center items-end pointer-events-none"
      style={{ width: '100vw', minHeight: 120 }}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 1 }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div
        ref={navRef}
        className="relative flex justify-center items-end pointer-events-auto"
        style={{
          width: dockWidth,
          maxWidth: '100vw',
          padding: 0,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeaveDock}
      >
        {/* macOS-style Dock */}
        <div
          className="bg-white/98 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl shadow-black/10 flex justify-between items-end px-2 py-3 w-full"
          style={{ minHeight: 80 }}
        >
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const scale = getIconScale(i);
            const y = getIconYOffset(i);
            const isHovered = pointerX != null && scale > 1.01;
            return (
              <motion.button
                key={item.id}
                onClick={() => navigate(item.path)}
                onMouseEnter={() => {
                  setExpandedItem(item.id);
                  setIsExpanded(true);
                }}
                onFocus={() => {
                  setExpandedItem(item.id);
                  setIsExpanded(true);
                }}
                onMouseLeave={() => {
                  setExpandedItem(null);
                  setIsExpanded(false);
                }}
                className={`relative flex flex-col items-center justify-end mx-1 group focus:outline-none ${
                  isActive ? 'z-20' : ''
                }`}
                style={{
                  width: DOCK_ICON_SIZE_EXPANDED,
                  height: DOCK_ICON_SIZE_EXPANDED,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                role="menuitem"
                aria-haspopup={item.description ? 'true' : 'false'}
                aria-expanded={expandedItem === item.id}
                tabIndex={0}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{
                    scale,
                    y,
                    boxShadow: isActive
                      ? '0 0 24px 8px rgba(0,122,255,0.25), 0 2px 16px 0 rgba(0,0,0,0.10)'
                      : isHovered
                      ? '0 2px 16px 0 rgba(0,0,0,0.10)'
                      : 'none',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                  className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-600'
                      : isHovered
                      ? 'bg-blue-400/10 text-blue-700'
                      : 'text-gray-600 hover:text-blue-700'
                  }`}
                  style={{
                    width: DOCK_ICON_SIZE,
                    height: DOCK_ICON_SIZE,
                    fontSize: scale > 1.5 ? 32 : 22,
                    position: 'relative',
                  }}
                >
                  <Icon size={scale > 1.5 ? 38 : scale > 1.2 ? 30 : 22} />
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        boxShadow:
                          '0 0 0 6px rgba(0,122,255,0.10), 0 0 24px 8px rgba(0,122,255,0.25)',
                        zIndex: 1,
                      }}
                      layoutId="activeGlow"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.div>
                {/* Label below icon, only show if hovered or active */}
                <motion.div
                  initial={false}
                  animate={{
                    opacity: isHovered || isActive ? 1 : 0.5,
                    y: isHovered || isActive ? 0 : 8,
                    color: isHovered || isActive ? '#0A0C10' : '#888',
                    fontWeight: isHovered || isActive ? 700 : 500,
                    fontSize: isHovered || isActive ? 18 : 14,
                    textShadow: isHovered || isActive
                      ? '0 2px 12px rgba(0,0,0,0.10), 0 0 8px #fff'
                      : 'none',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="mt-2 select-none"
                  style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {item.label}
                </motion.div>
              </motion.button>
            );
          })}
        </div>

        {/* Popover above hovered/active icon */}
        <AnimatePresence>
          {popoverItem && isExpanded && (
            <motion.div
              key={popoverItem.id}
              className="absolute z-50"
              style={{
                left: popoverCenter ? popoverCenter : '50%',
                bottom: 100,
                transform: 'translateX(-50%)',
                pointerEvents: 'auto',
              }}
              initial={{ opacity: 0, y: 10, scale: 0.98, filter: 'blur(2px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 10, scale: 0.98, filter: 'blur(2px)' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              role="dialog"
              aria-label={`${popoverItem.label} details`}
              aria-modal="true"
            >
              <div className="relative bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl shadow-black/10 px-6 py-6 max-w-md w-[340px] text-center flex flex-col items-center"
                style={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 20,
                  textShadow: 'none',
                  boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18)',
                }}
              >
                {/* Close Button */}
                <button
                  className="absolute top-4 right-4 w-8 h-8 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200"
                  onClick={() => {
                    setExpandedItem(null);
                    setIsExpanded(false);
                  }}
                  aria-label="Close navigation menu"
                  tabIndex={0}
                >
                  <X size={16} />
                </button>
                <div className="mb-2 text-2xl font-bold" style={{ color: '#fff', textShadow: 'none' }}>{popoverItem.label}</div>
                <div className="text-base font-medium mb-6" style={{ color: '#fff', textShadow: 'none' }}>{popoverItem.description}</div>
                <div className="flex flex-col gap-3 w-full mt-2">
                  <button
                    onClick={() => {
                      navigate(popoverItem.path);
                      setExpandedItem(null);
                      setIsExpanded(false);
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow"
                    tabIndex={0}
                  >
                    Open {popoverItem.label}
                  </button>
                  <button
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow"
                    tabIndex={0}
                  >
                    Learn More
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}