from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

class Transcript(BaseModel):
    id: Optional[int]
    user_id: Optional[str]
    transcript: str
    timestamp: datetime

class TranscriptCreate(BaseModel):
    user_id: Optional[str]
    transcript: str
    timestamp: Optional[datetime] = None

class Summary(BaseModel):
    summary: str

class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    properties: Optional[Dict[str, Any]] = {}

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str
    weight: Optional[float] = 1.0
    properties: Optional[Dict[str, Any]] = {}

class Graph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class GraphSession(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None 