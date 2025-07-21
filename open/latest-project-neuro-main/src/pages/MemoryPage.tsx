import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, FileText, MessageSquare, Play, Trash2, Calendar, Clock, RefreshCw, Eye, Network, Database, Edit3, Check, X } from 'lucide-react';
import { 
  getAudioFiles, 
  saveAudioFile, 
  deleteAudioFile, 
  getAudioFileById,
  getSummaries,
  deleteSummary,
  getChatSessions,
  deleteChatSession,
  getChatSessionById,
  updateChatSessionTitle
} from '../services/memorySQLite';
import graphService from '../services/graphService';

const sectionCard =
  'flex-1 bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 m-2 min-h-[340px] flex flex-col';

interface AudioFile {
  id: number;
  name: string;
  transcript: string;
  created: string;
}

interface Summary {
  id: number;
  text: string;
  created: string;
}

interface ChatSession {
  session_id: string;
  created: string;
  message_count: number;
  preview: string;
}

export default function MemoryPage() {
  const [conversations, setConversations] = useState<AudioFile[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingSummaryId, setDeletingSummaryId] = useState<number | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [selectedChatSession, setSelectedChatSession] = useState<any[] | null>(null);
  const [generatingGraph, setGeneratingGraph] = useState<number | null>(null);
  const [importingToKG, setImportingToKG] = useState<number | null>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<AudioFile | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState<string>('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      await Promise.all([
        loadConversations(),
        loadSummaries(),
        loadChatSessions()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadConversations = async () => {
    try {
      const audioFiles = await getAudioFiles();
      // Convert the raw data to proper format
      const formattedConversations = audioFiles.map((file: any) => ({
        id: file[0],
        name: file[1],
        transcript: file[3],
        created: file[4]
      }));
      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadSummaries = async () => {
    try {
      const summariesData = await getSummaries();
      const formattedSummaries = summariesData.map((summary: any) => {
        console.log('Summary loaded:', summary);
        return {
          id: summary[0],
          text: summary[1],
          created: (summary[2] && !isNaN(Date.parse(summary[2]))) ? summary[2] : null, // Use summary[2] for created
          title: summary[5] || 'Untitled Summary'
        };
      });
      setSummaries(formattedSummaries);
    } catch (error) {
      console.error('Error loading summaries:', error);
    }
  };

  const loadChatSessions = async () => {
    try {
      const chatSessionsData = await getChatSessions();
      const formattedChatSessions = chatSessionsData.map((session: any) => ({
        session_id: session[0],
        created: session[1],
        message_count: session[2],
        preview: session[3],
        title: session[4],
        is_favorite: session[5],
        is_archived: session[6],
      }));
      setChatSessions(formattedChatSessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleDeleteConversation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this conversation?\n\nThis will:\n• Remove the conversation from your memory\n• Delete related entities from the knowledge graph\n• This action cannot be undone')) return;

    setDeletingId(id);
    try {
      // Get the conversation data before deleting
      const conversation = conversations.find(conv => conv.id === id);

      // Delete from memory database
      await deleteAudioFile(id);
      setConversations(prev => prev.filter(conv => conv.id !== id));

      // Delete related nodes from knowledge graph
      if (conversation?.transcript) {
        try {
          const result = await graphService.removeContentFromGraph(conversation.transcript, 'local-user-1');
          console.log('✅ Removed conversation content from knowledge graph:', result);
          if (result.nodesDeleted > 0) {
            console.log(`🗑️ Deleted ${result.nodesDeleted} nodes from knowledge graph`);
          }
        } catch (graphError) {
          console.error('❌ Failed to remove conversation from knowledge graph:', graphError);
          // Don't fail the whole operation if graph deletion fails
        }
      }

    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSummary = async (id: number) => {
    if (!confirm('Are you sure you want to delete this summary?\n\nThis will:\n• Remove the summary from your memory\n• Delete related entities from the knowledge graph\n• This action cannot be undone')) return;

    setDeletingSummaryId(id);
    try {
      // Get the summary data before deleting
      const summary = summaries.find(s => s.id === id);

      // Delete from memory database
      await deleteSummary(id);
      setSummaries(prev => prev.filter(summary => summary.id !== id));
      setSelectedSummary(null);

      // Delete related nodes from knowledge graph
      if (summary?.text) {
        try {
          const result = await graphService.removeContentFromGraph(summary.text, 'local-user-1');
          console.log('✅ Removed summary content from knowledge graph:', result);
          if (result.nodesDeleted > 0) {
            console.log(`🗑️ Deleted ${result.nodesDeleted} nodes from knowledge graph`);
          }
        } catch (graphError) {
          console.error('❌ Failed to remove summary from knowledge graph:', graphError);
          // Don't fail the whole operation if graph deletion fails
        }
      }

    } catch (error) {
      console.error('Error deleting summary:', error);
    } finally {
      setDeletingSummaryId(null);
    }
  };

  const handleDeleteChatSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this chat session?\n\nThis will:\n• Remove all messages from this session\n• Delete related entities from the knowledge graph\n• This action cannot be undone')) return;

    setDeletingChatId(sessionId);
    try {
      // Get the chat session data before deleting
      const chatSession = chatSessions.find(session => session.session_id === sessionId);

      // Delete from memory database
      await deleteChatSession(sessionId);
      setChatSessions(prev => prev.filter(session => session.session_id !== sessionId));
      setSelectedChatSession(null);

      // Delete related nodes from knowledge graph
      if (chatSession?.messages) {
        try {
          // Combine all user messages from the session
          const userMessages = chatSession.messages
            .filter(msg => msg.role === 'user')
            .map(msg => msg.content)
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
      setDeletingChatId(null);
    }
  };

  const handleViewSummary = async (summary: Summary) => {
    setSelectedSummary(summary);
  };

  const handleViewChatSession = async (sessionId: string) => {
    try {
      const messages = await getChatSessionById(sessionId);
      setSelectedChatSession(messages);
    } catch (error) {
      console.error('Error loading chat session:', error);
    }
  };

  const handleGenerateGraph = async (transcriptId: number) => {
    setGeneratingGraph(transcriptId);
    try {
      // Get the transcript text from the conversation
      const conversation = conversations.find(conv => conv.id === transcriptId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      await graphService.generateGraphFromTranscript(transcriptId, conversation.transcript);
      alert('Graph generated successfully! Check the Graph page to view it.');
    } catch (error) {
      console.error('Error generating graph:', error);
      alert('Failed to generate graph. Please try again.');
    } finally {
      setGeneratingGraph(null);
    }
  };

  const handleImportToKnowledgeGraph = async (transcriptId: number) => {
    setImportingToKG(transcriptId);
    try {
      // Get the transcript text from the conversation
      const conversation = conversations.find(conv => conv.id === transcriptId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const result = await graphService.importTextToKnowledgeGraph(
        conversation.transcript,
        conversation.name
      );

      alert(`Text imported to knowledge graph successfully! ${result.entities_created} entities created.`);
    } catch (error) {
      console.error('Error importing to knowledge graph:', error);
      alert('Failed to import text to knowledge graph. Please try again.');
    } finally {
      setImportingToKG(null);
    }
  };

  const handlePlayAudio = async (id: number) => {
    try {
      const audioFile = await getAudioFileById(id);
      if (audioFile && audioFile.blob) {
        const blob = new Blob([audioFile.blob], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  let summaryData: any = selectedSummary;
  let parsedText: any = null;

  if (selectedSummary) {
    // If the summary has a 'text' field that looks like JSON, parse it
    if (typeof selectedSummary.text === 'string') {
      try {
        // Handle markdown-formatted JSON (```json ... ```)
        let jsonString = selectedSummary.text.trim();
        
        // Remove markdown code block formatting if present
        if (jsonString.startsWith('```json')) {
          jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonString.startsWith('```')) {
          jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        parsedText = JSON.parse(jsonString);
        console.log('Parsed summary data:', parsedText);
      } catch (error) {
        console.error('Error parsing summary JSON:', error);
        console.log('Raw summary text:', selectedSummary.text);
        parsedText = null;
      }
    }
  }
  // Use parsedText for display if it exists, otherwise fallback to summaryData
  const displayData = parsedText || summaryData;

  // Utility function to get display title for a chat session
  function getChatSessionDisplayTitle(session: any) {
    if (session.title && session.title.trim()) return session.title;
    if (session.preview && session.preview.trim()) return session.preview;
    return `Chat Session (${session.message_count} messages)`;
  }

  async function handleRenameChatSession(sessionId: string, newTitle: string) {
    await updateChatSessionTitle(sessionId, newTitle);
    setEditingChatId(null);
    setEditingChatTitle('');
    await loadChatSessions();
  }

  return (
    <section className="relative py-24 px-4 min-h-screen bg-gradient-to-br from-[#0A0C10] via-[#0B0E11] to-[#000000]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Memory Vault
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Your private, on-device archive of conversations, summaries, and AI chat history
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Conversations */}
          <motion.div
            className={sectionCard}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Mic className="text-cyan-400 mr-2" size={28} />
                <h3 className="text-2xl font-semibold text-white">Conversations</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadAllData(true)}
                  disabled={refreshing}
                  className="p-1.5 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 rounded-lg transition-colors duration-200 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={`text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <span className="text-cyan-400 text-sm font-medium bg-cyan-400/10 px-2 py-1 rounded-full">
                  {conversations.length}
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-white/40 text-sm">Loading conversations...</p>
                  </div>
                </div>
              ) : conversations.length > 0 ? (
                <div className="space-y-3">
                  {conversations.map((conversation) => (
                    <motion.div
                      key={conversation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/20 border border-white/5 rounded-xl p-4 hover:bg-black/30 transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-medium text-sm truncate flex-1 mr-2">
                          {conversation.name}
                        </h4>
                        <div className="flex items-center space-x-1 text-white/40 text-xs">
                          <Calendar size={12} />
                          <span>{formatDate(conversation.created)}</span>
                        </div>
                      </div>
                      
                      <p className="text-white/60 text-xs leading-relaxed mb-3">
                        {truncateText(conversation.transcript, 80)}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-white/40 text-xs">
                          <Clock size={12} />
                          <span>{formatTime(conversation.created)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedTranscript(conversation)}
                            className="p-1.5 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 rounded-lg transition-colors duration-200"
                            title="View full transcript"
                          >
                            <Eye size={12} className="text-cyan-400" />
                          </button>
                          <button
                            onClick={() => handleGenerateGraph(conversation.id)}
                            disabled={generatingGraph === conversation.id}
                            className="p-1.5 bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate knowledge graph"
                          >
                            {generatingGraph === conversation.id ? (
                              <div className="w-3 h-3 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                            ) : (
                              <Network size={12} className="text-blue-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleImportToKnowledgeGraph(conversation.id)}
                            disabled={importingToKG === conversation.id}
                            className="p-1.5 bg-purple-400/10 hover:bg-purple-400/20 border border-purple-400/20 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Import to knowledge graph"
                          >
                            {importingToKG === conversation.id ? (
                              <div className="w-3 h-3 border border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                            ) : (
                              <Database size={12} className="text-purple-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handlePlayAudio(conversation.id)}
                            className="p-1.5 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 rounded-lg transition-colors duration-200"
                          >
                            <Play size={12} className="text-cyan-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteConversation(conversation.id)}
                            disabled={deletingId === conversation.id}
                            className="p-1.5 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingId === conversation.id ? (
                              <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 size={12} className="text-red-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center">
                  <div className="w-16 h-16 bg-cyan-400/10 border border-cyan-400/20 rounded-full flex items-center justify-center mb-4">
                    <Mic className="text-cyan-400" size={32} />
                  </div>
                  <p className="text-white/60 text-center text-sm">No conversations saved yet.</p>
                  <p className="text-white/40 text-center text-xs mt-1">Record or upload audio to get started.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Summaries */}
          <motion.div
            className={sectionCard}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <FileText className="text-emerald-400 mr-2" size={28} />
                <h3 className="text-2xl font-semibold text-white">Summaries</h3>
              </div>
              <span className="text-emerald-400 text-sm font-medium bg-emerald-400/10 px-2 py-1 rounded-full">
                {summaries.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-white/40 text-sm">Loading summaries...</p>
                  </div>
                </div>
              ) : summaries.length > 0 ? (
                <div className="space-y-3">
                  {summaries.map((summary) => (
                    <motion.div
                      key={summary.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/20 border border-white/5 rounded-xl p-4 hover:bg-black/30 transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-medium text-sm truncate flex-1 mr-2">
                          {summary.title}
                        </h4>
                        <div className="flex items-center space-x-1 text-white/40 text-xs">
                          <Calendar size={12} />
                          <span>{summary.created ? formatDate(summary.created) : 'Unknown'}</span>
                        </div>
                      </div>
                      
                      <p className="text-white/60 text-xs leading-relaxed mb-3">
                        {truncateText(summary.text, 80)}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-white/40 text-xs">
                          <Clock size={12} />
                          <span>{summary.created ? formatTime(summary.created) : ''}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleViewSummary(summary)}
                            className="p-1.5 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/20 rounded-lg transition-colors duration-200"
                          >
                            <Eye size={12} className="text-emerald-400" />
                          </button>
                          <button 
                            onClick={() => handleDeleteSummary(summary.id)}
                            disabled={deletingSummaryId === summary.id}
                            className="p-1.5 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingSummaryId === summary.id ? (
                              <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 size={12} className="text-red-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center">
                  <div className="w-16 h-16 bg-emerald-400/10 border border-emerald-400/20 rounded-full flex items-center justify-center mb-4">
                    <FileText className="text-emerald-400" size={32} />
                  </div>
                  <p className="text-white/60 text-center text-sm">No summaries saved yet.</p>
                  <p className="text-white/40 text-center text-xs mt-1">Generate and save summaries to see them here.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* AI Chat Memory */}
          <motion.div
            className={sectionCard}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <MessageSquare className="text-fuchsia-400 mr-2" size={28} />
                <h3 className="text-2xl font-semibold text-white">AI Chat Memory</h3>
              </div>
              <span className="text-fuchsia-400 text-sm font-medium bg-fuchsia-400/10 px-2 py-1 rounded-full">
                {chatSessions.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-fuchsia-400/30 border-t-fuchsia-400 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-white/40 text-sm">Loading chat sessions...</p>
                  </div>
                </div>
              ) : chatSessions.length > 0 ? (
                <div className="space-y-3">
                  {chatSessions.map((session) => (
                    <motion.div
                      key={session.session_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/20 border border-white/5 rounded-xl p-4 hover:bg-black/30 transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        {editingChatId === session.session_id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingChatTitle}
                              onChange={e => setEditingChatTitle(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  await handleRenameChatSession(session.session_id, editingChatTitle);
                                } else if (e.key === 'Escape') {
                                  setEditingChatId(null);
                                  setEditingChatTitle('');
                                }
                              }}
                              className="flex-1 bg-gray-800/80 border border-gray-600 rounded px-2 py-1 text-gray-300 text-sm focus:outline-none focus:border-fuchsia-500"
                              autoFocus
                            />
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleRenameChatSession(session.session_id, editingChatTitle);
                              }}
                              className="p-1 hover:bg-green-600/20 rounded text-green-400"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingChatId(null);
                                setEditingChatTitle('');
                              }}
                              className="p-1 hover:bg-red-600/20 rounded text-red-400"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <h4 className="text-white font-medium text-sm truncate flex-1 mr-2">
                            {getChatSessionDisplayTitle(session)}
                          </h4>
                        )}
                        <div className="flex items-center space-x-1 text-white/40 text-xs">
                          <Calendar size={12} />
                          <span>{formatDate(session.created)}</span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingChatId(session.session_id);
                            setEditingChatTitle(getChatSessionDisplayTitle(session));
                          }}
                          className="ml-2 p-1 hover:bg-gray-600/50 rounded text-gray-400 hover:text-gray-300 transition-colors"
                          title="Rename chat session"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                      <p className="text-white/60 text-xs leading-relaxed mb-3">
                        {truncateText(session.preview, 80)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-white/40 text-xs">
                          <Clock size={12} />
                          <span>{formatTime(session.created)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleViewChatSession(session.session_id)}
                            className="p-1.5 bg-fuchsia-400/10 hover:bg-fuchsia-400/20 border border-fuchsia-400/20 rounded-lg transition-colors duration-200"
                          >
                            <Eye size={12} className="text-fuchsia-400" />
                          </button>
                          <button 
                            onClick={() => handleDeleteChatSession(session.session_id)}
                            disabled={deletingChatId === session.session_id}
                            className="p-1.5 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingChatId === session.session_id ? (
                              <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 size={12} className="text-red-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center">
                  <div className="w-16 h-16 bg-fuchsia-400/10 border border-fuchsia-400/20 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="text-fuchsia-400" size={32} />
                  </div>
                  <p className="text-white/60 text-center text-sm">No chat sessions saved yet.</p>
                  <p className="text-white/40 text-center text-xs mt-1">Save chat conversations to see them here.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Summary View Modal */}
      {selectedSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-white">
                {selectedSummary.title && selectedSummary.title !== "Untitled Summary" ? selectedSummary.title : `Summary #${selectedSummary.id}`}
              </h3>
              <button
                onClick={() => setSelectedSummary(null)}
                className="text-white/60 hover:text-white text-2xl ml-4"
                aria-label="Close summary modal"
              >
                &times;
              </button>
            </div>
            {/* Debug: log the summary object */}
            {console.log('Selected summary:', selectedSummary)}
            {/* Parse summary if it's a string */}
            {/* Placeholder for summaryData parsing */}
            <div className="space-y-6">
              {/* Title */}
              <div>
                <span className="font-semibold text-white">Title:</span>
                <span className="ml-2 text-white/90">{displayData?.title || '(none)'}</span>
              </div>
              {/* Duration */}
              <div>
                <span className="font-semibold text-white">Duration:</span>
                <span className="ml-2 text-white/90">{displayData?.duration && displayData.duration !== '' ? displayData.duration : '(none)'}</span>
              </div>
              {/* Participants */}
              <div>
                <span className="font-semibold text-white">Participants:</span>
                {displayData?.participants && displayData.participants.length > 0 ? (
                  <ul className="list-disc list-inside text-white/90 ml-6">
                    {displayData.participants.map((p: string, idx: number) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="ml-2 text-white/90">(none)</span>
                )}
              </div>
              {/* Key Points */}
              <div>
                <span className="font-semibold text-white">Key Points:</span>
                {displayData?.keyPoints && displayData.keyPoints.length > 0 ? (
                  <ul className="list-disc list-inside text-white/90 ml-6">
                    {displayData.keyPoints.map((point: string, idx: number) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="ml-2 text-white/90">(none)</span>
                )}
              </div>
              {/* Action Items */}
              <div>
                <span className="font-semibold text-white">Action Items:</span>
                {displayData?.actionItems && displayData.actionItems.length > 0 ? (
                  <ul className="list-disc list-inside text-white/90 ml-6">
                    {displayData.actionItems.map((item: any, idx: number) => (
                      <li key={idx}>
                        {typeof item === 'string' ? item : `${item.task}${item.assignee ? ` (${item.assignee})` : ''}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="ml-2 text-white/90">(none)</span>
                )}
              </div>
              {/* Tags */}
              <div>
                <span className="font-semibold text-white">Tags:</span>
                {displayData?.tags && displayData.tags.length > 0 ? (
                  <ul className="list-disc list-inside text-white/90 ml-6">
                    {displayData.tags.map((tag: string, idx: number) => (
                      <li key={idx}>{tag}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="ml-2 text-white/90">(none)</span>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Chat Session View Modal */}
      {selectedChatSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-white">Chat Session</h3>
              <button
                onClick={() => setSelectedChatSession(null)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {selectedChatSession.map((message: any, index: number) => (
                <div
                  key={index}
                  className={`flex ${message[1] === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    message[1] === 'user'
                      ? 'bg-cyan-500/20 border border-cyan-500/30 text-white'
                      : 'bg-white/10 border border-white/20 text-white'
                  }`}>
                    <div className="text-xs text-white/60 mb-2">
                      {message[1] === 'user' ? 'You' : 'AI Assistant'}
                    </div>
                    <div className="whitespace-pre-wrap">{message[2]}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Transcript View Modal */}
      {selectedTranscript && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-white">Transcript</h3>
              <button
                onClick={() => setSelectedTranscript(null)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="text-white/80 whitespace-pre-wrap font-mono text-sm">
              {selectedTranscript.transcript}
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
} 