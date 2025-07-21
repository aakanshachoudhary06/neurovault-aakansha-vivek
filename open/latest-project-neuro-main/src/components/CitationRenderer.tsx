import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X, Info, Clock, Star } from 'lucide-react';
import { ChatSource, enhancedChatService } from '../services/enhancedChatService';
import ReactMarkdown from 'react-markdown';
import { CitationMatcher } from '../utils/citationMatcher';

interface CitationRendererProps {
  content: string;
  sources: ChatSource[];
}

interface CitationModalProps {
  source: ChatSource;
  isOpen: boolean;
  onClose: () => void;
}

// Modal component for displaying citation details
const CitationModal: React.FC<CitationModalProps> = ({ source, isOpen, onClose }) => {
  const [showFullContent, setShowFullContent] = useState(false);

  if (!isOpen) return null;

  // Truncate content for preview (first 150 characters)
  const previewLength = 150;
  const shouldTruncate = source.content.length > previewLength;
  const previewContent = shouldTruncate ? source.content.substring(0, previewLength) : source.content;
  const remainingContent = shouldTruncate ? source.content.substring(previewLength) : '';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`${enhancedChatService.getSourcePriorityColor(source.type)} text-2xl`}>
                {enhancedChatService.getSourceTypeIcon(source.type)}
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${enhancedChatService.getSourcePriorityColor(source.type)}`}>
                  {source.source_name}
                </h3>
                <p className="text-sm text-white/60">
                  {enhancedChatService.getSourceTypeLabel(source.type)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Relevance Score */}
          <div className="flex items-center space-x-2 mb-4">
            <Star size={16} className="text-yellow-400" />
            <span className="text-sm text-white/80">
              Relevance: {enhancedChatService.formatRelevanceScore(source.relevance)}
            </span>
          </div>

          {/* Content */}
          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-white/80 mb-2 flex items-center">
              <Info size={14} className="mr-2" />
              Source Content
            </h4>
            <div className="text-white/90 leading-relaxed">
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
                    className="ml-1 text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center space-x-1 underline"
                  >
                    <span>[...]</span>
                  </button>
                </span>
              )}

              {/* Collapse button when expanded */}
              {showFullContent && shouldTruncate && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowFullContent(false)}
                    className="text-blue-400 hover:text-blue-300 transition-colors text-sm underline"
                  >
                    Show less
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {(source.timestamp || source.original_query || source.model) && (
            <div className="space-y-2">
              {source.timestamp && (
                <div className="flex items-center space-x-2 text-sm text-white/60">
                  <Clock size={14} />
                  <span>Timestamp: {source.timestamp}</span>
                </div>
              )}
              {source.original_query && (
                <div className="text-sm text-white/60">
                  <span className="font-medium">Original Query:</span> "{source.original_query}"
                </div>
              )}
              {source.model && (
                <div className="text-sm text-white/60">
                  <span className="font-medium">Model:</span> {source.model}
                </div>
              )}
              {source.confidence && (
                <div className="text-sm text-white/60">
                  <span className="font-medium">Confidence:</span> {Math.round(source.confidence * 100)}%
                </div>
              )}
              {source.note && (
                <div className="text-sm text-white/60">
                  <span className="font-medium">Note:</span> {source.note}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Main citation renderer component
const CitationRenderer: React.FC<CitationRendererProps> = ({ content, sources }) => {
  const [selectedSource, setSelectedSource] = useState<ChatSource | null>(null);

  // Use intelligent citation matching
  const getContentWithCitations = () => {
    if (!sources || sources.length === 0) {
      return content;
    }

    // Use the intelligent citation matcher
    const matches = CitationMatcher.findCitationPositions(content, sources);
    return CitationMatcher.insertCitations(content, matches);
  };

  const handleCitationClick = (sourceIndex: number) => {
    setSelectedSource(sources[sourceIndex]);
  };

  // Custom components for ReactMarkdown
  const markdownComponents = {
    p: ({node, ...props}: any) => (
      <p {...props} className="text-white leading-relaxed whitespace-pre-line" />
    ),
    li: ({node, ...props}: any) => (
      <li {...props} className="text-white leading-relaxed whitespace-pre-line ml-6 list-disc" />
    ),
    ul: ({node, ...props}: any) => <ul {...props} className="mb-2" />,
    strong: ({node, ...props}: any) => <strong {...props} className="font-bold text-white" />,
    em: ({node, ...props}: any) => <em {...props} className="italic text-white" />,
    // Custom citation renderer
    text: ({node, ...props}: any) => {
      const value = props.children;

      // Check if text contains citation markers
      if (typeof value === 'string' && value.includes('[') && value.includes(']')) {
        // Replace citation markers with clickable spans
        const parts = [];
        let lastIndex = 0;

        // Regular expression to find citation markers like [1], [2], etc.
        const citationRegex = /\[(\d+)\]/g;
        let match;

        while ((match = citationRegex.exec(value)) !== null) {
          const citationNumber = parseInt(match[1]);
          const sourceIndex = citationNumber - 1;

          // Add text before citation
          if (match.index > lastIndex) {
            parts.push(value.substring(lastIndex, match.index));
          }

          // Add clickable citation as a link
          if (sourceIndex >= 0 && sourceIndex < sources.length) {
            const source = sources[sourceIndex];
            const sourceTypeColor = source.type === 'stored_conversation' ? 'text-green-400 hover:text-green-300' :
                                   source.type === 'summary' ? 'text-purple-400 hover:text-purple-300' :
                                   source.type === 'knowledge_graph' ? 'text-blue-400 hover:text-blue-300' :
                                   'text-gray-400 hover:text-gray-300';

            parts.push(
              <button
                key={`citation-${sourceIndex}`}
                className={`inline-flex items-center ${sourceTypeColor} underline decoration-dotted underline-offset-2 cursor-pointer transition-colors ml-0.5 text-sm font-medium hover:decoration-solid`}
                onClick={() => handleCitationClick(sourceIndex)}
                title={`Click to view source: ${source.source_name}`}
              >
                [{citationNumber}]
              </button>
            );
          } else {
            // If source index is invalid, just render the text
            parts.push(match[0]);
          }

          lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < value.length) {
          parts.push(value.substring(lastIndex));
        }

        return <>{parts}</>;
      }

      // Regular text without citations
      return <span {...props} />;
    }
  };

  return (
    <div>
      {/* Render content with citations using ReactMarkdown */}
      <ReactMarkdown components={markdownComponents}>
        {getContentWithCitations()}
      </ReactMarkdown>

      {/* Citation modal */}
      {selectedSource && (
        <CitationModal
          source={selectedSource}
          isOpen={!!selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </div>
  );
};

export default CitationRenderer;
