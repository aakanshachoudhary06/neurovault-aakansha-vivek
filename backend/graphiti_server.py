#!/usr/bin/env python3
"""
Simple Graphiti Server for Knowledge Graph functionality
"""

import os
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
from graphiti import Graphiti
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Graphiti Server", version="1.0.0")

# Initialize Graphiti client
graphiti_client = None

class Message(BaseModel):
    content: str
    role: str = "user"
    timestamp: Optional[str] = None

class MessagesRequest(BaseModel):
    group_id: str
    messages: List[Message]

class EntityNodeRequest(BaseModel):
    group_id: str
    name: str
    labels: List[str]
    properties: Dict[str, Any] = {}

class SearchRequest(BaseModel):
    query: str
    group_id: str

class GetMemoryRequest(BaseModel):
    group_id: str
    max_facts: int = 10
    center_node_uuid: Optional[str] = None
    messages: List[Message] = []

@app.on_event("startup")
async def startup_event():
    """Initialize Graphiti client on startup"""
    global graphiti_client
    try:
        # Initialize Graphiti with Neo4j connection
        neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        neo4j_user = os.getenv("NEO4J_USERNAME", "neo4j")
        neo4j_password = os.getenv("NEO4J_PASSWORD", "demodemo")
        
        graphiti_client = Graphiti(
            uri=neo4j_uri,
            user=neo4j_user,
            password=neo4j_password
        )
        print(f"✅ Graphiti server started successfully")
        print(f"🔗 Connected to Neo4j at {neo4j_uri}")
    except Exception as e:
        print(f"❌ Failed to initialize Graphiti: {e}")
        graphiti_client = None

@app.get("/healthcheck")
async def healthcheck():
    """Health check endpoint"""
    if graphiti_client is None:
        raise HTTPException(status_code=503, detail="Graphiti client not initialized")
    return {"status": "healthy", "service": "graphiti"}

@app.post("/messages")
async def add_messages(request: MessagesRequest):
    """Add messages to the knowledge graph"""
    if graphiti_client is None:
        raise HTTPException(status_code=503, detail="Graphiti client not initialized")
    
    try:
        # Convert messages to the format expected by Graphiti
        messages = []
        for msg in request.messages:
            messages.append({
                "content": msg.content,
                "role": msg.role,
                "timestamp": msg.timestamp
            })
        
        # Add messages to Graphiti
        result = await graphiti_client.add_messages(
            group_id=request.group_id,
            messages=messages
        )
        
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/entity-node")
async def create_entity_node(request: EntityNodeRequest):
    """Create an entity node in the knowledge graph"""
    if graphiti_client is None:
        raise HTTPException(status_code=503, detail="Graphiti client not initialized")
    
    try:
        # Create entity node using Graphiti
        result = await graphiti_client.create_node(
            group_id=request.group_id,
            name=request.name,
            labels=request.labels,
            properties=request.properties
        )
        
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def search(request: SearchRequest):
    """Search the knowledge graph"""
    if graphiti_client is None:
        raise HTTPException(status_code=503, detail="Graphiti client not initialized")
    
    try:
        # Search using Graphiti
        results = await graphiti_client.search(
            group_id=request.group_id,
            query=request.query
        )
        
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get-memory")
async def get_memory(request: GetMemoryRequest):
    """Get memory/facts from the knowledge graph"""
    if graphiti_client is None:
        raise HTTPException(status_code=503, detail="Graphiti client not initialized")
    
    try:
        # Get memory using Graphiti
        memory = await graphiti_client.get_memory(
            group_id=request.group_id,
            max_facts=request.max_facts,
            center_node_uuid=request.center_node_uuid
        )
        
        return {"facts": memory}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "graphiti_server:app",
        host="0.0.0.0",
        port=18000,
        reload=True
    )
