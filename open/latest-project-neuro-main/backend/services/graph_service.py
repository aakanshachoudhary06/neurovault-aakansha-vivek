#!/usr/bin/env python3
"""
Graph Service - Wrapper for KnowledgeGraphService to maintain compatibility
"""

from .knowledge_graph_service import KnowledgeGraphService


class GraphService:
    """Wrapper class to maintain compatibility with existing code - now uses Graphiti"""

    def __init__(self, db_path: str = "transcripts.db"):
        self.kg_service = KnowledgeGraphService(db_path)

    async def get_graph_data(self, user_id=None):
        """Get graph data from Graphiti, filtered by user_id if provided"""
        return await self.kg_service.get_graph_data(user_id=user_id)

    async def generate_graph_from_text(self, transcript_text: str, transcript_id: int = None):
        """Generate a knowledge graph from transcript text using Graphiti"""
        return await self.kg_service.generate_graph_from_text(transcript_text, transcript_id)

    async def generate_graph_from_transcript(self, transcript_id: int):
        """Generate a knowledge graph from a transcript using Graphiti"""
        return await self.kg_service.generate_graph_from_transcript(transcript_id)

    def get_graph_sessions(self):
        """Get all graph sessions"""
        return self.kg_service.get_graph_sessions()

    def create_graph_session(self, name: str, description: str = ""):
        """Create a new graph session"""
        return self.kg_service.create_graph_session(name, description)

    def delete_graph_session(self, session_id: str):
        """Delete a graph session"""
        return self.kg_service.delete_graph_session(session_id)


# Initialize the graph service for backward compatibility
graph_service = GraphService()
