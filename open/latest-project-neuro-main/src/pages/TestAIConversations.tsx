import React, { useState, useEffect } from 'react';
import { getRecentConversations, getConversationSummary, deleteConversation, ConversationSummary, ConversationSummaryResponse } from '../services/conversationService';

const TestAIConversations: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [summary, setSummary] = useState<ConversationSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading AI conversations...');
      const [conversationsData, summaryData] = await Promise.all([
        getRecentConversations('local-user-1', 10),
        getConversationSummary('local-user-1', 7)
      ]);
      
      console.log('✅ Conversations loaded:', conversationsData);
      console.log('✅ Summary loaded:', summaryData);
      
      setConversations(conversationsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (conversationId: string) => {
    try {
      console.log('🗑️ Deleting conversation:', conversationId);
      const success = await deleteConversation(conversationId, 'local-user-1');
      console.log('🗑️ Delete result:', success);
      
      if (success) {
        await loadData(); // Reload data
      } else {
        alert('Failed to delete conversation');
      }
    } catch (err) {
      console.error('❌ Error deleting conversation:', err);
      alert('Error deleting conversation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">AI Conversations Test</h1>
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">AI Conversations Test</h1>
          <div className="text-red-400">Error: {error}</div>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">AI Conversations Test</h1>
        
        <div className="mb-8 p-4 bg-black/20 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Summary</h2>
          <div className="text-white">
            <p>Total Conversations: {summary?.total_conversations || 0}</p>
            <p>Topics: {JSON.stringify(summary?.topics || {})}</p>
            <p>Models: {JSON.stringify(summary?.models_used || {})}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Conversations ({conversations.length})</h2>
          
          {conversations.length === 0 ? (
            <div className="text-white/60">No conversations found</div>
          ) : (
            conversations.map((conversation) => (
              <div key={conversation.conversation_id} className="p-4 bg-black/20 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-white font-medium">{conversation.topic}</h3>
                  <div className="text-white/60 text-sm">{conversation.timestamp}</div>
                </div>
                
                <div className="mb-2">
                  <div className="text-blue-400 text-sm">User: {conversation.user_message}</div>
                  <div className="text-green-400 text-sm">AI: {conversation.ai_response}</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-white/60 text-sm">Model: {conversation.model}</div>
                  <button
                    onClick={() => handleDelete(conversation.conversation_id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <button 
          onClick={loadData}
          className="mt-8 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default TestAIConversations;
