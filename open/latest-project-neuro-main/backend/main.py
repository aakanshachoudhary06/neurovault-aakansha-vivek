import logging
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from routers.api_router import router as api_router
import PyPDF2
import io

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="NeuroVault Enhanced API",
    description="Enhanced API with RAG capabilities",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # More permissive for development
    allow_credentials=False,  # Set to False when using allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Pydantic models for enhanced chat
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

# Enhanced chat endpoint
@app.post("/enhanced-chat", response_model=ChatResponse)
async def enhanced_chat(request: ChatRequest):
    """Enhanced chat interface with RAG capabilities"""
    logger.info(f"Enhanced chat request: {request.query}")

    user_id = request.user_id or "local-user-1"
    all_sources = []
    context_parts = []

    # Step 1: Search stored AI conversations (highest priority)
    try:
        from services.ai_conversation_service import AIConversationService
        ai_service = AIConversationService()

        conversations = await ai_service.search_conversations(
            query=request.query,
            user_id=user_id,
            limit=3
        )

        if conversations:
            logger.info(f"Found {len(conversations)} relevant conversations")
            for i, conv in enumerate(conversations):
                similarity_score = conv.get('similarity_score', 0.5)
                context_parts.append(f"Previous conversation: Q: {conv['user_message']} A: {conv['ai_response']}")

                all_sources.append(ChatSource(
                    id=f"conversation_{i+1}",
                    content=conv['ai_response'][:200] + "..." if len(conv['ai_response']) > 200 else conv['ai_response'],
                    relevance=similarity_score,
                    type="stored_conversation",
                    source_name="Previous AI Conversation",
                    timestamp=conv.get('timestamp', ''),
                    model=conv.get('model', 'Unknown'),
                    original_query=conv['user_message'][:100] + "..." if len(conv['user_message']) > 100 else conv['user_message']
                ))
    except Exception as e:
        logger.warning(f"AI conversation search failed: {e}")

    # Step 2: Search summaries from vector database
    try:
        from services.summary_search_service import summary_search_service

        summaries = await summary_search_service.search_summaries(
            query=request.query,
            user_id=user_id,
            limit=3
        )

        for summary in summaries:
            if summary.get("relevance", 0) > 0.3:
                all_sources.append(ChatSource(
                    id=summary["id"],
                    content=summary["content"][:300] + "..." if len(summary["content"]) > 300 else summary["content"],
                    relevance=summary["relevance"],
                    type="summary",
                    source_name=f"Summary ({summary.get('summary_type', 'general')})",
                    timestamp=summary.get("created"),
                    note="Generated from previous content analysis"
                ))
                context_parts.append(f"Summary: {summary['content']}")

    except Exception as e:
        logger.warning(f"Summary search failed: {e}")

    # Step 3: Search knowledge graph (if available)
    try:
        from services.knowledge_graph_service import KnowledgeGraphService
        kg_service = KnowledgeGraphService()

        # Try to get relevant facts from knowledge graph
        kg_response = await kg_service.search_knowledge(request.query, limit=2)

        if kg_response and kg_response.get("facts"):
            for i, fact in enumerate(kg_response["facts"][:2]):
                all_sources.append(ChatSource(
                    id=f"kg_fact_{i}",
                    content=fact,
                    relevance=0.8 - (i * 0.1),
                    type="knowledge_graph",
                    source_name="Knowledge Graph",
                    note="Extracted from knowledge graph database"
                ))
                context_parts.append(f"Knowledge: {fact}")

    except Exception as e:
        logger.warning(f"Knowledge graph search failed: {e}")

    # Step 4: Generate enhanced response with context or fallback
    if context_parts:
        context_text = "\n\n".join(context_parts)

        # Use LLM to generate a comprehensive response if available
        try:
            from utils.llm_factory import get_llm_client
            llm_client = get_llm_client()

            system_prompt = """You are a helpful AI assistant with access to multiple knowledge sources including previous conversations, summaries, and knowledge graphs.

Use the provided context to give accurate, comprehensive answers. Synthesize information from different sources when relevant. 

**IMPORTANT FORMATTING REQUIREMENTS:**
- Use **bold** for important terms, concepts, and key points
- Use bullet points (•) for lists and multiple items
- Use numbered lists (1., 2., 3.) for sequential steps or ordered information
- Use italics for emphasis and subtle points
- Structure your response with clear sections using headers (## Section Name)
- Make your response visually appealing and easy to scan
- If the context doesn't fully answer the question, supplement with your general knowledge while clearly indicating what comes from the provided sources versus your general knowledge

**Example formatting:**
## Key Points
• **Important concept** - explanation
• **Another key point** - details

## Steps to Follow
1. **First step** - description
2. **Second step** - description

*Note: Additional context from general knowledge...*"""

            user_prompt = f"""Context from knowledge sources:
{context_text}

User question: {request.query}

Please provide a helpful, accurate response that makes use of the relevant context above. 

**Response Requirements:**
- Use the formatting guidelines from the system prompt
- Be specific about what information comes from the provided sources
- Structure your response with clear sections and bullet points
- Make it visually appealing and easy to read
- Use bold for key terms and important points"""

            answer = await llm_client.generate_response(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )

        except Exception as e:
            logger.warning(f"LLM generation failed, using fallback: {e}")
            # Fallback to simple context-based response
            answer = f"""Based on the information I found in your knowledge base:

{context_text}

Regarding your question "{request.query}": I found relevant information from your previous conversations, summaries, and knowledge base that should help answer your question."""
    else:
        # No relevant context found - provide general response
        answer = f"""I couldn't find specific information about "{request.query}" in your conversation history, summaries, or knowledge base.

However, I can provide a general response: This is a new topic for our conversation. I'll remember this interaction for future reference and it will be available for future queries."""

        all_sources.append(ChatSource(
            id="fallback",
            content="No previous conversations or summaries found",
            relevance=0.5,
            type="general_knowledge",
            source_name="Built-in Knowledge",
            note="First time discussing this topic"
        ))

    # Save this conversation for future reference
    try:
        from services.ai_conversation_service import AIConversationService
        ai_service = AIConversationService()
        await ai_service.save_conversation(
            user_message=request.query,
            ai_response=answer,
            user_id=user_id,
            conversation_context={
                "topic": "enhanced-chat",
                "session_id": f"session_{int(datetime.now().timestamp())}",
                "model": "enhanced-chat"
            }
        )
    except Exception as e:
        logger.warning(f"Failed to save conversation: {e}")

    return ChatResponse(answer=answer, sources=all_sources)

# Initialize summaries endpoint
@app.post("/initialize-summaries")
async def initialize_summaries():
    """Initialize summary search service with sample data"""
    try:
        from services.summary_search_service import summary_search_service
        await summary_search_service.migrate_sqlite_summaries()
        return {"message": "Summaries initialized successfully"}
    except Exception as e:
        logger.error(f"Failed to initialize summaries: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Summary generation endpoint
@app.post("/generate-summary")
async def generate_summary(request: dict):
    """Generate a summary from text using LLM with fallback"""
    try:
        text = request.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        from services.llm_service import summarize_with_llm, create_simple_summary
        
        # Try LLM first, fallback to simple summary
        try:
            summary = await summarize_with_llm([text])
            return {"summary": summary}
        except Exception as e:
            logger.warning(f"LLM summary failed, using fallback: {e}")
            summary = create_simple_summary(text)
            return {"summary": summary, "fallback": True}
            
    except Exception as e:
        logger.error(f"Failed to generate summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Audio transcript indexing endpoint
@app.post("/index-audio-transcript")
async def index_audio_transcript(request: dict):
    """Index an audio transcript for enhanced chat search"""
    try:
        transcript = request.get("transcript", "")
        user_id = request.get("user_id", "local-user-1")
        audio_name = request.get("audio_name", "Unknown Audio")
        
        if not transcript:
            raise HTTPException(status_code=400, detail="Transcript is required")
        
        # Index the transcript in the AI conversation service
        from services.ai_conversation_service import AIConversationService
        ai_service = AIConversationService()
        
        # Create a conversation entry for the transcript
        conversation_id = await ai_service.save_conversation(
            user_message=f"Audio: {audio_name}",
            ai_response=transcript,
            user_id=user_id,
            conversation_context={
                "topic": "audio_transcript",
                "session_id": f"audio_{int(datetime.now().timestamp())}",
                "model": "audio_transcription",
                "audio_name": audio_name
            }
        )
        
        # Also index in summary service for better search
        from services.summary_search_service import summary_search_service
        summary_id = await summary_search_service.index_summary(
            content=transcript,
            user_id=user_id,
            summary_type="audio_transcript",
            metadata={
                "audio_name": audio_name,
                "source": "frontend_upload"
            }
        )
        
        return {
            "success": True,
            "conversation_id": conversation_id,
            "summary_id": summary_id,
            "message": f"Audio transcript '{audio_name}' indexed successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to index audio transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get all indexed audio transcripts
@app.get("/audio-transcripts")
async def get_audio_transcripts(user_id: str = "local-user-1"):
    """Get all indexed audio transcripts for a user"""
    try:
        from services.ai_conversation_service import AIConversationService
        ai_service = AIConversationService()
        
        conversations = await ai_service.get_recent_conversations(user_id, limit=50)
        
        # Filter for audio transcripts
        audio_transcripts = []
        for conv in conversations:
            if conv.get("topic") == "audio_transcript":
                audio_transcripts.append({
                    "id": conv.get("conversation_id"),
                    "audio_name": conv.get("audio_name", "Unknown"),
                    "transcript": conv.get("ai_response"),
                    "timestamp": conv.get("timestamp"),
                    "user_message": conv.get("user_message")
                })
        
        return {
            "transcripts": audio_transcripts,
            "count": len(audio_transcripts)
        }
        
    except Exception as e:
        logger.error(f"Failed to get audio transcripts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Test endpoint
@app.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    return {"message": "Enhanced API is working!", "timestamp": datetime.now().isoformat()}

# Include the API router
app.include_router(api_router)

@app.post("/extract-pdf-text")
async def extract_pdf_text(file: UploadFile = File(...)):
    """Extract text from an uploaded PDF file and return as JSON."""
    if not file.filename.lower().endswith('.pdf'):
        return {"error": "Only PDF files are supported."}
    try:
        contents = await file.read()
        reader = PyPDF2.PdfReader(io.BytesIO(contents))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return {"text": text.strip()}
    except Exception as e:
        return {"error": str(e)}

# Server startup code
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5001,
        reload=True,
        log_level="info"
    )
