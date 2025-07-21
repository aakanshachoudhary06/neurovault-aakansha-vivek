#!/usr/bin/env python3
"""
AI Conversation Service for storing and retrieving AI chat interactions using Chroma
"""

import os
import logging
import chromadb
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
import hashlib

logger = logging.getLogger(__name__)

class AIConversationService:
    """Service for managing AI conversation history with vector search capabilities"""
    
    def __init__(self, db_path: str = "./chroma_conversations"):
        """Initialize the AI conversation service with Chroma vector database"""
        self.db_path = Path(db_path)
        self.db_path.mkdir(exist_ok=True)
        
        # Initialize Chroma client
        self.client = chromadb.PersistentClient(path=str(self.db_path))
        
        # Create or get conversation collection
        self.collection = self.client.get_or_create_collection(
            name="ai_conversations",
            metadata={"hnsw:space": "cosine"}  # Use cosine similarity for text
        )
        
        logger.info(f"✅ AI Conversation Service initialized with Chroma at {self.db_path}")
    
    def _generate_conversation_id(self, user_message: str, ai_response: str, user_id: str) -> str:
        """Generate unique conversation ID based on content and user"""
        content = f"{user_id}_{user_message}_{ai_response}_{datetime.now().isoformat()}"
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    async def save_conversation(self, 
                              user_message: str, 
                              ai_response: str, 
                              user_id: str,
                              conversation_context: Dict = None) -> str:
        """
        Save AI conversation to Chroma vector database
        
        Args:
            user_message: User's input message
            ai_response: AI's response
            user_id: User identifier
            conversation_context: Additional context (topic, session_id, etc.)
        
        Returns:
            conversation_id: Unique identifier for the saved conversation
        """
        try:
            conversation_id = self._generate_conversation_id(user_message, ai_response, user_id)
            timestamp = datetime.now().isoformat()
            
            # Prepare conversation text for embedding
            conversation_text = f"User: {user_message}\nAI: {ai_response}"
            
            # Prepare metadata
            metadata = {
                "user_id": user_id,
                "timestamp": timestamp,
                "user_message": user_message[:500],  # Truncate for metadata
                "ai_response": ai_response[:500],    # Truncate for metadata
                "conversation_id": conversation_id,
                "type": "ai_conversation"
            }
            
            # Add context if provided
            if conversation_context:
                metadata.update({
                    "topic": conversation_context.get("topic", "general"),
                    "session_id": conversation_context.get("session_id", "default"),
                    "model": conversation_context.get("model", "unknown")
                })
            
            # Add to Chroma collection
            self.collection.add(
                documents=[conversation_text],
                metadatas=[metadata],
                ids=[conversation_id]
            )
            
            logger.info(f"💾 Saved conversation {conversation_id} for user {user_id}")
            return conversation_id
            
        except Exception as e:
            logger.error(f"❌ Error saving conversation: {e}")
            raise
    
    async def get_recent_conversations(self, 
                                     user_id: str, 
                                     limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent AI conversations for a user, sorted by timestamp (newest first)
        
        Args:
            user_id: User identifier
            limit: Maximum number of conversations to return
        
        Returns:
            List of conversation dictionaries with metadata
        """
        try:
            # Get all conversations for the user
            results = self.collection.get(
                include=["documents", "metadatas"]
            )
            
            if not results["documents"]:
                return []

            # Combine documents and metadata, filter by user_id
            conversations = []
            for doc, metadata in zip(results["documents"], results["metadatas"]):
                if metadata.get("user_id") == user_id:
                    conversations.append({
                        "conversation_id": metadata.get("conversation_id"),
                        "user_message": metadata.get("user_message"),
                        "ai_response": metadata.get("ai_response"),
                        "timestamp": metadata.get("timestamp"),
                        "topic": metadata.get("topic", "general"),
                        "model": metadata.get("model", "unknown"),
                        "full_text": doc
                    })
            
            # Sort by timestamp (newest first)
            conversations.sort(key=lambda x: x["timestamp"], reverse=True)
            
            # Return limited results
            return conversations[:limit]
            
        except Exception as e:
            logger.error(f"❌ Error retrieving conversations: {e}")
            return []
    
    async def search_conversations(self, 
                                 query: str, 
                                 user_id: str, 
                                 limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search AI conversations using semantic similarity
        
        Args:
            query: Search query
            user_id: User identifier
            limit: Maximum number of results
        
        Returns:
            List of relevant conversations with similarity scores
        """
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=limit * 2,  # Get more to filter by user
                include=["documents", "metadatas", "distances"]
            )
            
            if not results["documents"] or not results["documents"][0]:
                return []
            
            # Combine results with similarity scores, filter by user_id
            conversations = []
            for doc, metadata, distance in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0]
            ):
                if metadata.get("user_id") == user_id:
                    conversations.append({
                        "conversation_id": metadata.get("conversation_id"),
                        "user_message": metadata.get("user_message"),
                        "ai_response": metadata.get("ai_response"),
                        "timestamp": metadata.get("timestamp"),
                        "topic": metadata.get("topic", "general"),
                        "similarity_score": 1 - distance,  # Convert distance to similarity
                        "full_text": doc
                    })

            # Return limited results
            conversations = conversations[:limit]
            
            return conversations
            
        except Exception as e:
            logger.error(f"❌ Error searching conversations: {e}")
            return []
    
    async def get_conversation_summary(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """
        Get conversation summary for the memory page
        
        Args:
            user_id: User identifier
            days: Number of days to look back
        
        Returns:
            Summary statistics and recent conversations
        """
        try:
            # Get recent conversations
            recent_conversations = await self.get_recent_conversations(user_id, limit=20)
            
            # Filter by days if needed
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=days)
            
            filtered_conversations = []
            for conv in recent_conversations:
                try:
                    conv_date = datetime.fromisoformat(conv["timestamp"])
                    if conv_date >= cutoff_date:
                        filtered_conversations.append(conv)
                except:
                    # Include conversations with invalid timestamps
                    filtered_conversations.append(conv)
            
            # Generate summary
            summary = {
                "total_conversations": len(filtered_conversations),
                "recent_conversations": filtered_conversations[:10],  # Top 10 for display
                "topics": {},
                "models_used": {},
                "time_range": f"Last {days} days"
            }
            
            # Analyze topics and models
            for conv in filtered_conversations:
                topic = conv.get("topic", "general")
                model = conv.get("model", "unknown")
                
                summary["topics"][topic] = summary["topics"].get(topic, 0) + 1
                summary["models_used"][model] = summary["models_used"].get(model, 0) + 1
            
            return summary
            
        except Exception as e:
            logger.error(f"❌ Error generating conversation summary: {e}")
            return {
                "total_conversations": 0,
                "recent_conversations": [],
                "topics": {},
                "models_used": {},
                "time_range": f"Last {days} days",
                "error": str(e)
            }
    
    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Delete a specific conversation"""
        try:
            # Verify ownership before deletion
            results = self.collection.get(
                ids=[conversation_id],
                where={"user_id": user_id}
            )
            
            if results["ids"]:
                self.collection.delete(ids=[conversation_id])
                logger.info(f"🗑️ Deleted conversation {conversation_id} for user {user_id}")
                return True
            else:
                logger.warning(f"⚠️ Conversation {conversation_id} not found or not owned by user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error deleting conversation: {e}")
            return False
    
    async def clear_user_conversations(self, user_id: str) -> int:
        """Clear all conversations for a user"""
        try:
            # Get all conversation IDs for the user
            results = self.collection.query(
                query_texts=[""],
                where={"user_id": user_id, "type": "ai_conversation"},
                n_results=1000,  # Large number to get all
                include=["metadatas"]
            )
            
            if results["metadatas"] and results["metadatas"][0]:
                conversation_ids = [meta["conversation_id"] for meta in results["metadatas"][0]]
                
                if conversation_ids:
                    self.collection.delete(ids=conversation_ids)
                    logger.info(f"🧹 Cleared {len(conversation_ids)} conversations for user {user_id}")
                    return len(conversation_ids)
            
            return 0
            
        except Exception as e:
            logger.error(f"❌ Error clearing conversations: {e}")
            return 0
