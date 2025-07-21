export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: ChatSource[];
}

export interface ChatSource {
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

export interface ChatResponse {
  message: string;
  sources?: ChatSource[];
  error?: string;
}

export interface StreamingChatResponse {
  content: string;
  sources?: ChatSource[];
  done: boolean;
  error?: string;
}

class EnhancedChatService {
  private apiUrl: string;

  constructor() {
    // Initialize API URL
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  }

  async sendMessage(
    message: string, 
    conversationHistory: ChatMessage[],
    onStream?: (chunk: StreamingChatResponse) => void
  ): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/enhanced-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
          user_id: "local-user-1"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // If streaming is requested, simulate streaming by chunking the response
      if (onStream) {
        const words = data.answer.split(' ');
        let accumulatedContent = '';
        
        for (let i = 0; i < words.length; i++) {
          accumulatedContent += (i > 0 ? ' ' : '') + words[i];
          
          // Send chunk with progress
          onStream({
            content: accumulatedContent,
            sources: data.sources,
            done: i === words.length - 1
          });
          
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      return {
        message: data.answer,
        sources: data.sources
      };
    } catch (error) {
      console.error('Enhanced Chat API error:', error);
      return {
        message: '',
        error: error instanceof Error ? error.message : 'Failed to get response from AI'
      };
    }
  }

  // Helper method to format sources for display
  formatSources(sources: ChatSource[]): string {
    if (!sources || sources.length === 0) return '';
    
    return sources.map((source, index) => {
      const relevance = Math.round(source.relevance * 100);
      const content = source.content.length > 150 
        ? source.content.substring(0, 150) + '...' 
        : source.content;
      
      return `**${index + 1}. ${source.source_name}** (${relevance}% relevant)\n${content}`;
    }).join('\n\n');
  }

  // Helper method to format the AI response with better styling
  formatResponse(response: string, sources?: ChatSource[]): string {
    let formattedResponse = response;
    
    // Add source references if available
    if (sources && sources.length > 0) {
      formattedResponse += '\n\n---\n\n**Sources Used:**\n' + this.formatSources(sources);
    }
    
    return formattedResponse;
  }

  // Helper method to check if service is available
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/test`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const enhancedChatService = new EnhancedChatService(); 