export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  error?: string;
}

class ChatService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.apiUrl = import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1';
    this.model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  private async makeRequest(messages: Array<{ role: string; content: string }>): Promise<ChatResponse> {
    if (!this.apiKey) {
      return {
        message: '',
        error: 'OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.'
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a helpful AI assistant for a project called "Neuro" - an AI-powered workspace. 
              You help users with their tasks, answer questions about their data, and provide intelligent insights. 
              Be concise, helpful, and professional. If you don't know something, say so rather than making things up.`
            },
            ...messages
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        message: data.choices[0]?.message?.content || 'No response from AI'
      };
    } catch (error) {
      console.error('Chat API error:', error);
      return {
        message: '',
        error: error instanceof Error ? error.message : 'Failed to get response from AI'
      };
    }
  }

  async sendMessage(message: string, conversationHistory: ChatMessage[]): Promise<ChatResponse> {
    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    messages.push({
      role: 'user',
      content: message
    });

    return this.makeRequest(messages);
  }

  // Helper method to check if API key is configured
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // Helper method to get configuration status
  getConfigStatus(): { configured: boolean; model: string; hasApiKey: boolean } {
    return {
      configured: this.isConfigured(),
      model: this.model,
      hasApiKey: !!this.apiKey
    };
  }
}

export const chatService = new ChatService(); 