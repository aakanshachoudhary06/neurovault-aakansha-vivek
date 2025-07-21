from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Body, Query, WebSocket
from models.transcript import Transcript, TranscriptCreate, Summary, Graph, GraphNode, GraphEdge, GraphSession
from models.knowledge_graph import (
    HealthResponse, ChatRequest, ChatResponse, TextImportRequest, URLImportRequest,
    FileUploadResponse, LLMStatusResponse, MultimediaStatusResponse, ImportResponse, DebugResponse
)
from services.transcribe_service import transcribe_audio
from services.db_service import get_db, insert_transcript, get_all_transcripts
from services.llm_service import summarize_with_llm
from services.graph_service import graph_service
from services.knowledge_graph_service import KnowledgeGraphService
from datetime import datetime
from typing import List
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize knowledge graph service
kg_service = KnowledgeGraphService()


@router.get("/ping")
def ping():
    return {"message": "pong"}

@router.get("/test-graph")
def test_graph():
    print("Test graph endpoint called!")
    return {
        "nodes": [
            {"id": "test1", "label": "Test Node 1", "type": "TEST"},
            {"id": "test2", "label": "Test Node 2", "type": "TEST"}
        ],
        "edges": [
            {"id": "e1", "source": "test1", "target": "test2", "type": "CONNECTS", "weight": 1.0}
        ]
    }


@router.get("/test-cors")
def test_cors():
    return {"message": "CORS is working!", "timestamp": datetime.utcnow()}


@router.post("/transcribe", response_model=Transcript)
def transcribe(file: UploadFile = File(...)):
    transcript_text = transcribe_audio(file)
    return Transcript(id=None, user_id=None, transcript=transcript_text, timestamp=datetime.utcnow())


@router.post("/store", response_model=Transcript)
def store_transcript(data: TranscriptCreate, db=Depends(get_db)):
    transcript = insert_transcript(db, data)
    return transcript


@router.get("/summarize", response_model=Summary)
async def summarize(db=Depends(get_db)):
    transcripts = get_all_transcripts(db)
    all_texts = [t.transcript for t in transcripts]
    if not all_texts:
        return Summary(summary="No transcripts available.")
    summary_text = await summarize_with_llm(all_texts)
    return Summary(summary=summary_text)


@router.get("/graph", response_model=Graph)
async def graph(user_id: str = Query(None), db=Depends(get_db)):
    try:
        # Get graph data from KnowledgeGraphService (supports clear/delete operations)
        print(f"Getting graph data for user_id: {user_id}")
        graph_data = kg_service.get_combined_graph_data()
        print(f"Graph data received: {len(graph_data.get('nodes', []))} nodes, {len(graph_data.get('edges', []))} edges")
        return Graph(nodes=graph_data['nodes'], edges=graph_data['edges'])
    except Exception as e:
        print(f"Error in graph endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class GraphGenerateRequest(BaseModel):
    transcript_text: str
    transcript_id: int = None


@router.post("/graph/generate")
async def generate_graph_from_text(request: GraphGenerateRequest):
    """Generate a knowledge graph from transcript text using Graphiti"""
    try:
        print(f"🎯 /graph/generate called with transcript_id: {request.transcript_id}, text length: {len(request.transcript_text)}")
        # Use local-user-1 as default user_id for now
        result = await kg_service.generate_graph_from_text(
            request.transcript_text, request.transcript_id, user_id="local-user-1")
        print(f"✅ Graph generation completed: {result}")
        return result
    except Exception as e:
        print(f"❌ Error generating graph from text: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/graph/generate/{transcript_id}")
def generate_graph_from_transcript(transcript_id: int):
    """Generate a knowledge graph from a specific transcript (deprecated - use /graph/generate with text)"""
    try:
        result = graph_service.generate_graph_from_transcript(transcript_id)
        if 'error' in result:
            raise HTTPException(status_code=404, detail=result['error'])
        return result
    except Exception as e:
        print(
            f"Error generating graph for transcript {transcript_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/sessions", response_model=List[GraphSession])
def get_graph_sessions():
    """Get all graph sessions"""
    try:
        sessions = graph_service.get_graph_sessions()
        return sessions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/graph/sessions", response_model=GraphSession)
def create_graph_session(name: str, description: str = ""):
    """Create a new graph session"""
    try:
        session_id = graph_service.create_graph_session(name, description)
        return GraphSession(
            id=session_id,
            name=name,
            description=description
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/graph/sessions/{session_id}")
def delete_graph_session(session_id: str):
    """Delete a graph session"""
    try:
        success = graph_service.delete_graph_session(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"message": "Session deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Knowledge Graph API endpoints

@router.get("/kg/health", response_model=HealthResponse)
async def kg_health_check():
    """Knowledge graph health check endpoint"""
    try:
        result = await kg_service.health_check()
        return HealthResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kg/llm/status", response_model=LLMStatusResponse)
async def kg_llm_status():
    """Get LLM configuration status"""
    try:
        from utils.llm_factory import get_llm_client
        llm_client = get_llm_client()

        return LLMStatusResponse(
            provider=llm_client.provider,
            model=llm_client.model_name,
            status="healthy",
            available=True
        )
    except Exception as e:
        return LLMStatusResponse(
            provider="unknown",
            model="unknown",
            status="error",
            available=False
        )


@router.get("/kg/multimedia/status", response_model=MultimediaStatusResponse)
async def kg_multimedia_status():
    """Get multimedia processing capabilities status"""
    try:
        from backend.utils.multimedia_processor import MultimediaProcessor
        processor = MultimediaProcessor()
        status = processor.get_support_status()
        return MultimediaStatusResponse(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kg/files/upload", response_model=FileUploadResponse)
async def kg_upload_file(file: UploadFile = File(...)):
    """Upload and process files for knowledge graph"""
    try:
        # Check file size
        max_file_size = kg_service.max_file_size
        if file.size and file.size > max_file_size:
            raise HTTPException(status_code=413, detail="File too large")

        # Save uploaded file
        file_path = kg_service.upload_dir / file.filename
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Process file
        result = await kg_service.upload_file(file_path, file.content_type)

        # Clean up temporary file
        file_path.unlink(missing_ok=True)

        return FileUploadResponse(**result)

    except Exception as e:
        # Clean up on error
        if 'file_path' in locals():
            file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kg/text/import", response_model=ImportResponse)
async def kg_import_text(request: TextImportRequest):
    """Import text directly into knowledge graph"""
    try:
        result = await kg_service.import_text(request.text, request.title)
        return ImportResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kg/url/import", response_model=ImportResponse)
async def kg_import_url(request: URLImportRequest):
    """Import content from URL into knowledge graph"""
    try:
        result = await kg_service.import_url(request.url, request.title)
        return ImportResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kg/chat", response_model=ChatResponse)
async def kg_chat(request: ChatRequest):
    """Chat interface with knowledge graph RAG"""
    try:
        result = await kg_service.chat(request.query)
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kg/debug/graphiti", response_model=DebugResponse)
async def kg_debug_graphiti():
    """Debug Graphiti connection and data"""
    try:
        result = await kg_service.debug_graphiti()
        return DebugResponse(**result)
    except Exception as e:
        return DebugResponse(
            graphiti_url=kg_service.graphiti_url,
            health_status=0,
            search_status=0,
            error=str(e)
        )


class GraphAddRequest(BaseModel):
    transcript: str
    user_id: str

@router.post("/graph/add")
async def add_to_graph(request: GraphAddRequest):
    """Add entities/relationships from a new transcript to the graph for a specific user."""
    try:
        print(f"🎯 /graph/add called with user_id: {request.user_id}, transcript length: {len(request.transcript)}")
        # Extract entities/relationships and add to graph, tagging with user_id
        result = await kg_service.generate_graph_from_text(request.transcript, None, user_id=request.user_id)
        print(f"✅ Graph generation completed: {result}")
        return {"status": "success", "entities_created": result.get("entities_created", 0)}
    except Exception as e:
        print(f"❌ Error adding to graph: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# AI Conversation endpoints
@router.post("/ai/conversation/save")
async def save_ai_conversation(request: dict):
    """Save AI conversation to Chroma vector database"""
    try:
        from services.ai_conversation_service import AIConversationService
        ai_service = AIConversationService()

        user_message = request.get('user_message', '')
        ai_response = request.get('ai_response', '')
        user_id = request.get('user_id', 'local-user-1')
        topic = request.get('topic', 'general')
        model = request.get('model', 'enhanced-chat')
        session_id = request.get('session_id', f'session_{int(datetime.now().timestamp())}')

        if not user_message or not ai_response:
            raise HTTPException(status_code=400, detail="user_message and ai_response are required")

        conversation_id = await ai_service.save_conversation(
            user_message=user_message,
            ai_response=ai_response,
            user_id=user_id,
            conversation_context={
                "topic": topic,
                "session_id": session_id,
                "model": model
            }
        )

        return {"status": "success", "message": "Conversation saved successfully", "conversation_id": conversation_id}

    except Exception as e:
        logger.error(f"Error saving AI conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save conversation: {str(e)}")

@router.post("/ai/conversation/search")
async def search_ai_conversations(request: dict):
    """Search AI conversations using vector similarity"""
    try:
        from services.ai_conversation_service import AIConversationService
        ai_service = AIConversationService()

        query = request.get('query', '')
        user_id = request.get('user_id', 'local-user-1')
        limit = request.get('limit', 5)

        if not query:
            raise HTTPException(status_code=400, detail="query is required")

        conversations = await ai_service.search_conversations(
            query=query,
            user_id=user_id,
            limit=limit
        )

        return {"conversations": conversations}

    except Exception as e:
        logger.error(f"Error searching AI conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search conversations: {str(e)}")

@router.get("/ai/conversation/recent")
async def get_recent_conversations(user_id: str = "local-user-1", limit: int = 10):
    """Get recent AI conversations for a user"""
    try:
        from services.ai_conversation_service import AIConversationService
        ai_service = AIConversationService()

        conversations = await ai_service.get_recent_conversations(
            user_id=user_id,
            limit=limit
        )

        return {"conversations": conversations}

    except Exception as e:
        logger.error(f"Error getting recent conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get conversations: {str(e)}")

@router.get("/ai/conversation/summary")
async def get_conversation_summary(user_id: str = "local-user-1", days: int = 7):
    """Get conversation summary statistics"""
    try:
        from services.ai_conversation_service import AIConversationService
        ai_service = AIConversationService()

        summary = await ai_service.get_conversation_summary(
            user_id=user_id,
            days=days
        )

        return summary

    except Exception as e:
        logger.error(f"Error getting conversation summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")

@router.delete("/ai/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str, user_id: str = "local-user-1"):
    """Delete a specific conversation"""
    try:
        from services.ai_conversation_service import AIConversationService
        ai_service = AIConversationService()

        success = await ai_service.delete_conversation(
            conversation_id=conversation_id,
            user_id=user_id
        )

        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found or not owned by user")

        return {"status": "success", "message": "Conversation deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")

@router.delete("/ai/conversation/clear/{user_id}")
async def clear_user_conversations(user_id: str):
    """Clear all conversations for a user"""
    try:
        from services.ai_conversation_service import AIConversationService
        ai_service = AIConversationService()

        count = await ai_service.clear_user_conversations(user_id=user_id)

        return {"status": "success", "message": f"Cleared {count} conversations", "count": count}

    except Exception as e:
        logger.error(f"Error clearing conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear conversations: {str(e)}")


# ==================== Graph Management ====================

@router.delete("/graph/clear")
async def clear_graph_data(user_id: str = Query("local-user-1", description="User ID")):
    """Clear all graph data (nodes and edges)"""
    try:
        # Use the global kg_service instance
        result = kg_service.clear_all_graph_data(user_id=user_id)

        if result["status"] == "success":
            return result
        else:
            raise HTTPException(status_code=500, detail=result["message"])

    except Exception as e:
        logger.error(f"❌ Error clearing graph data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/graph/node/{node_id}")
async def delete_graph_node(node_id: str, user_id: str = Query(...)):
    """Delete a node from the knowledge graph"""
    try:
        # Use the global kg_service instance
        result = kg_service.delete_node(node_id)

        return {
            "status": "success",
            "message": f"Node {node_id} deleted successfully",
            "nodes_removed": result["nodes_removed"],
            "edges_removed": result["edges_removed"]
        }

    except Exception as e:
        logger.error(f"❌ Error deleting node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# @router.websocket("/ws/live-transcribe")
# async def websocket_live_transcribe(websocket: WebSocket):
#     """WebSocket endpoint for live transcription"""
#     await handle_live_transcription(websocket)

api_router = router
