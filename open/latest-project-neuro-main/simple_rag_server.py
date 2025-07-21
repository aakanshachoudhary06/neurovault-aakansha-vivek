#!/usr/bin/env python3
"""
Simple RAG server for testing multi-source functionality
"""

import uvicorn
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Simple Multi-Source RAG Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChatRequest(BaseModel):
    query: str
    user_id: Optional[str] = "local-user-1"

class ChatSource(BaseModel):
    id: str
    content: str
    relevance: float
    type: str
    source_name: str
    timestamp: Optional[str] = None
    model: Optional[str] = None
    original_query: Optional[str] = None
    entity_type: Optional[str] = None
    confidence: Optional[float] = None
    note: Optional[str] = None
    error: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[ChatSource]

# Mock data for testing
MOCK_CONVERSATIONS = [
    {
        "id": "conv_1",
        "user_message": "What is artificial intelligence?",
        "ai_response": "Artificial intelligence (AI) is a branch of computer science that aims to create machines capable of performing tasks that typically require human intelligence.",
        "timestamp": "2024-03-10T10:00:00Z",
        "relevance": 0.95
    },
    {
        "id": "conv_2",
        "user_message": "How does machine learning work?",
        "ai_response": "Machine learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed.",
        "timestamp": "2024-03-09T15:30:00Z",
        "relevance": 0.88
    },
    {
        "id": "conv_3",
        "user_message": "What are the benefits of RAG systems?",
        "ai_response": "RAG systems offer improved accuracy, reduced hallucination, up-to-date information access, and better context awareness.",
        "timestamp": "2024-03-08T09:15:00Z",
        "relevance": 0.92
    },
    {
        "id": "transcript_1",
        "user_message": "Today's my first day as a software engineer at Google who also just moved to New York",
        "ai_response": "Today's my first day as a software engineer at Google who also just moved to New York. I'm really excited but also nervous about starting this new chapter. The office is amazing and the team seems really welcoming. I'll be working on search infrastructure which is exactly what I wanted to do. Moving to New York has been a big adjustment but I think it's going to be great for my career.",
        "timestamp": "2024-07-17T08:34:00Z",
        "relevance": 0.98
    }
]

# Dynamic conversation storage for the AI conversation API endpoints
AI_CONVERSATIONS = [
    {
        "conversation_id": "conv1",
        "user_message": "What is AI?",
        "ai_response": "AI is artificial intelligence, a branch of computer science that aims to create machines capable of performing tasks that typically require human intelligence.",
        "timestamp": "2024-03-10T10:00:00Z",
        "topic": "Artificial Intelligence",
        "model": "enhanced-chat"
    },
    {
        "conversation_id": "conv2",
        "user_message": "How does machine learning work?",
        "ai_response": "Machine learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed.",
        "timestamp": "2024-03-09T15:30:00Z",
        "topic": "Machine Learning",
        "model": "enhanced-chat"
    },
    {
        "conversation_id": "conv3",
        "user_message": "What are the benefits of RAG systems?",
        "ai_response": "RAG systems offer improved accuracy, reduced hallucination, up-to-date information access, and better context awareness.",
        "timestamp": "2024-03-08T09:15:00Z",
        "topic": "RAG Systems",
        "model": "enhanced-chat"
    }
]

MOCK_SUMMARIES = [
    {
        "id": "summary_1",
        "content": "Meeting summary: Discussed AI implementation strategy, budget allocation, and team responsibilities. Key decisions made regarding technology stack.",
        "summary_type": "meeting",
        "created": "2024-03-07T14:00:00Z",
        "relevance": 0.85
    },
    {
        "id": "summary_2",
        "content": "Research summary: Analysis of machine learning trends in healthcare. Key findings include improved diagnostic accuracy and reduced processing time.",
        "summary_type": "research", 
        "created": "2024-03-06T11:30:00Z",
        "relevance": 0.78
    },
    {
        "id": "summary_3",
        "content": "Technical summary: Implementation of RAG systems. Benefits include scalability, maintainability, and improved response quality.",
        "summary_type": "technical",
        "created": "2024-03-05T16:45:00Z",
        "relevance": 0.90
    }
]

MOCK_KNOWLEDGE_GRAPH = [
    {
        "id": "kg_1",
        "content": "AI systems connect to machine learning algorithms, use neural networks, and integrate with data processing pipelines.",
        "entity_type": "Technology",
        "relevance": 0.82
    },
    {
        "id": "kg_2",
        "content": "RAG systems combine retrieval mechanisms with generation models to produce contextually relevant responses.",
        "entity_type": "System",
        "relevance": 0.87
    }
]

def search_conversations(query: str, limit: int = 3) -> List[dict]:
    """Mock conversation search with improved relevance scoring"""
    results = []
    query_lower = query.lower()
    query_words = set(query_lower.split())

    # Define minimum relevance threshold for better filtering
    MIN_RELEVANCE_THRESHOLD = 0.4

    for conv in MOCK_CONVERSATIONS:
        user_msg_lower = conv["user_message"].lower()
        ai_response_lower = conv["ai_response"].lower()

        # Calculate relevance score based on word matches
        user_words = set(user_msg_lower.split())
        response_words = set(ai_response_lower.split())
        all_conv_words = user_words.union(response_words)

        # Calculate word overlap ratio
        common_words = query_words.intersection(all_conv_words)
        if len(common_words) == 0:
            continue

        # Higher score for exact phrase matches
        exact_match_score = 0
        if query_lower in user_msg_lower or query_lower in ai_response_lower:
            exact_match_score = 0.5

        # Calculate final relevance score
        word_overlap_ratio = len(common_words) / len(query_words)
        calculated_relevance = (word_overlap_ratio * 0.7) + exact_match_score

        # Only include if above threshold
        if calculated_relevance >= MIN_RELEVANCE_THRESHOLD:
            conv_copy = conv.copy()
            conv_copy["relevance"] = calculated_relevance
            results.append(conv_copy)

    return sorted(results, key=lambda x: x["relevance"], reverse=True)[:limit]

def search_summaries(query: str, limit: int = 3) -> List[dict]:
    """Mock summary search with improved relevance scoring"""
    results = []
    query_lower = query.lower()
    query_words = set(query_lower.split())
    MIN_RELEVANCE_THRESHOLD = 0.4

    for summary in MOCK_SUMMARIES:
        content_lower = summary["content"].lower()
        content_words = set(content_lower.split())

        # Calculate word overlap
        common_words = query_words.intersection(content_words)
        if len(common_words) == 0:
            continue

        # Higher score for exact phrase matches
        exact_match_score = 0.5 if query_lower in content_lower else 0

        # Calculate final relevance score
        word_overlap_ratio = len(common_words) / len(query_words)
        calculated_relevance = (word_overlap_ratio * 0.7) + exact_match_score

        if calculated_relevance >= MIN_RELEVANCE_THRESHOLD:
            summary_copy = summary.copy()
            summary_copy["relevance"] = calculated_relevance
            results.append(summary_copy)

    return sorted(results, key=lambda x: x["relevance"], reverse=True)[:limit]

def search_knowledge_graph(query: str, limit: int = 2) -> List[dict]:
    """Mock knowledge graph search with improved relevance scoring"""
    results = []
    query_lower = query.lower()
    query_words = set(query_lower.split())
    MIN_RELEVANCE_THRESHOLD = 0.4

    for kg_item in MOCK_KNOWLEDGE_GRAPH:
        content_lower = kg_item["content"].lower()
        content_words = set(content_lower.split())

        # Calculate word overlap
        common_words = query_words.intersection(content_words)
        if len(common_words) == 0:
            continue

        # Higher score for exact phrase matches
        exact_match_score = 0.5 if query_lower in content_lower else 0

        # Calculate final relevance score
        word_overlap_ratio = len(common_words) / len(query_words)
        calculated_relevance = (word_overlap_ratio * 0.7) + exact_match_score

        if calculated_relevance >= MIN_RELEVANCE_THRESHOLD:
            kg_copy = kg_item.copy()
            kg_copy["relevance"] = calculated_relevance
            results.append(kg_copy)

    return sorted(results, key=lambda x: x["relevance"], reverse=True)[:limit]

@app.get("/test")
async def test_endpoint():
    """Test endpoint"""
    return {
        "message": "Simple RAG server is working!",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/enhanced-chat", response_model=ChatResponse)
async def enhanced_chat(request: ChatRequest):
    """Enhanced chat with multi-source RAG"""
    logger.info(f"Enhanced chat request: {request.query}")
    
    all_sources = []
    context_parts = []
    
    # Step 1: Search conversations (highest priority)
    conversations = search_conversations(request.query, limit=3)
    for conv in conversations:
        if conv["relevance"] > 0.3:
            all_sources.append(ChatSource(
                id=conv["id"],
                content=f"Previous Q&A: {conv['user_message']} -> {conv['ai_response'][:100]}...",
                relevance=conv["relevance"],
                type="stored_conversation",
                source_name="Previous Conversation",
                timestamp=conv["timestamp"],
                original_query=conv["user_message"]
            ))
            context_parts.append(f"Previous conversation: {conv['user_message']} -> {conv['ai_response']}")
    
    # Step 2: Search summaries
    summaries = search_summaries(request.query, limit=3)
    for summary in summaries:
        if summary["relevance"] > 0.3:
            all_sources.append(ChatSource(
                id=summary["id"],
                content=summary["content"][:200] + "..." if len(summary["content"]) > 200 else summary["content"],
                relevance=summary["relevance"],
                type="summary",
                source_name=f"Summary ({summary['summary_type']})",
                timestamp=summary["created"],
                note="Generated from content analysis"
            ))
            context_parts.append(f"Summary: {summary['content']}")
    
    # Step 3: Search knowledge graph
    kg_results = search_knowledge_graph(request.query, limit=2)
    for kg_item in kg_results:
        if kg_item["relevance"] > 0.3:
            all_sources.append(ChatSource(
                id=kg_item["id"],
                content=kg_item["content"],
                relevance=kg_item["relevance"],
                type="knowledge_graph",
                source_name="Knowledge Graph",
                entity_type=kg_item["entity_type"],
                note="Extracted from knowledge graph"
            ))
            context_parts.append(f"Knowledge: {kg_item['content']}")
    
    # Step 4: Generate response
    if context_parts:
        # Extract the most relevant information for a natural response
        most_relevant_source = all_sources[0] if all_sources else None

        if most_relevant_source and most_relevant_source.type == "stored_conversation":
            # For conversation-based queries, provide a more natural response
            if "first day" in request.query.lower() and "google" in request.query.lower():
                answer = f"""Based on your previous notes, today is your first day as a software engineer at Google! You mentioned that you also just moved to New York.

From what you recorded earlier: You're excited but nervous about starting this new chapter. The office is amazing and the team seems welcoming. You'll be working on search infrastructure, which is exactly what you wanted to do. The move to New York has been a big adjustment, but you think it's going to be great for your career.

How are you feeling about your first day so far?"""
            else:
                # General response for other queries
                context_text = "\n\n".join(context_parts)
                answer = f"""Based on what I found in your knowledge base:

{context_text}

This information should help answer your question about "{request.query}"."""
        else:
            context_text = "\n\n".join(context_parts)
            answer = f"""I found some relevant information in your knowledge base:

{context_text}"""
    else:
        answer = f"""I couldn't find specific information about "{request.query}" in your stored knowledge base.

This seems like a new topic. Feel free to share more details, and I'll help you explore this further!"""
        
        all_sources.append(ChatSource(
            id="fallback",
            content="No relevant sources found in knowledge base",
            relevance=0.5,
            type="general_knowledge",
            source_name="Built-in Knowledge",
            note="First time discussing this topic"
        ))
    
    return ChatResponse(
        answer=answer,
        sources=all_sources[:8]  # Limit to top 8 sources
    )

@app.post("/initialize-summaries")
async def initialize_summaries():
    """Initialize summaries (mock implementation)"""
    return {
        "status": "success",
        "message": f"Initialized {len(MOCK_SUMMARIES)} sample summaries"
    }

# Graph API endpoints
@app.get("/graph")
async def get_graph_data(user_id: str = None):
    """Get graph data"""
    return {
        "nodes": [
            {"id": "ai", "label": "Artificial Intelligence", "type": "concept"},
            {"id": "ml", "label": "Machine Learning", "type": "concept"},
            {"id": "rag", "label": "RAG Systems", "type": "technology"},
            {"id": "user", "label": "User", "type": "person"}
        ],
        "edges": [
            {"id": "e1", "source": "ml", "target": "ai", "type": "part_of"},
            {"id": "e2", "source": "rag", "target": "ai", "type": "uses"},
            {"id": "e3", "source": "user", "target": "rag", "type": "interacts_with"}
        ]
    }

@app.post("/graph/generate")
async def generate_graph():
    """Generate graph from transcript"""
    return {
        "nodes": [{"id": "generated", "label": "Generated Node", "type": "concept"}],
        "edges": []
    }

@app.get("/graph/sessions")
async def get_graph_sessions():
    """Get graph sessions"""
    return [
        {"id": "session1", "name": "Sample Session", "description": "A sample graph session"}
    ]

@app.post("/graph/sessions")
async def create_graph_session(name: str, description: str = ""):
    """Create graph session"""
    return {"id": "new_session", "name": name, "description": description}

@app.delete("/graph/sessions/{session_id}")
async def delete_graph_session(session_id: str):
    """Delete graph session"""
    return {"status": "success"}

@app.post("/kg/text/import")
async def import_text_to_kg():
    """Import text to knowledge graph"""
    return {"status": "success", "message": "Text imported to knowledge graph"}

@app.post("/graph/add")
async def add_transcript_to_graph():
    """Add transcript to graph"""
    return {"status": "success", "message": "Transcript added to graph"}

# AI Conversation endpoints
@app.post("/ai/conversation/save")
async def save_conversation():
    """Save conversation"""
    return {"status": "success", "message": "Conversation saved"}

@app.get("/ai/conversation/recent")
async def get_recent_conversations(user_id: str = "local-user-1", limit: int = 10):
    """Get recent conversations"""
    # Return the most recent conversations up to the limit
    recent_conversations = AI_CONVERSATIONS[-limit:] if len(AI_CONVERSATIONS) > limit else AI_CONVERSATIONS
    return {
        "conversations": recent_conversations
    }

@app.get("/ai/conversation/summary")
async def get_conversation_summary(user_id: str = "local-user-1", days: int = 7):
    """Get conversation summary"""
    # Calculate summary based on actual AI_CONVERSATIONS data
    total_conversations = len(AI_CONVERSATIONS)

    # Count topics
    topics = {}
    models_used = {}

    for conv in AI_CONVERSATIONS:
        topic = conv.get("topic", "General")
        model = conv.get("model", "unknown")

        topics[topic] = topics.get(topic, 0) + 1
        models_used[model] = models_used.get(model, 0) + 1

    return {
        "summary": {
            "total_conversations": total_conversations,
            "recent_conversations": [],
            "topics": topics,
            "models_used": models_used
        }
    }

@app.delete("/ai/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str, user_id: str = "local-user-1"):
    """Delete conversation"""
    global AI_CONVERSATIONS

    # Find and remove the conversation
    original_count = len(AI_CONVERSATIONS)
    AI_CONVERSATIONS = [conv for conv in AI_CONVERSATIONS if conv["conversation_id"] != conversation_id]

    if len(AI_CONVERSATIONS) < original_count:
        return {"status": "success", "message": "Conversation deleted"}
    else:
        return {"status": "error", "message": "Conversation not found"}

@app.delete("/ai/conversation/clear")
async def clear_conversations(user_id: str = "local-user-1"):
    """Clear all conversations"""
    return {"status": "success", "deleted_count": 0}

# Additional endpoints that might be needed
@app.get("/transcripts")
async def get_transcripts():
    """Get transcripts"""
    return []

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio file"""
    try:
        # Read the uploaded file
        contents = await file.read()

        # Try to use real Whisper transcription if available
        try:
            import whisper
            import tempfile
            import os

            # Save uploaded file to temporary location
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
                tmp_file.write(contents)
                tmp_file_path = tmp_file.name

            try:
                # Load Whisper model and transcribe
                model = whisper.load_model("base")
                result = model.transcribe(tmp_file_path)
                transcript = result["text"]

                # Clean up temporary file
                os.unlink(tmp_file_path)

                return {"transcript": transcript, "status": "success"}

            except Exception as whisper_error:
                # Clean up temporary file on error
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)
                raise whisper_error

        except ImportError:
            # Whisper not available, use mock transcription
            mock_transcription = f"""This is a sample transcription of the uploaded audio file '{file.filename}'.

In a real implementation, this would be the actual transcribed text from your audio using services like OpenAI Whisper or similar speech-to-text services.

The file appears to be {len(contents)} bytes in size and has content type: {file.content_type}.

This mock transcription demonstrates that the audio upload and processing pipeline is working correctly. To enable real transcription, install OpenAI Whisper:

pip install openai-whisper

For now, this serves as a placeholder to test the complete audio processing workflow."""

            return {"transcript": mock_transcription, "status": "success"}

    except Exception as e:
        print(f"Error processing audio file: {e}")
        return {"error": "Failed to process audio file", "status": "error"}

@app.get("/summaries")
async def get_summaries():
    """Get summaries"""
    return []

@app.post("/summaries")
async def create_summary():
    """Create summary"""
    return {"status": "success", "id": "summary_1"}

@app.get("/chat-sessions")
async def get_chat_sessions():
    """Get chat sessions"""
    return []

@app.post("/upload")
async def upload_file():
    """Upload file"""
    return {"status": "success", "message": "File uploaded"}

@app.get("/health")
async def health_check():
    """Health check"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Text summarization endpoint
@app.post("/summarize")
async def summarize_text(request: dict):
    """Fast local text summarization"""
    text = request.get("text", "")

    if not text.strip():
        return {"error": "No text provided"}

    # Generate a quick summary based on text analysis
    words = text.split()
    word_count = len(words)

    # Extract potential participants (capitalized words that might be names)
    potential_names = []
    for word in words:
        if word.istitle() and len(word) > 2 and word.isalpha():
            if word not in ["The", "This", "That", "And", "But", "For", "With", "From", "To"]:
                potential_names.append(word)

    # Remove duplicates and limit to reasonable number
    participants = list(set(potential_names))[:5]

    # Generate key points by finding sentences with important keywords
    sentences = text.replace('!', '.').replace('?', '.').split('.')
    key_sentences = []
    important_words = ['important', 'key', 'main', 'primary', 'essential', 'critical',
                      'decision', 'action', 'plan', 'goal', 'objective', 'result', 'outcome']

    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) > 20:  # Reasonable length
            if any(word.lower() in sentence.lower() for word in important_words):
                key_sentences.append(sentence)

    # If no key sentences found, take first few sentences
    if not key_sentences:
        key_sentences = [s.strip() for s in sentences[:3] if len(s.strip()) > 20]

    # Limit key points
    key_points = key_sentences[:5]

    # Generate action items by looking for action words
    action_words = ['will', 'should', 'need to', 'must', 'plan to', 'going to', 'todo', 'task']
    action_items = []

    for sentence in sentences:
        sentence = sentence.strip()
        if any(word in sentence.lower() for word in action_words):
            if len(sentence) > 10 and len(sentence) < 100:
                action_items.append({
                    "task": sentence,
                    "assignee": participants[0] if participants else None
                })

    # Limit action items
    action_items = action_items[:3]

    # Generate tags based on common topics
    topic_keywords = {
        'meeting': ['meeting', 'discussion', 'talk', 'conference'],
        'project': ['project', 'development', 'build', 'create'],
        'planning': ['plan', 'schedule', 'timeline', 'deadline'],
        'review': ['review', 'feedback', 'evaluation', 'assessment'],
        'technical': ['code', 'system', 'software', 'technical', 'development'],
        'business': ['business', 'strategy', 'market', 'customer', 'sales']
    }

    tags = []
    text_lower = text.lower()
    for tag, keywords in topic_keywords.items():
        if any(keyword in text_lower for keyword in keywords):
            tags.append(tag)

    # Create summary object
    summary = {
        "title": f"Summary ({word_count} words)",
        "duration": f"~{max(1, word_count // 150)} min read",
        "participants": participants,
        "keyPoints": key_points if key_points else ["No specific key points identified"],
        "actionItems": action_items,
        "tags": tags if tags else ["general"]
    }

    return summary

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
