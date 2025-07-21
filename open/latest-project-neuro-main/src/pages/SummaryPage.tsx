import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { History, RotateCcw, X, Search, FileText, Trash2, Clock, Users, Calendar, Check, Save, Tag, Pencil, Loader2, Download } from 'lucide-react';
import { useSummaryStore } from '../services/summaryStore';
import { summarizeText, safeParseSummary } from '../backend/chatService';
import { 
  saveSummary, 
  getSummaries, 
  getSummaryByTranscriptHash, 
  deleteSummary, 
  migrateDatabase,
  getLatestTranscript,
  generateTranscriptHash,
  updateSummaryTitle
} from '../services/memorySQLite';

interface SummaryItem {
  id: number;
  text: string;
  transcriptHash?: string;
  transcript?: string;
  created: string;
}

// Helper to get a clean preview for summary history
function getSummaryPreview(text: string): string {
  let jsonString = text.trim();
  // Remove markdown code block formatting if present
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  try {
    const parsed = JSON.parse(jsonString);
    let preview = '';
    if (parsed.title) preview += parsed.title;
    if (parsed.keyPoints && Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0) {
      preview += ': ' + parsed.keyPoints.slice(0, 2).join(' | ');
    }
    return preview || text.substring(0, 100) + '...';
  } catch {
    // Not JSON, just show first 100 chars of plain text
    return text.replace(/^```json|^```|```$/g, '').substring(0, 100) + '...';
  }
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function formatTime(dateString: string | null | undefined) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString();
}

export default function SummaryPage() {
  const transcript = useSummaryStore(state => state.transcript);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [summaryHistory, setSummaryHistory] = useState<SummaryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTranscriptHash, setCurrentTranscriptHash] = useState<string>('');
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Add flag to prevent duplicate generation
  const savedTranscriptHashRef = useRef<string>(''); // Use ref to track saved transcript hash
  const hasSavedForCurrentTranscriptRef = useRef<boolean>(false); // Track if we've saved for current transcript
  const isGeneratingRef = useRef<boolean>(false); // Synchronous flag to prevent race conditions
  const [editingSummaryTitle, setEditingSummaryTitle] = useState(false);
  const [summaryTitleInput, setSummaryTitleInput] = useState('');
  const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null);
  const [historyTitleInput, setHistoryTitleInput] = useState('');
  const [editingMainTitle, setEditingMainTitle] = useState(false);
  const [mainTitleInput, setMainTitleInput] = useState(summary?.title || '');
  const [mainTitleLoading, setMainTitleLoading] = useState(false);

  // Load summary history on component mount
  useEffect(() => {
    loadSummaryHistory();
  }, []);

  // Ensure database schema is up to date
  useEffect(() => {
    migrateDatabase().then(result => {
      if (result.success) {
        console.log('Database migration completed');
      } else {
        console.error('Database migration failed:', result.error);
      }
    });
  }, []);

  // Load summary history from database
  const loadSummaryHistory = async () => {
    try {
      const summaries = await getSummaries();
      setSummaryHistory(summaries.map((item: any) => {
        console.log('Summary loaded (history):', item);
        return {
          id: item[0],
          text: item[1],
          transcriptHash: item[3], // item[3] is transcriptHash
          transcript: item[4],     // item[4] is transcript
          created: (item[2] && !isNaN(Date.parse(item[2]))) ? item[2] : null, // Use item[2] for created
          title: item[5] || 'Untitled Summary'
        };
      }));
    } catch (error) {
      console.error('Error loading summary history:', error);
    }
  };

  // Load latest transcript if none available
  useEffect(() => {
    if (!transcript || !transcript.trim()) {
      setLoading(true); // Show loading while fetching transcript
      getLatestTranscript().then(latest => {
        if (latest && latest.trim()) {
          useSummaryStore.getState().setTranscript(latest);
        }
        setLoading(false); // Hide loading after transcript is loaded (or not found)
      }).catch(error => {
        console.error('Error loading latest transcript:', error);
        setLoading(false);
      });
    } else {
      // Transcript is already available, set loading immediately
      setLoading(true);
    }
  }, []);

  // Generate transcript hash and check for cached summary
  useEffect(() => {
    if (transcript && transcript.trim() && !isGenerating) {
      console.log('Processing transcript for summary...');
      const hash = generateTranscriptHash(transcript);
      setCurrentTranscriptHash(hash);
      
      // Reset saved hash ref when transcript changes (unless it's the same transcript)
      if (savedTranscriptHashRef.current !== hash) {
        savedTranscriptHashRef.current = '';
        setSaved(false);
        hasSavedForCurrentTranscriptRef.current = false; // Reset save flag for new transcript
        isGeneratingRef.current = false; // Reset generating flag for new transcript
      }
      
      // Check if we have a cached summary for this transcript
      if (!forceRegenerate) {
        checkCachedSummary(hash);
      } else {
        // Force regeneration requested
        generateNewSummary();
        setForceRegenerate(false);
      }
    } else if (!transcript || !transcript.trim()) {
      setSummary(null);
      setLoading(false);
      setError(null);
    }
  }, [transcript, forceRegenerate]); // Remove isGenerating from dependencies to prevent loops

  // Check for cached summary
  const checkCachedSummary = async (hash: string) => {
    try {
      const cachedSummary = await getSummaryByTranscriptHash(hash);
      if (cachedSummary) {
        console.log('Found cached summary for transcript');
        setSummary({ ...safeParseSummary(cachedSummary.text), id: cachedSummary.id, title: cachedSummary.title });
        setLoading(false);
        setError(null);
        setSaved(true); // Show saved status for cached summaries
        savedTranscriptHashRef.current = hash; // Mark as saved to prevent duplicate saves
        console.log('Cached summary loaded. Hash:', hash);
        return;
      }
    } catch (error) {
      console.error('Error checking cached summary:', error);
    }
    
    // No cached summary found, generate new one
    generateNewSummary();
  };

  // Generate new summary
  const generateNewSummary = async () => {
    // Immediate synchronous check to prevent duplicate calls
    if (isGeneratingRef.current || hasSavedForCurrentTranscriptRef.current) {
      console.log('Skipping summary generation - already in progress or saved:', {
        isGeneratingRef: isGeneratingRef.current,
        hasSavedForCurrent: hasSavedForCurrentTranscriptRef.current
      });
      return;
    }
    
    if (!transcript || !transcript.trim()) {
      console.log('Skipping summary generation - no transcript available');
      return;
    }
    
    // Skip if we have a valid saved hash that matches current hash
    if (savedTranscriptHashRef.current && savedTranscriptHashRef.current === currentTranscriptHash) {
      console.log('Skipping summary generation - already saved for this transcript hash:', {
        currentHash: currentTranscriptHash,
        savedHash: savedTranscriptHashRef.current
      });
      return;
    }
    
    console.log('Generating new summary...', {
      transcriptLength: transcript.length,
      currentHash: currentTranscriptHash,
      savedHash: savedTranscriptHashRef.current
    });
    
    // Set flags immediately to prevent duplicate calls
    isGeneratingRef.current = true; // Set ref immediately (synchronous)
    setIsGenerating(true);
    setLoading(true);
    setError(null);
    setSummary(null);
    setSaved(false);
    
    try {
      const rawSummary = await summarizeText(transcript);
      const parsedSummary = safeParseSummary(rawSummary);
      const summaryTitle = parsedSummary && parsedSummary.title ? parsedSummary.title : 'Untitled Summary';
      setSummary({ ...parsedSummary, title: summaryTitle });
      
      // Auto-save the new summary
      console.log('Auto-saving summary...');
      const hash = generateTranscriptHash(transcript);
      await saveSummary(rawSummary, hash, transcript, summaryTitle);
      
      
      
      setSaved(true);
      savedTranscriptHashRef.current = hash; // Update ref to mark as saved
      hasSavedForCurrentTranscriptRef.current = true; // Mark that we've saved for this transcript
      console.log('Summary saved successfully. Hash:', hash);
      
      // Reload summary history
      loadSummaryHistory();
    } catch (error) {
      console.error('Error generating summary:', error);
      setError('Failed to generate summary.');
    } finally {
      isGeneratingRef.current = false; // Reset ref flag
      setLoading(false);
      setIsGenerating(false);
    }
  };



  // Handle force regeneration
  const handleRegenerate = () => {
    setForceRegenerate(true);
    savedTranscriptHashRef.current = ''; // Reset saved transcript hash for regeneration
    hasSavedForCurrentTranscriptRef.current = false; // Reset save flag for regeneration
    isGeneratingRef.current = false; // Reset generating flag for regeneration
    setSaved(false); // Reset saved status
  };

  // Load summary from history
  const loadSummaryFromHistory = (summaryItem: SummaryItem) => {
    try {
      const parsedSummary = safeParseSummary(summaryItem.text);
      setSummary({ ...parsedSummary, title: summaryItem.title || 'Untitled Summary' });
      setShowHistory(false);
      
      // If this summary has a transcript, load it too
      if (summaryItem.transcript) {
        useSummaryStore.getState().setTranscript(summaryItem.transcript);
      }
    } catch (error) {
      console.error('Error loading summary from history:', error);
    }
  };

  // In the summary history section, update the Load button handler:
  const handleLoadSummaryFromHistory = (summary: SummaryItem) => {
    setSummary({ ...safeParseSummary(summary.text), id: summary.id, title: summary.title });
    setSaved(true);
    setSaving(false);
    setError(null);
    setShowHistory(false); // Close the summary history after loading
  };

  // Delete summary from history
  const handleDeleteSummary = async (id: number) => {
    try {
      await deleteSummary(id);
      loadSummaryHistory();
    } catch (error) {
      console.error('Error deleting summary:', error);
    }
  };

  // Filter summary history based on search term
  const filteredHistory = summaryHistory.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(searchLower) ||
      (item.text || '').toLowerCase().includes(searchLower)
    );
  });

  // Handle saving summary title from history
  const handleSaveSummaryTitle = async (summaryItem: SummaryItem) => {
    if (historyTitleInput.trim() && historyTitleInput !== summaryItem.title) {
      await updateSummaryTitle(summaryItem.id, historyTitleInput.trim());
      setSummaryHistory(h => h.map(s => s.id === summaryItem.id ? { ...s, title: historyTitleInput.trim() } : s));
    }
    if (summary && summary.id === summaryItem.id) {
      setSummary((s: any) => ({ ...s, title: historyTitleInput.trim() }));
    }
    setEditingHistoryId(null);
  };

  const handleSaveMainTitle = async () => {
    if (!summary || !mainTitleInput.trim() || mainTitleInput === summary.title) {
      setEditingMainTitle(false);
      return;
    }
    setMainTitleLoading(true);
    await updateSummaryTitle(summary.id, mainTitleInput.trim());
    setSummary((s: any) => ({ ...s, title: mainTitleInput.trim() }));
    // Also update summaryHistory and memory if needed
    setSummaryHistory(h => h.map(s => s.id === summary.id ? { ...s, title: mainTitleInput.trim() } : s));
    setMainTitleLoading(false);
    setEditingMainTitle(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0C10] via-[#0B0E11] to-[#000000]">
      <div className="pt-20 pb-32 max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Intelligent Summaries
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            AI-powered extraction of key insights and actionable items
          </p>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex justify-center mb-8 space-x-4">
          <motion.button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition-colors duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <History size={20} />
            <span>Summary History</span>
          </motion.button>
          
          {summary && (
            <motion.button
              onClick={handleRegenerate}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: loading ? 1 : 1.05 }}
              whileTap={{ scale: loading ? 1 : 0.95 }}
            >
              <RotateCcw size={20} />
              <span>Regenerate</span>
            </motion.button>
          )}
          
          <motion.button
            onClick={() => {
              migrateDatabase().then(result => {
                if (result.success) {
                  alert('Database migration completed successfully!');
                  loadSummaryHistory();
                } else {
                  alert('Migration failed: ' + result.error);
                }
              });
            }}
            className="flex items-center space-x-2 px-6 py-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 transition-colors duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RotateCcw size={20} />
            <span>Fix Database</span>
          </motion.button>
        </div>

        {/* Summary History Sidebar */}
        {showHistory && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-4xl max-h-[80vh] overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-white">Summary History</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors duration-300"
                >
                  <X size={24} className="text-white/60" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
                <input
                  type="text"
                  placeholder="Search summaries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50"
                />
              </div>

              {/* Summary List */}
              <div className="overflow-y-auto max-h-[60vh] space-y-4">
                {filteredHistory.length === 0 ? (
                  <div className="text-center text-white/40 py-8">No summaries found</div>
                ) : (
                  filteredHistory.map((item) => (
                    <motion.div
                      key={item.id}
                      className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {/* In the summary history rendering, fix the title/edit section: */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {editingHistoryId === item.id ? (
                            <input
                              value={historyTitleInput}
                              onChange={e => setHistoryTitleInput(e.target.value)}
                              onBlur={async () => {
                                await handleSaveSummaryTitle(item);
                              }}
                              onKeyDown={async e => {
                                if (e.key === 'Enter') await handleSaveSummaryTitle(item);
                              }}
                              className="bg-transparent border-b border-gray-400 text-lg font-bold outline-none"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="font-bold text-lg">{item.title}</span>
                              <Pencil
                                className="ml-2 cursor-pointer text-gray-400 hover:text-blue-500"
                                size={16}
                                onClick={() => {
                                  setHistoryTitleInput(item.title || '');
                                  setEditingHistoryId(item.id);
                                }}
                              />
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="flex items-center gap-1 px-3 py-1 rounded-md bg-blue-900/40 text-blue-400 hover:bg-blue-700/60 hover:text-white transition-colors text-sm font-medium shadow-sm"
                            onClick={() => handleLoadSummaryFromHistory(item)}
                          >
                            <Download size={14} /> Load
                          </button>
                          <button
                            className="flex items-center gap-1 px-3 py-1 rounded-md bg-red-900/40 text-red-400 hover:bg-red-700/60 hover:text-white transition-colors text-sm font-medium shadow-sm"
                            onClick={() => handleDeleteSummary(item.id)}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-white/80 text-sm mb-3 line-clamp-3">
                        {item.transcript ? item.transcript.substring(0, 150) + '...' : 'No transcript available'}
                      </div>
                      
                      <div className="text-white/60 text-sm line-clamp-2">{getSummaryPreview(item.text)}</div>
                      <div className="text-xs text-gray-400 mt-2">{formatDate(item.created)} {formatTime(item.created)}</div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Loading/Error/No Transcript States */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="text-cyan-400 font-medium">Summarizing...</span>
          </div>
        )}
        {error && (
          <div className="text-center text-red-400 mb-8">{error}</div>
        )}
        {!transcript && !loading && !error && (
          <div className="text-center text-white/40 py-12">No transcript available. Record or upload audio to generate a summary.</div>
        )}

        {/* Summary Output */}
        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Summary */}
            <motion.div
              className="lg:col-span-2 bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-2 mb-2">
                {editingMainTitle ? (
                  <input
                    value={mainTitleInput}
                    onChange={e => setMainTitleInput(e.target.value)}
                    onBlur={handleSaveMainTitle}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveMainTitle(); }}
                    className="bg-transparent border-b border-gray-400 text-xl font-bold outline-none text-white px-1"
                    autoFocus
                    disabled={mainTitleLoading}
                    style={{ opacity: mainTitleLoading ? 0.6 : 1 }}
                  />
                ) : (
                  <>
                    <span className="text-xl font-bold text-white">{summary?.title || 'Untitled Summary'}</span>
                    <Pencil
                      className="ml-2 cursor-pointer text-gray-400 hover:text-blue-500"
                      size={18}
                      onClick={() => {
                        setMainTitleInput(summary?.title || '');
                        setEditingMainTitle(true);
                      }}
                    />
                  </>
                )}
                {mainTitleLoading && <span className="ml-2 animate-spin"><Loader2 size={16} /></span>}
              </div>

              <div className="space-y-8">
                {summary.keyPoints && summary.keyPoints.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Key Discussion Points</h4>
                    <div className="space-y-3">
                      {summary.keyPoints.map((point: string, index: number) => (
                        <motion.div
                          key={index}
                          className="flex items-start space-x-3 p-4 bg-black/20 rounded-2xl border border-white/5"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                          <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
                          <p className="text-white/80 leading-relaxed">{point}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.actionItems && summary.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Action Items</h4>
                    <div className="space-y-3">
                      {summary.actionItems.map((item: any, index: number) => (
                        <motion.div
                          key={index}
                          className="p-4 bg-black/20 rounded-2xl border border-white/5"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-white font-medium">{item.task}</p>
                            {item.deadline && (
                              <span className="text-xs text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">
                                {item.deadline}
                              </span>
                            )}
                          </div>
                          {item.assignee && (
                            <p className="text-white/60 text-sm">Assigned to: {item.assignee}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Participants */}
              {summary.participants && summary.participants.length > 0 && (
                <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Users className="mr-2" size={20} />
                    Participants
                  </h4>
                  <div className="space-y-3">
                    {summary.participants.map((participant: string, index: number) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {participant.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <span className="text-white/80 font-medium">{participant}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {summary.tags && summary.tags.length > 0 && (
                <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Tag className="mr-2" size={20} />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {summary.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/70 text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Export Options */}
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FileText className="mr-2" size={20} />
                  Export
                </h4>
                <div className="space-y-3">
                  <button className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition-colors duration-300">
                    Export to PDF
                  </button>
                  <button className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition-colors duration-300">
                    Send to Notion
                  </button>
                  <button className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition-colors duration-300">
                    Copy to Obsidian
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}