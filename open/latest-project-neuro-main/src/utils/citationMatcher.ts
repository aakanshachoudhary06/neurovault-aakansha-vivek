import { ChatSource } from '../services/enhancedChatService';

export interface CitationMatch {
  sourceIndex: number;
  startPos: number;
  endPos: number;
  confidence: number;
  matchedText: string;
}

/**
 * Utility class for intelligent citation matching
 */
export class CitationMatcher {
  /**
   * Find the best positions to place citations based on content similarity
   */
  static findCitationPositions(content: string, sources: ChatSource[]): CitationMatch[] {
    const matches: CitationMatch[] = [];
    
    // Split content into sentences
    const sentences = this.splitIntoSentences(content);
    let currentPos = 0;
    
    // For each source, find the best matching sentence
    sources.forEach((source, sourceIndex) => {
      const bestMatch = this.findBestSentenceMatch(sentences, source, currentPos);
      if (bestMatch) {
        matches.push({
          sourceIndex,
          startPos: bestMatch.startPos,
          endPos: bestMatch.endPos,
          confidence: bestMatch.confidence,
          matchedText: bestMatch.text
        });
      }
    });
    
    // Sort matches by position to maintain order
    return matches.sort((a, b) => a.startPos - b.startPos);
  }
  
  /**
   * Split content into sentences with position tracking
   */
  private static splitIntoSentences(content: string): Array<{text: string, startPos: number, endPos: number}> {
    const sentences: Array<{text: string, startPos: number, endPos: number}> = [];
    
    // Simple sentence splitting - could be improved with more sophisticated NLP
    const sentenceRegex = /[.!?]+\s*/g;
    let lastIndex = 0;
    let match;
    
    while ((match = sentenceRegex.exec(content)) !== null) {
      const sentenceText = content.substring(lastIndex, match.index + match[0].length).trim();
      if (sentenceText.length > 10) { // Only consider substantial sentences
        sentences.push({
          text: sentenceText,
          startPos: lastIndex,
          endPos: match.index + match[0].length
        });
      }
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text as last sentence if substantial
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex).trim();
      if (remainingText.length > 10) {
        sentences.push({
          text: remainingText,
          startPos: lastIndex,
          endPos: content.length
        });
      }
    }
    
    return sentences;
  }
  
  /**
   * Find the best matching sentence for a source
   */
  private static findBestSentenceMatch(
    sentences: Array<{text: string, startPos: number, endPos: number}>,
    source: ChatSource,
    minPos: number
  ): {startPos: number, endPos: number, confidence: number, text: string} | null {
    let bestMatch: {startPos: number, endPos: number, confidence: number, text: string} | null = null;
    let bestScore = 0;
    
    sentences.forEach(sentence => {
      // Skip sentences before minimum position
      if (sentence.startPos < minPos) return;
      
      const similarity = this.calculateSimilarity(sentence.text, source.content);
      
      // Boost score based on source relevance
      const adjustedScore = similarity * (source.relevance || 0.5);
      
      if (adjustedScore > bestScore && adjustedScore > 0.3) { // Minimum threshold
        bestScore = adjustedScore;
        bestMatch = {
          startPos: sentence.startPos,
          endPos: sentence.endPos,
          confidence: adjustedScore,
          text: sentence.text
        };
      }
    });
    
    return bestMatch;
  }
  
  /**
   * Calculate similarity between two text strings
   * Simple implementation - could be improved with more sophisticated NLP
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    // Convert to lowercase and split into words
    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // Calculate Jaccard similarity (intersection over union)
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    const jaccardSimilarity = intersection.size / union.size;
    
    // Also consider substring matches for key terms
    let substringBonus = 0;
    const keyTerms = this.extractKeyTerms(text2);
    keyTerms.forEach(term => {
      if (text1.toLowerCase().includes(term.toLowerCase())) {
        substringBonus += 0.1;
      }
    });
    
    return Math.min(1.0, jaccardSimilarity + substringBonus);
  }
  
  /**
   * Extract key terms from source content
   */
  private static extractKeyTerms(content: string): string[] {
    // Simple key term extraction - could be improved with NLP
    const words = content.split(/\s+/).filter(w => w.length > 3);
    
    // Remove common stop words
    const stopWords = new Set([
      'this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 
      'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there',
      'what', 'about', 'when', 'where', 'could', 'should', 'might'
    ]);
    
    return words
      .filter(word => !stopWords.has(word.toLowerCase()))
      .slice(0, 5); // Take top 5 terms
  }
  
  /**
   * Insert citations into content at specified positions
   */
  static insertCitations(content: string, matches: CitationMatch[]): string {
    if (matches.length === 0) return content;
    
    // Sort matches by position (descending) to insert from end to beginning
    const sortedMatches = [...matches].sort((a, b) => b.endPos - a.endPos);
    
    let result = content;
    
    sortedMatches.forEach(match => {
      const citationNumber = match.sourceIndex + 1;
      const citation = `[${citationNumber}]`;
      
      // Find the best insertion point (after punctuation if possible)
      let insertPos = match.endPos;
      
      // Look for punctuation near the end position
      const nearbyText = result.substring(Math.max(0, insertPos - 10), Math.min(result.length, insertPos + 10));
      const punctuationMatch = nearbyText.match(/[.!?]/);
      
      if (punctuationMatch) {
        const punctuationPos = Math.max(0, insertPos - 10) + punctuationMatch.index! + 1;
        if (Math.abs(punctuationPos - insertPos) <= 10) {
          insertPos = punctuationPos;
        }
      }
      
      // Insert citation
      result = result.substring(0, insertPos) + citation + result.substring(insertPos);
    });
    
    return result;
  }
}
