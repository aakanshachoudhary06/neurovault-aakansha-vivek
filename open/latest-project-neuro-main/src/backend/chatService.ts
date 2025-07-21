import axios from 'axios';
import { API_CONFIG } from '../config/api';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface EnhancedChatSource {
  id: string;
  content: string;
  relevance: number;
  type: string;
  source_name: string;
  timestamp?: string;
  model?: string;
  original_query?: string;
  entity_type?: string;
  confidence?: number;
  note?: string;
  error?: string;
}

export interface EnhancedChatResponse {
  answer: string;
  sources: EnhancedChatSource[];
}

export async function sendEnhancedChatMessage(query: string, user_id: string = 'local-user-1'): Promise<EnhancedChatResponse> {
  // POST to backend /enhanced-chat endpoint
  const backendUrl = API_CONFIG.BACKEND_URL || 'http://localhost:5001/enhanced-chat';
  const response = await axios.post(backendUrl, { query, user_id });
  return response.data;
}

// Safe parse summary function
export function safeParseSummary(text: string): any {
  try {
    let jsonString = text.trim();
    // Remove markdown code block formatting if present
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    const parsed = JSON.parse(jsonString);
    
    // Ensure all required properties exist with defaults
    return {
      title: parsed.title || 'Untitled Summary',
      keyPoints: parsed.keyPoints || [],
      actionItems: parsed.actionItems || [],
      participants: parsed.participants || [],
      tags: parsed.tags || [],
      summary: parsed.summary || text,
      ...parsed // Include any other properties
    };
  } catch (error) {
    console.error('Error parsing summary:', error);
    // Return a fallback object if parsing fails
    return {
      title: 'Summary',
      keyPoints: [text.substring(0, 100) + '...'],
      actionItems: [],
      participants: [],
      tags: [],
      summary: text
    };
  }
}

// Summarize text function (placeholder - can be enhanced later)
export async function summarizeText(text: string): Promise<string> {
  try {
    // Use the dedicated summary endpoint - extract base URL without /enhanced-chat
    const fullBackendUrl = API_CONFIG.BACKEND_URL || 'http://localhost:5001/enhanced-chat';
    const baseUrl = fullBackendUrl.replace('/enhanced-chat', '');
    const response = await axios.post(`${baseUrl}/generate-summary`, { 
      text: text 
    });
    
    if (response.data && response.data.summary) {
      return response.data.summary;
    } else {
      throw new Error('Invalid response from summary service');
    }
  } catch (error) {
    console.error('Error summarizing text:', error);
    // Return a properly formatted JSON response instead of plain text
    return JSON.stringify({
      title: 'Summary',
      keyPoints: ['Unable to generate summary at this time due to service issues.'],
      actionItems: [],
      participants: [],
      tags: ['error'],
      summary: 'The summary service is currently unavailable. Please try again later.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}