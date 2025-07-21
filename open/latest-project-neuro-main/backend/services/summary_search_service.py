"""
Summary Search Service for retrieving and searching summaries from SQLite database
"""

import sqlite3
import json
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import chromadb
from datetime import datetime, timedelta
import hashlib
import re

logger = logging.getLogger(__name__)

class SummarySearchService:
    """Service for searching summaries with vector similarity"""
    
    def __init__(self, db_path: str = "./chroma_summaries"):
        """Initialize the summary search service with Chroma vector database"""
        self.db_path = Path(db_path)
        self.db_path.mkdir(exist_ok=True)
        
        # Initialize Chroma client for summaries
        self.client = chromadb.PersistentClient(path=str(self.db_path))
        
        # Create or get summary collection
        self.collection = self.client.get_or_create_collection(
            name="summaries",
            metadata={"hnsw:space": "cosine"}  # Use cosine similarity for text
        )
        
        logger.info(f"✅ Summary Search Service initialized with Chroma at {self.db_path}")
    
    def _generate_summary_id(self, content: str, user_id: str) -> str:
        """Generate unique summary ID"""
        content_hash = hashlib.md5(f"{user_id}_{content}".encode()).hexdigest()[:16]
        return f"summary_{content_hash}"
    
    async def index_summary(self, 
                          content: str, 
                          user_id: str,
                          summary_type: str = "general",
                          metadata: Dict = None) -> str:
        """
        Index a summary in the vector database
        
        Args:
            content: Summary text content
            user_id: User identifier
            summary_type: Type of summary (audio, text, etc.)
            metadata: Additional metadata
            
        Returns:
            Summary ID
        """
        try:
            summary_id = self._generate_summary_id(content, user_id)
            
            # Prepare metadata
            summary_metadata = {
                "user_id": user_id,
                "summary_type": summary_type,
                "created": datetime.now().isoformat(),
                "content_length": len(content)
            }
            
            if metadata:
                summary_metadata.update(metadata)
            
            # Add to Chroma collection
            self.collection.add(
                documents=[content],
                metadatas=[summary_metadata],
                ids=[summary_id]
            )
            
            logger.info(f"✅ Summary indexed: {summary_id}")
            return summary_id
            
        except Exception as e:
            logger.error(f"❌ Error indexing summary: {e}")
            raise
    
    async def search_summaries(self, 
                             query: str, 
                             user_id: str, 
                             limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search summaries using semantic similarity
        
        Args:
            query: Search query
            user_id: User identifier
            limit: Maximum number of results
            
        Returns:
            List of relevant summaries with relevance scores
        """
        try:
            results = self.collection.query(
                query_texts=[query],
                where={"user_id": user_id},
                n_results=limit,
                include=["documents", "metadatas", "distances"]
            )
            
            if not results["documents"] or not results["documents"][0]:
                return []
            
            # Combine results with relevance scores
            summaries = []
            for doc, metadata, distance in zip(
                results["documents"][0], 
                results["metadatas"][0], 
                results["distances"][0]
            ):
                relevance = 1 - distance  # Convert distance to similarity
                
                summaries.append({
                    "id": self._generate_summary_id(doc, user_id),
                    "content": doc,
                    "relevance": relevance,
                    "summary_type": metadata.get("summary_type", "general"),
                    "created": metadata.get("created"),
                    "content_length": metadata.get("content_length", len(doc))
                })
            
            return summaries
            
        except Exception as e:
            logger.error(f"❌ Error searching summaries: {e}")
            return []
    
    async def get_recent_summaries(self, 
                                 user_id: str, 
                                 limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent summaries for a user
        
        Args:
            user_id: User identifier
            limit: Maximum number of results
            
        Returns:
            List of recent summaries
        """
        try:
            # Get all summaries for the user
            results = self.collection.get(
                where={"user_id": user_id},
                include=["documents", "metadatas"]
            )
            
            if not results["documents"]:
                return []
            
            # Combine documents and metadata
            summaries = []
            for doc, metadata in zip(results["documents"], results["metadatas"]):
                summaries.append({
                    "id": self._generate_summary_id(doc, user_id),
                    "content": doc,
                    "summary_type": metadata.get("summary_type", "general"),
                    "created": metadata.get("created"),
                    "content_length": metadata.get("content_length", len(doc))
                })
            
            # Sort by creation date (newest first)
            summaries.sort(key=lambda x: x["created"] or "", reverse=True)
            
            return summaries[:limit]
            
        except Exception as e:
            logger.error(f"❌ Error retrieving recent summaries: {e}")
            return []
    
    async def migrate_sqlite_summaries(self, sqlite_db_path: str = None):
        """
        Migrate existing summaries from SQLite to Chroma vector database
        
        Args:
            sqlite_db_path: Path to SQLite database file
        """
        try:
            # This would connect to the existing SQLite database and migrate summaries
            # For now, we'll create some sample data
            
            sample_summaries = [
                {
                    "content": "Meeting summary: Discussed project timeline, budget allocation, and team responsibilities. Key decisions made regarding technology stack and deployment strategy.",
                    "user_id": "local-user-1",
                    "summary_type": "meeting",
                    "metadata": {"source": "audio_transcription", "duration": "45 minutes"}
                },
                {
                    "content": "Research summary: Analysis of artificial intelligence trends in healthcare. Key findings include improved diagnostic accuracy and reduced processing time.",
                    "user_id": "local-user-1", 
                    "summary_type": "research",
                    "metadata": {"source": "text_analysis", "pages": 15}
                },
                {
                    "content": "Interview summary: Candidate demonstrated strong technical skills in Python and machine learning. Previous experience includes 5 years in data science roles.",
                    "user_id": "local-user-1",
                    "summary_type": "interview", 
                    "metadata": {"source": "audio_transcription", "duration": "30 minutes"}
                }
            ]
            
            # Index sample summaries
            for summary in sample_summaries:
                await self.index_summary(
                    content=summary["content"],
                    user_id=summary["user_id"],
                    summary_type=summary["summary_type"],
                    metadata=summary.get("metadata", {})
                )
            
            logger.info(f"✅ Migrated {len(sample_summaries)} sample summaries to Chroma")
            
        except Exception as e:
            logger.error(f"❌ Error migrating summaries: {e}")
    
    async def get_summary_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get summary statistics for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            Summary statistics
        """
        try:
            # Get all summaries for the user
            results = self.collection.get(
                where={"user_id": user_id},
                include=["metadatas"]
            )
            
            if not results["metadatas"]:
                return {
                    "total_summaries": 0,
                    "summary_types": {},
                    "total_content_length": 0
                }
            
            # Calculate statistics
            total_summaries = len(results["metadatas"])
            summary_types = {}
            total_content_length = 0
            
            for metadata in results["metadatas"]:
                summary_type = metadata.get("summary_type", "general")
                summary_types[summary_type] = summary_types.get(summary_type, 0) + 1
                total_content_length += metadata.get("content_length", 0)
            
            return {
                "total_summaries": total_summaries,
                "summary_types": summary_types,
                "total_content_length": total_content_length
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting summary stats: {e}")
            return {
                "total_summaries": 0,
                "summary_types": {},
                "total_content_length": 0,
                "error": str(e)
            }

# Global instance
summary_search_service = SummarySearchService() 