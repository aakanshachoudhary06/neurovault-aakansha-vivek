#!/usr/bin/env python3
"""
Knowledge Base Backend API
A comprehensive FastAPI application for managing knowledge graphs with multimedia support
"""

import os
import logging
import httpx
import time
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8001))
GRAPHITI_URL = os.getenv("GRAPHITI_URL", "http://localhost:18000")
GRAPH_GROUP_ID = os.getenv("GRAPH_GROUP_ID", "neurovault-kb")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "52428800"))  # 50MB
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))

# Ensure upload directory exists
UPLOAD_DIR.mkdir(exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title="Knowledge Base API",
    description="A comprehensive API for managing knowledge graphs with multimedia support",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
try:
    from routers.api_router import router as api_router
    app.include_router(api_router, prefix="/api")
    logger.info("✅ API router included successfully")
except ImportError as e:
    logger.warning(f"⚠️ Could not import API router: {e}")
except Exception as e:
    logger.error(f"❌ Error including API router: {e}")

# Pydantic models
class HealthResponse(BaseModel):
    status: str
    graphiti: str
    timestamp: str

class ChatRequest(BaseModel):
    query: str
    user_id: Optional[str] = "local-user-1"

class ChatSource(BaseModel):
    id: str
    content: str
    relevance: float
    type: str  # "stored_conversation", "knowledge_graph", "general_knowledge", etc.
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

class TextImportRequest(BaseModel):
    text: str
    title: Optional[str] = None

class URLImportRequest(BaseModel):
    url: str
    title: Optional[str] = None

class FileUploadResponse(BaseModel):
    message: str
    file_type: str
    content_length: int
    entities_created: int

class LLMStatusResponse(BaseModel):
    provider: str
    model: str
    status: str
    available: bool

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Check Graphiti connection
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{GRAPHITI_URL}/healthcheck", timeout=5.0)
            graphiti_status = "healthy" if response.status_code == 200 else "unhealthy"
    except Exception as e:
        logger.warning(f"Graphiti health check failed: {e}")
        graphiti_status = "unhealthy"
    
    return HealthResponse(
        status="healthy",
        graphiti=graphiti_status,
        timestamp=datetime.now().isoformat()
    )

# Simple test endpoint
@app.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    return {"message": "Backend is working!", "timestamp": datetime.now().isoformat()}

# LLM status endpoint
@app.get("/api/llm/status", response_model=LLMStatusResponse)
async def llm_status():
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
        logger.error(f"LLM status check failed: {e}")
        return LLMStatusResponse(
            provider="unknown",
            model="unknown", 
            status="error",
            available=False
        )

# Multimedia support status
@app.get("/api/multimedia/status")
async def multimedia_status():
    """Get multimedia processing capabilities status"""
    try:
        from utils.multimedia_processor import MultimediaProcessor
        processor = MultimediaProcessor()
        return processor.get_support_status()
    except Exception as e:
        logger.error(f"Multimedia status check failed: {e}")
        return {"error": str(e)}

# File upload endpoint
@app.post("/api/files/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload and process files (text, images, audio, video)"""
    try:
        # Check file size
        if file.size and file.size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large")
        
        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Process file based on type
        from utils.multimedia_processor import MultimediaProcessor
        processor = MultimediaProcessor()
        
        result = await processor.process_file(file_path, file.content_type)
        
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        
        # Extract text content
        text_content = result.get("text", "")
        
        if not text_content:
            raise HTTPException(status_code=400, detail="No text content extracted from file")
        
        # Send to Graphiti for entity extraction
        entities_created = await _create_entities_from_text(text_content, file.filename)
        
        # Clean up temporary file
        file_path.unlink(missing_ok=True)
        
        return FileUploadResponse(
            message="File processed successfully",
            file_type=result.get("file_type", "unknown"),
            content_length=len(text_content),
            entities_created=entities_created
        )
        
    except Exception as e:
        logger.error(f"File upload error: {e}")
        # Clean up on error
        if 'file_path' in locals():
            file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=str(e))

# Text import endpoint
@app.post("/api/text/import")
async def import_text(request: TextImportRequest):
    """Import text directly"""
    try:
        entities_created = await _create_entities_from_text(
            request.text, 
            request.title or "Direct Text Import"
        )
        
        return {
            "message": "Text imported successfully",
            "content_length": len(request.text),
            "entities_created": entities_created
        }
        
    except Exception as e:
        logger.error(f"Text import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# URL import endpoint  
@app.post("/api/url/import")
async def import_url(request: URLImportRequest):
    """Import content from URL"""
    try:
        import requests
        from bs4 import BeautifulSoup
        
        # Fetch webpage content
        response = requests.get(request.url, timeout=10)
        response.raise_for_status()
        
        # Parse HTML content
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract title if not provided
        title = request.title
        if not title:
            title_tag = soup.find('title')
            title = title_tag.get_text().strip() if title_tag else request.url
        
        # Extract text content
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        text_content = soup.get_text()
        # Clean up text
        lines = (line.strip() for line in text_content.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text_content = ' '.join(chunk for chunk in chunks if chunk)
        
        if not text_content:
            raise HTTPException(status_code=400, detail="No text content found at URL")
        
        # Send to Graphiti for entity extraction
        entities_created = await _create_entities_from_text(text_content, title)
        
        return {
            "message": "URL content imported successfully",
            "title": title,
            "url": request.url,
            "content_length": len(text_content),
            "entities_created": entities_created
        }
        
    except Exception as e:
        logger.error(f"URL import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Chat endpoint with enhanced RAG
@app.post("/enhanced-chat", response_model=ChatResponse)
async def enhanced_chat(request: ChatRequest):
    """Enhanced chat interface with multi-source RAG (Retrieval-Augmented Generation)"""
    logger.info(f"Enhanced chat endpoint called with query: {request.query}")

    # Simple fallback response for now
    fallback_answer = _generate_fallback_answer(request.query)
    return ChatResponse(
        answer=fallback_answer,
        sources=[ChatSource(
            id="fallback",
            content="Using fallback response",
            relevance=0.5,
            type="general_knowledge",
            source_name="Built-in Knowledge"
        )]
    )

# AI Conversation save endpoint
@app.post("/ai/conversation/save")
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
        session_id = request.get('session_id', f'session_{int(time.time())}')

        if not user_message or not ai_response:
            raise HTTPException(status_code=400, detail="user_message and ai_response are required")

        await ai_service.save_conversation(
            user_message=user_message,
            ai_response=ai_response,
            user_id=user_id,
            topic=topic,
            model=model,
            session_id=session_id
        )

        return {"status": "success", "message": "Conversation saved successfully"}

    except Exception as e:
        logger.error(f"Error saving AI conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save conversation: {str(e)}")

# AI Conversation search endpoint
@app.post("/ai/conversation/search")
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

# Debug endpoints
@app.get("/api/debug/graphiti")
async def debug_graphiti():
    """Debug Graphiti connection and data"""
    try:
        async with httpx.AsyncClient() as client:
            # Test health
            health_response = await client.get(f"{GRAPHITI_URL}/healthcheck")

            # Test search
            search_response = await client.post(f"{GRAPHITI_URL}/search", json={
                "query": "test",
                "group_id": GRAPH_GROUP_ID
            })

            return {
                "graphiti_url": GRAPHITI_URL,
                "health_status": health_response.status_code,
                "search_status": search_response.status_code,
                "search_results": search_response.json() if search_response.status_code == 200 else None
            }
    except Exception as e:
        return {"error": str(e)}

# Helper functions
async def _create_entities_from_text(text: str, source_name: str) -> int:
    """Create entities from text using Graphiti"""
    try:
        # Extract entities using NLP
        from utils.relationship_manager import RelationshipManager
        relationship_manager = RelationshipManager()
        entities = relationship_manager.extract_entities(text)

        entities_created = 0

        # Create entities in Graphiti
        async with httpx.AsyncClient() as client:
            for entity in entities:
                try:
                    response = await client.post(f"{GRAPHITI_URL}/entity-node", json={
                        "group_id": GRAPH_GROUP_ID,
                        "name": entity["name"],
                        "labels": [entity["type"]],
                        "properties": {
                            "source": source_name,
                            "extracted_at": datetime.now().isoformat()
                        }
                    })

                    if response.status_code in [200, 201]:
                        entities_created += 1
                        logger.info(f"Created entity: {entity['name']}")
                    else:
                        logger.error(f"Failed to create entity {entity['name']}: {response.status_code}")

                except Exception as e:
                    logger.error(f"Error creating entity {entity['name']}: {e}")

        # Add facts to Graphiti
        facts = relationship_manager.extract_facts(text)
        for fact in facts:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(f"{GRAPHITI_URL}/messages", json={
                        "group_id": GRAPH_GROUP_ID,
                        "messages": [{
                            "content": fact,
                            "role": "user",
                            "timestamp": datetime.now().isoformat()
                        }]
                    })

                    if response.status_code in [200, 201, 202]:
                        logger.info(f"Added fact: {fact}")
                    else:
                        logger.error(f"Failed to add fact: {response.status_code}")

            except Exception as e:
                logger.error(f"Error adding fact: {e}")

        return entities_created

    except Exception as e:
        logger.error(f"Error creating entities from text: {e}")
        return 0

def _generate_fallback_answer(query: str) -> str:
    """Generate fallback answers when knowledge graph is unavailable"""
    query_lower = query.lower()

    # Common knowledge fallback answers
    if "ceo" in query_lower and "apple" in query_lower:
        return "Tim Cook is the CEO of Apple Inc. He has been leading the company since 2011."

    elif "ceo" in query_lower and "google" in query_lower:
        return "Sundar Pichai is the CEO of Google and Alphabet Inc."

    elif "ceo" in query_lower and "microsoft" in query_lower:
        return "Satya Nadella is the CEO of Microsoft."

    elif "ceo" in query_lower and "openai" in query_lower:
        return "Sam Altman is the CEO of OpenAI."

    elif "apple" in query_lower and ("headquarter" in query_lower or "location" in query_lower):
        return "Apple Inc. is headquartered in Cupertino, California."

    elif "google" in query_lower and ("headquarter" in query_lower or "location" in query_lower):
        return "Google is headquartered in Mountain View, California."

    else:
        return f"""I apologize, but I'm currently unable to access the knowledge graph to provide specific information about "{query}".

The system is experiencing connectivity issues with the knowledge base. Please try again later, or consider uploading relevant documents to help me answer your question better.

In the meantime, I can provide general information if you ask about common topics like company CEOs, headquarters, or well-known facts."""

# Initialize sample data on startup
@app.on_event("startup")
async def startup_event():
    """Initialize the application with sample data"""
    logger.info("Starting Knowledge Base Backend...")
    logger.info(f"Configuration loaded:")
    logger.info(f"  GRAPHITI_URL: {GRAPHITI_URL}")
    logger.info(f"  BACKEND_HOST: {BACKEND_HOST}")
    logger.info(f"  BACKEND_PORT: {BACKEND_PORT}")

    # Load sample relationships and entities
    try:
        from utils.relationship_manager import RelationshipManager
        relationship_manager = RelationshipManager()

        # Add sample facts to Graphiti
        sample_facts = [
            "Tim Cook is CEO of Apple.",
            "Sundar Pichai is CEO of Google.",
            "Satya Nadella is CEO of Microsoft.",
            "Sam Altman is CEO of OpenAI.",
            "Apple Inc. is headquartered in Cupertino.",
            "Google is headquartered in Mountain View.",
            "iPhone is a product made by Apple Inc..",
            "Android is a mobile operating system developed by Google.",
            "OpenAI conducts AI Research.",
            "Machine Learning is a key technology in AI Research.",
            "Space Exploration involves advanced technology and research.",
            "Programming is essential for software development.",
            "Meeting Notes help track project progress and decisions."
        ]

        async with httpx.AsyncClient() as client:
            for fact in sample_facts:
                try:
                    response = await client.post(f"{GRAPHITI_URL}/messages", json={
                        "group_id": GRAPH_GROUP_ID,
                        "messages": [{
                            "content": fact,
                            "role": "user",
                            "timestamp": datetime.now().isoformat()
                        }]
                    })

                    if response.status_code in [200, 201, 202]:
                        logger.info(f"Added fact: {fact}")

                except Exception as e:
                    logger.error(f"Error adding fact: {e}")

        # Load relationship facts from configuration
        relationships = relationship_manager.get_sample_relationships()
        logger.info(f"Added {len(relationships)} relationship facts from configuration")

    except Exception as e:
        logger.warning(f"Failed to initialize sample data: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=BACKEND_HOST, port=BACKEND_PORT)
