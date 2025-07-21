/**
 * Utility to initialize knowledge base with sample data
 */

const BACKEND_URL = 'http://localhost:5001';

export interface InitializationResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Initialize summaries in the vector database
 */
export async function initializeSummaries(): Promise<InitializationResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/initialize-summaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (response.ok && result.status === 'success') {
      return {
        success: true,
        message: 'Summaries initialized successfully',
        details: result
      };
    } else {
      return {
        success: false,
        message: result.message || 'Failed to initialize summaries',
        details: result
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error initializing summaries: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}

/**
 * Save a sample conversation to test the system
 */
export async function saveSampleConversation(
  userMessage: string,
  aiResponse: string,
  userId: string = 'local-user-1'
): Promise<InitializationResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/ai/conversation/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_message: userMessage,
        ai_response: aiResponse,
        user_id: userId,
        topic: 'sample-data',
        model: 'initialization-script',
        session_id: `init_${Date.now()}`
      }),
    });

    const result = await response.json();
    
    if (response.ok && result.status === 'success') {
      return {
        success: true,
        message: 'Sample conversation saved successfully',
        details: result
      };
    } else {
      return {
        success: false,
        message: 'Failed to save sample conversation',
        details: result
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error saving conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}

/**
 * Initialize the complete knowledge base with sample data
 */
export async function initializeKnowledgeBase(): Promise<InitializationResult[]> {
  const results: InitializationResult[] = [];

  // 1. Initialize summaries
  console.log('🔄 Initializing summaries...');
  const summaryResult = await initializeSummaries();
  results.push(summaryResult);
  
  if (summaryResult.success) {
    console.log('✅ Summaries initialized');
  } else {
    console.error('❌ Failed to initialize summaries:', summaryResult.message);
  }

  // 2. Add sample conversations
  console.log('🔄 Adding sample conversations...');
  
  const sampleConversations = [
    {
      user: "What is artificial intelligence?",
      ai: "Artificial intelligence (AI) is a branch of computer science that aims to create machines capable of performing tasks that typically require human intelligence. This includes learning, reasoning, problem-solving, perception, and language understanding. AI systems can be categorized into narrow AI (designed for specific tasks) and general AI (theoretical systems with human-like cognitive abilities)."
    },
    {
      user: "How does machine learning work?",
      ai: "Machine learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed. It works by using algorithms to analyze data, identify patterns, and make predictions or decisions. The process typically involves training a model on a dataset, validating its performance, and then using it to make predictions on new, unseen data. Common types include supervised learning, unsupervised learning, and reinforcement learning."
    },
    {
      user: "What are the benefits of RAG systems?",
      ai: "Retrieval-Augmented Generation (RAG) systems offer several key benefits: 1) Improved accuracy by grounding responses in relevant retrieved information, 2) Reduced hallucination by providing factual context, 3) Up-to-date information access through dynamic retrieval, 4) Better context awareness by incorporating relevant background knowledge, 5) Transparency through source attribution, and 6) Scalability by separating knowledge storage from generation."
    },
    {
      user: "How do vector databases work?",
      ai: "Vector databases store and retrieve data based on vector embeddings, which are numerical representations of data in high-dimensional space. They work by: 1) Converting data (text, images, etc.) into vectors using embedding models, 2) Storing these vectors with efficient indexing structures, 3) Performing similarity searches using distance metrics like cosine similarity, 4) Returning the most relevant results based on vector proximity. This enables semantic search capabilities that understand meaning rather than just keyword matching."
    }
  ];

  for (const conv of sampleConversations) {
    const convResult = await saveSampleConversation(conv.user, conv.ai);
    results.push(convResult);
    
    if (convResult.success) {
      console.log(`✅ Saved conversation: "${conv.user.substring(0, 30)}..."`);
    } else {
      console.error(`❌ Failed to save conversation: ${convResult.message}`);
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Check if the knowledge base is properly initialized
 */
export async function checkKnowledgeBaseStatus(): Promise<{
  conversations: boolean;
  summaries: boolean;
  knowledgeGraph: boolean;
}> {
  const status = {
    conversations: false,
    summaries: false,
    knowledgeGraph: false
  };

  try {
    // Check conversations
    const convResponse = await fetch(`${BACKEND_URL}/ai/conversation/recent?user_id=local-user-1&limit=1`);
    if (convResponse.ok) {
      const convData = await convResponse.json();
      status.conversations = convData.conversations && convData.conversations.length > 0;
    }
  } catch (error) {
    console.warn('Could not check conversation status:', error);
  }

  try {
    // Check if backend is responding (proxy for other services)
    const testResponse = await fetch(`${BACKEND_URL}/test`);
    status.summaries = testResponse.ok;
    status.knowledgeGraph = testResponse.ok;
  } catch (error) {
    console.warn('Could not check backend status:', error);
  }

  return status;
}

/**
 * Display initialization progress
 */
export function displayInitializationProgress(results: InitializationResult[]): void {
  console.log('\n📊 Knowledge Base Initialization Results:');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  let totalCount = results.length;
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.message}`);
    
    if (result.success) {
      successCount++;
    } else if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  });
  
  console.log('=' .repeat(50));
  console.log(`📈 Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
  
  if (successCount === totalCount) {
    console.log('🎉 Knowledge base initialization completed successfully!');
  } else {
    console.log('⚠️  Some initialization steps failed. Check the details above.');
  }
}
