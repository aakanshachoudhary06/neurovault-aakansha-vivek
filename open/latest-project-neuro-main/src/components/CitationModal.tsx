import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Clock, User, FileText, Brain, Database, MoreHorizontal } from 'lucide-react';
import { ChatSource } from '../services/enhancedChatService';

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: ChatSource | null;
}

const CitationModal: React.FC<CitationModalProps> = ({ isOpen, onClose, source }) => {
  const [showFullContent, setShowFullContent] = useState(false);

  if (!source) return null;

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'stored_conversation':
        return <User size={16} className="text-green-400" />;
      case 'summary':
        return <FileText size={16} className="text-purple-400" />;
      case 'knowledge_graph':
        return <Brain size={16} className="text-blue-400" />;
      case 'general_knowledge':
        return <Database size={16} className="text-gray-400" />;
      default:
        return <FileText size={16} className="text-gray-400" />;
    }
  };

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case 'stored_conversation':
        return 'Previous Conversation';
      case 'summary':
        return 'Content Summary';
      case 'knowledge_graph':
        return 'Knowledge Graph';
      case 'general_knowledge':
        return 'General Knowledge';
      default:
        return 'Unknown Source';
    }
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'Unknown time';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  // Truncate content for preview (first 150 characters)
  const previewLength = 150;
  const shouldTruncate = source.content.length > previewLength;
  const previewContent = shouldTruncate ? source.content.substring(0, previewLength) : source.content;
  const remainingContent = shouldTruncate ? source.content.substring(previewLength) : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
                <div className="flex items-center space-x-3">
                  {getSourceIcon(source.type)}
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {source.source_name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {getSourceTypeLabel(source.type)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Metadata */}
                <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-400">
                  {source.timestamp && (
                    <div className="flex items-center space-x-1">
                      <Clock size={14} />
                      <span>{formatTimestamp(source.timestamp)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-blue-400">Relevance:</span>
                    <span className="text-white">{(source.relevance * 100).toFixed(1)}%</span>
                  </div>

                  {source.confidence && (
                    <div className="flex items-center space-x-1">
                      <span className="text-green-400">Confidence:</span>
                      <span className="text-white">{(source.confidence * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                {/* Original Query (for conversations) */}
                {source.original_query && (
                  <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Original Question:</p>
                    <p className="text-white text-sm">{source.original_query}</p>
                  </div>
                )}

                {/* Main Content */}
                <div className="space-y-3">
                  <div className="text-gray-300 leading-relaxed">
                    {previewContent}
                    
                    {/* Show remaining content if expanded */}
                    {showFullContent && remainingContent && (
                      <span>{remainingContent}</span>
                    )}
                    
                    {/* Truncation indicator and expand button */}
                    {shouldTruncate && !showFullContent && (
                      <span className="inline-flex items-center">
                        <button
                          onClick={() => setShowFullContent(true)}
                          className="ml-1 text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center space-x-1"
                        >
                          <span>[...]</span>
                          <MoreHorizontal size={14} />
                        </button>
                      </span>
                    )}
                    
                    {/* Collapse button when expanded */}
                    {showFullContent && shouldTruncate && (
                      <div className="mt-2">
                        <button
                          onClick={() => setShowFullContent(false)}
                          className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                        >
                          Show less
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Additional Notes */}
                  {source.note && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-300 text-sm">{source.note}</p>
                    </div>
                  )}

                  {/* Entity Type (for knowledge graph) */}
                  {source.entity_type && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-400">Entity Type:</span>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                        {source.entity_type}
                      </span>
                    </div>
                  )}

                  {/* Model Info */}
                  {source.model && (
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span>Generated by:</span>
                      <span className="text-gray-300">{source.model}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Source ID: {source.id}
                  </p>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CitationModal;
