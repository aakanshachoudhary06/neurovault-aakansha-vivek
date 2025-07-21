import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Calendar, 
  Clock, 
  RefreshCw,
  X,
  Menu,
  Edit3,
  Upload,
  FileText,
  Image,
  MoreVertical,
  Check,
  Save,
  FolderOpen,
  Star,
  Archive,
  BookOpen,
  Code,
  Play,
  Grid3X3,
  FolderPlus,
  Settings,
  User,
  Brain,
  Sparkles,
  Zap,
  Target,
  Palette,
  Music,
  Video,
  FileAudio,
  FileVideo,
  FileImage,
  FileArchive,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Heart,
  Bookmark,
  Tag,
  Filter,
  Loader2
} from 'lucide-react';
import {
  getChatSessions,
  deleteChatSession,
  generateSessionId,
  updateChatSessionTitle,
  searchChatSessions,
  getChatSessionById
} from '../services/memorySQLite';
import graphService from '../services/graphService';

interface ChatSession {
  session_id: string;
  created: string;
  message_count: number;
  preview: string;
  title?: string;
  is_favorite?: boolean;
  is_archived?: boolean;
  matching_content?: string | null;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  currentSessionId: string | null;
  onToggleSidebar: () => void;
  onFileUpload?: (file: File) => void;
}

export default function ChatSidebar({
  isOpen,
  onClose,
  onSelectSession,
  onNewChat,
  currentSessionId,
  onToggleSidebar,
  onFileUpload
}: ChatSidebarProps) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interactive states
  const [expandedSections, setExpandedSections] = useState({
    quickActions: true,
    fileTypes: false,
    recentChats: true,
    favorites: false,
    archived: false
  });
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sidebarTheme, setSidebarTheme] = useState<'neural' | 'cosmic' | 'quantum'>('neural');
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const [memoryTypeStats, setMemoryTypeStats] = useState<{[key: string]: number}>({});

  const loadChatSessions = async () => {
    setLoading(true);
    try {
      const sessions = searchTerm.trim() 
        ? await searchChatSessions(searchTerm)
        : await getChatSessions();
        
      const formattedSessions = sessions.map((session: any) => ({
        session_id: session[0],
        created: session[1],
        message_count: session[2],
        preview: session[3],
        title: session[4] || `Chat ${session[2]} messages`,
        is_favorite: session[5] || false,
        is_archived: session[6] || false,
        matching_content: session[7] || null // For search results
      }));
      setChatSessions(formattedSessions);
      
      // Calculate memory type statistics
      const stats = {
        'Audio Memories': formattedSessions.filter(s => s.preview.toLowerCase().includes('audio') || s.title.toLowerCase().includes('audio')).length,
        'Video Memories': formattedSessions.filter(s => s.preview.toLowerCase().includes('video') || s.title.toLowerCase().includes('video')).length,
        'Visual Memories': formattedSessions.filter(s => s.preview.toLowerCase().includes('image') || s.preview.toLowerCase().includes('photo') || s.title.toLowerCase().includes('image')).length,
        'Text Memories': formattedSessions.filter(s => !s.preview.toLowerCase().includes('audio') && !s.preview.toLowerCase().includes('video') && !s.preview.toLowerCase().includes('image')).length,
        'Neural Patterns': formattedSessions.filter(s => s.preview.toLowerCase().includes('analysis') || s.preview.toLowerCase().includes('pattern') || s.title.toLowerCase().includes('analysis')).length
      };
      setMemoryTypeStats(stats);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatSessions();
  }, []);

  // Reload sessions when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadChatSessions();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this chat session?\n\nThis will:\n• Remove all messages from this session\n• Delete related entities from the knowledge graph\n• This action cannot be undone')) {
      return;
    }

    setDeletingSessionId(sessionId);
    try {
      // Get session data before deleting for graph cleanup
      const sessionMessages = await getChatSessionById(sessionId);

      // Delete from memory database
      await deleteChatSession(sessionId);
      await loadChatSessions();

      if (currentSessionId === sessionId) {
        onNewChat();
      }

      // Delete related content from knowledge graph
      if (sessionMessages && sessionMessages.length > 0) {
        try {
          // Combine all user messages from the session
          const userMessages = sessionMessages
            .filter((msg: any) => msg[1] === 'user') // msg[1] is role
            .map((msg: any) => msg[2]) // msg[2] is content
            .join(' ');

          if (userMessages.trim()) {
            const result = await graphService.removeContentFromGraph(userMessages, 'local-user-1');
            console.log('✅ Removed chat session content from knowledge graph:', result);
            if (result.nodesDeleted > 0) {
              console.log(`🗑️ Deleted ${result.nodesDeleted} nodes from knowledge graph`);
            }
          }
        } catch (graphError) {
          console.error('❌ Failed to remove chat session from knowledge graph:', graphError);
          // Don't fail the whole operation if graph deletion fails
        }
      }

    } catch (error) {
      console.error('Error deleting chat session:', error);
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    try {
      await updateChatSessionTitle(sessionId, newTitle);
      await loadChatSessions();
      setEditingSessionId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Error renaming chat session:', error);
    }
  };

  const startEditing = (session: ChatSession) => {
    setEditingSessionId(session.session_id);
    setEditingTitle(session.title || '');
  };

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      setUploadingFile(true);
      try {
        await onFileUpload(file);
        setShowUploadMenu(false);
      } catch (error) {
        console.error('Error uploading file:', error);
      } finally {
        setUploadingFile(false);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleQuickAction = async (action: string) => {
    setQuickActionLoading(action);
    try {
      switch (action) {
        case 'memory-analysis':
          // Analyze memory patterns and provide insights
          const analysis = await analyzeMemoryPatterns();
          console.log('Memory Analysis:', analysis);
          break;
        case 'focus-mode':
          // Filter to show only recent and important memories
          setActiveFilters(['recent']);
          break;
        case 'memory-refresh':
          // Refresh and reorganize memories
          await loadChatSessions();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error in ${action}:`, error);
    } finally {
      setQuickActionLoading(null);
    }
  };

  const analyzeMemoryPatterns = async () => {
    // Simulate memory analysis
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      totalMemories: chatSessions.length,
      averageMessages: chatSessions.reduce((acc, session) => acc + session.message_count, 0) / chatSessions.length,
      mostActiveDay: 'Monday',
      memoryGrowth: '+15% this week'
    };
  };

  const filteredSessions = chatSessions.filter(session => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      session.title?.toLowerCase().includes(searchLower) ||
      session.preview.toLowerCase().includes(searchLower) ||
      session.session_id.toLowerCase().includes(searchLower)
    );
    
    if (!matchesSearch) return false;
    
    if (activeFilters.length === 0) return true;
    
    return activeFilters.some(filter => {
      switch (filter) {
        case 'favorites':
          return session.is_favorite;
        case 'archived':
          return session.is_archived;
        case 'recent':
          const date = new Date(session.created);
          const now = new Date();
          const diffDays = Math.ceil((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 7;
        default:
          return true;
      }
    });
  });

  const activeSessions = filteredSessions.filter(s => !s.is_archived);
  const archivedSessions = filteredSessions.filter(s => s.is_archived);
  const favoriteSessions = filteredSessions.filter(s => s.is_favorite);

  const getThemeColors = () => {
    switch (sidebarTheme) {
      case 'cosmic':
        return {
          bg: 'bg-gradient-to-b from-purple-900/95 to-indigo-900/95',
          border: 'border-purple-700/50',
          accent: 'text-purple-300',
          hover: 'hover:bg-purple-800/30'
        };
      case 'quantum':
        return {
          bg: 'bg-gradient-to-b from-cyan-900/95 to-blue-900/95',
          border: 'border-cyan-700/50',
          accent: 'text-cyan-300',
          hover: 'hover:bg-cyan-800/30'
        };
      default: // neural
        return {
          bg: 'bg-gradient-to-b from-gray-900/95 to-black/95',
          border: 'border-gray-700/50',
          accent: 'text-fuchsia-300',
          hover: 'hover:bg-gray-800/30'
        };
    }
  };

  const colors = getThemeColors();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-80 ${colors.bg} backdrop-blur-xl border-r ${colors.border} flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } transition-transform duration-300 ease-in-out`}
        initial={false}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ display: 'flex' }}
      >
        {/* Header with Theme Toggle */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-fuchsia-400" />
              <span className="font-bold text-white">NeuroVault</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSidebarTheme('neural')}
                className={`p-1 rounded ${sidebarTheme === 'neural' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'text-gray-400 hover:text-gray-300'}`}
                title="Neural Theme"
              >
                <Sparkles size={14} />
              </button>
              <button
                onClick={() => setSidebarTheme('cosmic')}
                className={`p-1 rounded ${sidebarTheme === 'cosmic' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-gray-300'}`}
                title="Cosmic Theme"
              >
                <Target size={14} />
              </button>
              <button
                onClick={() => setSidebarTheme('quantum')}
                className={`p-1 rounded ${sidebarTheme === 'quantum' ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:text-gray-300'}`}
                title="Quantum Theme"
              >
                <Zap size={14} />
              </button>
            </div>
          </div>
          
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 hover:to-purple-600 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <Plus size={20} />
            <span>New Memory Chat</span>
          </button>
        </div>

        {/* Search with Filters */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-300"
            >
              <Filter size={14} />
            </button>
          </div>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex flex-wrap gap-2">
                  {['favorites', 'recent', 'archived'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => toggleFilter(filter)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        activeFilters.includes(filter)
                          ? 'bg-fuchsia-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Actions Section */}
        <div className="p-4 border-b border-gray-700/50">
          <button
            onClick={() => toggleSection('quickActions')}
            className="w-full flex items-center justify-between text-gray-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              <span className="font-medium">Quick Actions</span>
            </div>
            {expandedSections.quickActions ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          
          <AnimatePresence>
            {expandedSections.quickActions && (
                             <motion.div
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 exit={{ opacity: 0, height: 0 }}
                 className="mt-3 space-y-2"
               >
                 <button 
                   onClick={() => handleQuickAction('memory-analysis')}
                   disabled={quickActionLoading === 'memory-analysis'}
                   className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
                 >
                   {quickActionLoading === 'memory-analysis' ? (
                     <Loader2 size={16} className="animate-spin" />
                   ) : (
                     <Brain size={16} />
                   )}
                   <span>Memory Analysis</span>
                 </button>
                 <button 
                   onClick={() => handleQuickAction('focus-mode')}
                   disabled={quickActionLoading === 'focus-mode'}
                   className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
                 >
                   {quickActionLoading === 'focus-mode' ? (
                     <Loader2 size={16} className="animate-spin" />
                   ) : (
                     <Target size={16} />
                   )}
                   <span>Focus Mode</span>
                 </button>
                 <button 
                   onClick={() => handleQuickAction('memory-refresh')}
                   disabled={quickActionLoading === 'memory-refresh'}
                   className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
                 >
                   {quickActionLoading === 'memory-refresh' ? (
                     <Loader2 size={16} className="animate-spin" />
                   ) : (
                     <RotateCcw size={16} />
                   )}
                   <span>Memory Refresh</span>
                 </button>
               </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* File Types Section */}
        <div className="p-4 border-b border-gray-700/50">
          <button
            onClick={() => toggleSection('fileTypes')}
            className="w-full flex items-center justify-between text-gray-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileArchive size={16} className="text-blue-400" />
              <span className="font-medium">Memory Types</span>
            </div>
            {expandedSections.fileTypes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          
          <AnimatePresence>
            {expandedSections.fileTypes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2"
              >
                                 {[
                   { icon: FileAudio, label: 'Audio Memories', color: 'text-green-400' },
                   { icon: FileVideo, label: 'Video Memories', color: 'text-red-400' },
                   { icon: FileImage, label: 'Visual Memories', color: 'text-purple-400' },
                   { icon: FileText, label: 'Text Memories', color: 'text-blue-400' },
                   { icon: Brain, label: 'Neural Patterns', color: 'text-fuchsia-400' }
                 ].map(({ icon: Icon, label, color }) => (
                   <button
                     key={label}
                     onClick={() => setSelectedFileType(selectedFileType === label ? null : label)}
                     className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                       selectedFileType === label
                         ? 'bg-gray-700/50 text-white'
                         : 'text-gray-300 hover:bg-gray-700/30'
                     }`}
                   >
                     <div className="flex items-center gap-3">
                       <Icon size={16} className={color} />
                       <span>{label}</span>
                     </div>
                     <span className="text-xs bg-gray-600/50 px-2 py-1 rounded-full">
                       {memoryTypeStats[label] || 0}
                     </span>
                   </button>
                 ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto">
          {/* Favorites Section */}
          {favoriteSessions.length > 0 && (
            <div className="p-4 border-b border-gray-700/50">
              <button
                onClick={() => toggleSection('favorites')}
                className="w-full flex items-center justify-between text-gray-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Heart size={16} className="text-red-400" />
                  <span className="font-medium">Favorites ({favoriteSessions.length})</span>
                </div>
                {expandedSections.favorites ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              <AnimatePresence>
                {expandedSections.favorites && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-1"
                  >
                    {favoriteSessions.map((session) => (
                      <ChatSessionItem
                        key={session.session_id}
                        session={session}
                        isCurrent={currentSessionId === session.session_id}
                        isEditing={editingSessionId === session.session_id}
                        editingTitle={editingTitle}
                        onSelect={() => onSelectSession(session.session_id)}
                        onDelete={() => handleDeleteSession(session.session_id)}
                        onRename={(title) => handleRenameSession(session.session_id, title)}
                        onStartEdit={() => startEditing(session)}
                        onCancelEdit={() => {
                          setEditingSessionId(null);
                          setEditingTitle('');
                        }}
                        onTitleChange={setEditingTitle}
                        isDeleting={deletingSessionId === session.session_id}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        truncateText={truncateText}
                        theme={sidebarTheme}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Recent Chats Section */}
          <div className="p-4">
            <button
              onClick={() => toggleSection('recentChats')}
              className="w-full flex items-center justify-between text-gray-300 hover:text-white transition-colors mb-3"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-fuchsia-400" />
                <span className="font-medium">Recent Memories ({activeSessions.length})</span>
              </div>
              {expandedSections.recentChats ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            <AnimatePresence>
              {expandedSections.recentChats && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fuchsia-500"></div>
                    </div>
                  ) : activeSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No memories yet
                    </div>
                  ) : (
                    activeSessions.map((session) => (
                      <ChatSessionItem
                        key={session.session_id}
                        session={session}
                        isCurrent={currentSessionId === session.session_id}
                        isEditing={editingSessionId === session.session_id}
                        editingTitle={editingTitle}
                        onSelect={() => onSelectSession(session.session_id)}
                        onDelete={() => handleDeleteSession(session.session_id)}
                        onRename={(title) => handleRenameSession(session.session_id, title)}
                        onStartEdit={() => startEditing(session)}
                        onCancelEdit={() => {
                          setEditingSessionId(null);
                          setEditingTitle('');
                        }}
                        onTitleChange={setEditingTitle}
                        isDeleting={deletingSessionId === session.session_id}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        truncateText={truncateText}
                        theme={sidebarTheme}
                      />
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Archived Section */}
          {archivedSessions.length > 0 && (
            <div className="p-4 border-t border-gray-700/50">
              <button
                onClick={() => toggleSection('archived')}
                className="w-full flex items-center justify-between text-gray-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Archive size={16} className="text-gray-400" />
                  <span className="font-medium">Archived ({archivedSessions.length})</span>
                </div>
                {expandedSections.archived ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              <AnimatePresence>
                {expandedSections.archived && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-1"
                  >
                    {archivedSessions.map((session) => (
                      <ChatSessionItem
                        key={session.session_id}
                        session={session}
                        isCurrent={currentSessionId === session.session_id}
                        isEditing={editingSessionId === session.session_id}
                        editingTitle={editingTitle}
                        onSelect={() => onSelectSession(session.session_id)}
                        onDelete={() => handleDeleteSession(session.session_id)}
                        onRename={(title) => handleRenameSession(session.session_id, title)}
                        onStartEdit={() => startEditing(session)}
                        onCancelEdit={() => {
                          setEditingSessionId(null);
                          setEditingTitle('');
                        }}
                        onTitleChange={setEditingTitle}
                        isDeleting={deletingSessionId === session.session_id}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        truncateText={truncateText}
                        theme={sidebarTheme}
                        isArchived={true}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Memory Stats Section */}
        <div className="p-4 border-t border-gray-700/50">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Total Memories</span>
              <span className="text-fuchsia-400 font-medium">{chatSessions.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Favorites</span>
              <span className="text-red-400 font-medium">{favoriteSessions.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Archived</span>
              <span className="text-gray-400 font-medium">{archivedSessions.length}</span>
            </div>
            <div className="pt-2 border-t border-gray-700/30">
              <button 
                onClick={loadChatSessions}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-gray-300 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span className="text-sm">Refresh Memories</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// Chat Session Item Component
interface ChatSessionItemProps {
  session: ChatSession;
  isCurrent: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onTitleChange: (title: string) => void;
  isDeleting: boolean;
  formatDate: (date: string) => string;
  formatTime: (date: string) => string;
  truncateText: (text: string, maxLength?: number) => string;
  theme: 'neural' | 'cosmic' | 'quantum';
  isArchived?: boolean;
}

function ChatSessionItem({
  session,
  isCurrent,
  isEditing,
  editingTitle,
  onSelect,
  onDelete,
  onRename,
  onStartEdit,
  onCancelEdit,
  onTitleChange,
  isDeleting,
  formatDate,
  formatTime,
  truncateText,
  theme,
  isArchived = false
}: ChatSessionItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleSave = () => {
    if (editingTitle.trim()) {
      onRename(editingTitle.trim());
    } else {
      onCancelEdit();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  const getThemeColors = () => {
    switch (theme) {
      case 'cosmic':
        return {
          bg: 'bg-purple-800/30',
          text: 'text-purple-300',
          hover: 'hover:bg-purple-800/50'
        };
      case 'quantum':
        return {
          bg: 'bg-cyan-800/30',
          text: 'text-cyan-300',
          hover: 'hover:bg-cyan-800/50'
        };
      default: // neural
        return {
          bg: 'bg-gray-800/30',
          text: 'text-fuchsia-300',
          hover: 'hover:bg-gray-800/50'
        };
    }
  };

  const colors = getThemeColors();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`group px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
        isCurrent
          ? `${colors.bg} border border-fuchsia-500/30`
          : `${colors.hover} border border-transparent`
      } ${isArchived ? 'opacity-60' : ''}`}
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 bg-gray-800/80 border border-gray-600 rounded px-2 py-1 text-gray-300 text-sm focus:outline-none focus:border-fuchsia-500"
                autoFocus
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                className="p-1 hover:bg-green-600/20 rounded text-green-400"
              >
                <Check size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelEdit();
                }}
                className="p-1 hover:bg-red-600/20 rounded text-red-400"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-fuchsia-400' : 'bg-gray-500'}`}></div>
              <h4 className={`font-medium text-sm truncate ${isCurrent ? colors.text : 'text-gray-300'}`}>
                {session.title || `Memory ${session.message_count} items`}
              </h4>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            className="p-1 hover:bg-gray-600/50 rounded text-gray-400 hover:text-gray-300 transition-colors"
            title="Rename memory"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            className="p-1 hover:bg-red-600/20 rounded text-gray-400 hover:text-red-400 disabled:opacity-50 transition-colors"
            title="Delete memory"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      
      {!isEditing && (
        <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {formatDate(session.created)}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={10} />
            {session.message_count}
          </span>
        </div>
      )}
      
      {/* Show search results with highlighted content */}
      {session.matching_content && (
        <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs text-gray-300 border-l-2 border-fuchsia-500/50">
          <div className="font-medium text-fuchsia-400 mb-1">Found in conversation:</div>
          <div className="line-clamp-2">
            {session.matching_content.split(' | ').slice(0, 2).map((content, index) => (
              <div key={index} className="mb-1">
                {truncateText(content, 80)}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
} 