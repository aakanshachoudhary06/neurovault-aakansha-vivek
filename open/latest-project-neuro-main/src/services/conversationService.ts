/**
 * AI Conversation Service for saving and retrieving chat interactions
 */

const API_BASE_URL = 'http://localhost:5001';

export interface ConversationData {
  user_message: string;
  ai_response: string;
  user_id?: string;
  topic?: string;
  model?: string;
  session_id?: string;
}

export interface ConversationSummary {
  conversation_id: string;
  user_message: string;
  ai_response: string;
  timestamp: string;
  topic: string;
  model: string;
  full_text?: string;
  similarity_score?: number;
}

export interface ConversationSummaryResponse {
  total_conversations: number;
  recent_conversations: ConversationSummary[];
  topics: Record<string, number>;
  models_used: Record<string, number>;
  time_range: string;
}

/**
 * Auto-save conversation after AI response
 */
export async function autoSaveConversation(
  userMessage: string,
  aiResponse: string,
  options: {
    userId?: string;
    topic?: string;
    model?: string;
    sessionId?: string;
  } = {}
): Promise<void> {
  try {
    // Only save if both messages have content
    if (!userMessage.trim() || !aiResponse.trim()) {
      return;
    }

    // Skip saving initial welcome messages
    if (userMessage.includes('Psst... This room') || 
        aiResponse.includes('Psst... This room') ||
        aiResponse.includes('NeuroVault Chat is your personal memory loop')) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/ai/conversation/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_message: userMessage,
        ai_response: aiResponse,
        user_id: options.userId || 'local-user-1',
        topic: options.topic || 'general',
        model: options.model || 'llama3.1:8b',
        session_id: options.sessionId || `session_${Date.now()}`
      }),
    });

    if (response.ok) {
      console.log('💾 Conversation auto-saved to Chroma');
    }
  } catch (error) {
    // Don't throw error for auto-save failures
    console.warn('⚠️ Auto-save failed (non-critical):', error);
  }
}

/**
 * Get recent conversations for memory page
 */
export async function getRecentConversations(
  userId: string = 'local-user-1',
  limit: number = 10
): Promise<ConversationSummary[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/ai/conversation/recent?user_id=${userId}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.conversations || [];
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    return [];
  }
}

/**
 * Get conversation summary for memory page
 */
export async function getConversationSummary(
  userId: string = 'local-user-1',
  days: number = 7
): Promise<ConversationSummaryResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/ai/conversation/summary?user_id=${userId}&days=${days}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.summary;
  } catch (error) {
    console.error('❌ Error fetching conversation summary:', error);
    return {
      total_conversations: 0,
      recent_conversations: [],
      topics: {},
      models_used: {},
      time_range: `Last ${days} days`
    };
  }
}

/**
 * Delete a specific conversation
 */
export async function deleteConversation(
  conversationId: string,
  userId: string = 'local-user-1'
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/ai/conversation/${conversationId}?user_id=${userId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('🗑️ Conversation deleted successfully');
    return result.status === 'success';
  } catch (error) {
    console.error('❌ Error deleting conversation:', error);
    return false;
  }
}

/**
 * Clear all conversations for a user
 */
export async function clearAllConversations(
  userId: string = 'local-user-1'
): Promise<number> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/ai/conversation/clear?user_id=${userId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`🗑️ Cleared ${result.count} conversations`);
    return result.count;
  } catch (error) {
    console.error('❌ Error clearing conversations:', error);
    return 0;
  }
}
