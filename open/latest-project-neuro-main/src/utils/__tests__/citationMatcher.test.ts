import { CitationMatcher } from '../citationMatcher';
import { ChatSource } from '../../services/enhancedChatService';

describe('CitationMatcher', () => {
  const mockSources: ChatSource[] = [
    {
      id: 'source1',
      content: 'Artificial intelligence has shown remarkable progress in medical diagnosis with 94% accuracy.',
      relevance: 0.9,
      type: 'knowledge_graph',
      source_name: 'Medical AI Journal',
      confidence: 0.85
    },
    {
      id: 'source2',
      content: 'Machine learning algorithms are being used in healthcare systems worldwide.',
      relevance: 0.8,
      type: 'stored_conversation',
      source_name: 'Healthcare Tech Report',
      confidence: 0.78
    }
  ];

  const testContent = `
    Recent advances in artificial intelligence have revolutionized medical diagnosis. 
    These AI systems can detect diseases with unprecedented accuracy. 
    Healthcare providers are increasingly adopting machine learning technologies.
    The future of medicine will be significantly enhanced by these innovations.
  `.trim();

  describe('findCitationPositions', () => {
    it('should find appropriate citation positions', () => {
      const matches = CitationMatcher.findCitationPositions(testContent, mockSources);
      
      expect(matches).toBeDefined();
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.length).toBeLessThanOrEqual(mockSources.length);
    });

    it('should return matches with valid source indices', () => {
      const matches = CitationMatcher.findCitationPositions(testContent, mockSources);
      
      matches.forEach(match => {
        expect(match.sourceIndex).toBeGreaterThanOrEqual(0);
        expect(match.sourceIndex).toBeLessThan(mockSources.length);
        expect(match.confidence).toBeGreaterThan(0);
        expect(match.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty sources array', () => {
      const matches = CitationMatcher.findCitationPositions(testContent, []);
      expect(matches).toEqual([]);
    });

    it('should handle empty content', () => {
      const matches = CitationMatcher.findCitationPositions('', mockSources);
      expect(matches).toEqual([]);
    });
  });

  describe('insertCitations', () => {
    it('should insert citations at specified positions', () => {
      const mockMatches = [
        {
          sourceIndex: 0,
          startPos: 50,
          endPos: 80,
          confidence: 0.8,
          matchedText: 'medical diagnosis'
        },
        {
          sourceIndex: 1,
          startPos: 150,
          endPos: 180,
          confidence: 0.7,
          matchedText: 'machine learning'
        }
      ];

      const result = CitationMatcher.insertCitations(testContent, mockMatches);
      
      expect(result).toContain('[1]');
      expect(result).toContain('[2]');
      expect(result.length).toBeGreaterThan(testContent.length);
    });

    it('should handle empty matches array', () => {
      const result = CitationMatcher.insertCitations(testContent, []);
      expect(result).toBe(testContent);
    });

    it('should maintain original content when no matches', () => {
      const result = CitationMatcher.insertCitations(testContent, []);
      expect(result).toBe(testContent);
    });
  });

  describe('integration test', () => {
    it('should complete full citation workflow', () => {
      // Find citation positions
      const matches = CitationMatcher.findCitationPositions(testContent, mockSources);
      
      // Insert citations
      const result = CitationMatcher.insertCitations(testContent, matches);
      
      // Verify result contains citations
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(testContent.length);
      
      // Check for citation markers
      const citationRegex = /\[\d+\]/g;
      const citations = result.match(citationRegex);
      
      if (citations) {
        expect(citations.length).toBeGreaterThan(0);
        expect(citations.length).toBeLessThanOrEqual(mockSources.length);
      }
    });
  });

  describe('similarity calculation edge cases', () => {
    it('should handle very short content', () => {
      const shortContent = 'AI is good.';
      const matches = CitationMatcher.findCitationPositions(shortContent, mockSources);
      expect(matches).toBeDefined();
    });

    it('should handle content with no punctuation', () => {
      const noPunctContent = 'artificial intelligence machine learning healthcare technology';
      const matches = CitationMatcher.findCitationPositions(noPunctContent, mockSources);
      expect(matches).toBeDefined();
    });

    it('should handle sources with very low relevance', () => {
      const lowRelevanceSources: ChatSource[] = [
        {
          ...mockSources[0],
          relevance: 0.1
        }
      ];
      
      const matches = CitationMatcher.findCitationPositions(testContent, lowRelevanceSources);
      expect(matches).toBeDefined();
    });
  });
});
