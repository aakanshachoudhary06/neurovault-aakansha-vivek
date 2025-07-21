#!/usr/bin/env python3
"""
Pydantic models for Knowledge Graph API
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str
    graphiti: str
    timestamp: str


class ChatRequest(BaseModel):
    """Chat request model"""
    query: str


class ChatResponse(BaseModel):
    """Chat response model"""
    answer: str
    sources: List[Dict[str, Any]]


class TextImportRequest(BaseModel):
    """Text import request model"""
    text: str
    title: Optional[str] = None


class URLImportRequest(BaseModel):
    """URL import request model"""
    url: str
    title: Optional[str] = None


class FileUploadResponse(BaseModel):
    """File upload response model"""
    message: str
    file_type: str
    content_length: int
    entities_created: int


class LLMStatusResponse(BaseModel):
    """LLM status response model"""
    provider: str
    model: str
    status: str
    available: bool


class MultimediaStatusResponse(BaseModel):
    """Multimedia processing status response model"""
    text_processing: bool
    image_processing: bool
    audio_processing: bool
    video_processing: bool
    supported_formats: Dict[str, List[str]]


class EntityResponse(BaseModel):
    """Entity response model"""
    id: int
    name: str
    type: str
    position: int
    confidence: float


class RelationshipResponse(BaseModel):
    """Relationship response model"""
    source: str
    target: str
    type: str
    weight: float
    position: int
    confidence: float


class ExtractionResponse(BaseModel):
    """Text extraction response model"""
    entities: List[EntityResponse]
    relationships: List[RelationshipResponse]
    facts: List[str]
    text_length: int
    word_count: int
    extraction_method: Optional[str] = "pattern_matching"


class GraphNode(BaseModel):
    """Graph node model"""
    id: str
    label: str
    type: str
    properties: Optional[Dict[str, Any]] = None


class GraphEdge(BaseModel):
    """Graph edge model"""
    id: str
    source: str
    target: str
    type: str
    weight: Optional[float] = 1.0
    properties: Optional[Dict[str, Any]] = None


class GraphData(BaseModel):
    """Graph data model"""
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class GraphSession(BaseModel):
    """Graph session model"""
    id: str
    name: str
    description: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class GraphGenerateRequest(BaseModel):
    """Graph generation request model"""
    transcript_text: str
    transcript_id: Optional[int] = None


class ImportResponse(BaseModel):
    """Generic import response model"""
    message: str
    content_length: int
    entities_created: int
    title: Optional[str] = None
    url: Optional[str] = None


class DebugResponse(BaseModel):
    """Debug response model"""
    graphiti_url: str
    health_status: int
    search_status: int
    search_results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
