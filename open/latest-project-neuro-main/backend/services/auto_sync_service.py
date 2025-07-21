#!/usr/bin/env python3
"""
Auto Sync Service - Automatically synchronize and deduplicate data in the background
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any
from services.ai_conversation_service import AIConversationService
from services.summary_search_service import SummarySearchService
from services.knowledge_graph_service import KnowledgeGraphService

logger = logging.getLogger(__name__)

class AutoSyncService:
    """Service for automatic background data synchronization and deduplication"""
    
    def __init__(self, sync_interval_minutes: int = 30):
        """
        Initialize auto sync service
        
        Args:
            sync_interval_minutes: How often to run sync (default: 30 minutes)
        """
        self.sync_interval = timedelta(minutes=sync_interval_minutes)
        self.last_sync = None
        self.is_running = False
        
        # Initialize services
        self.ai_service = AIConversationService()
        self.summary_service = SummarySearchService()
        self.kg_service = KnowledgeGraphService()
        
        logger.info(f"✅ Auto Sync Service initialized (interval: {sync_interval_minutes} minutes)")
    
    async def should_sync(self) -> bool:
        """Check if it's time to run sync"""
        if self.last_sync is None:
            return True
        
        time_since_last_sync = datetime.now() - self.last_sync
        return time_since_last_sync >= self.sync_interval
    
    async def auto_deduplicate_conversations(self, user_id: str = "local-user-1") -> Dict[str, int]:
        """Automatically deduplicate conversations"""
        try:
            conversations = await self.ai_service.get_recent_conversations(user_id, limit=100)
            
            # Group conversations by user message to find duplicates
            conversation_groups = {}
            for conv in conversations:
                user_msg = conv.get('user_message', '').strip().lower()
                if user_msg not in conversation_groups:
                    conversation_groups[user_msg] = []
                conversation_groups[user_msg].append(conv)
            
            # Remove duplicates, keeping only the latest
            duplicates_removed = 0
            for user_msg, conv_list in conversation_groups.items():
                if len(conv_list) > 1:
                    # Sort by timestamp, keep the latest
                    conv_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
                    
                    # Remove older duplicates
                    for old_conv in conv_list[1:]:
                        try:
                            self.ai_service.collection.delete(ids=[old_conv['conversation_id']])
                            await self.kg_service.remove_conversation_from_graph(old_conv['conversation_id'])
                            duplicates_removed += 1
                        except Exception as e:
                            logger.warning(f"⚠️ Error removing duplicate conversation: {e}")
            
            if duplicates_removed > 0:
                logger.info(f"🔄 Auto-removed {duplicates_removed} duplicate conversations")
            
            return {"duplicates_removed": duplicates_removed}
            
        except Exception as e:
            logger.error(f"❌ Error in conversation deduplication: {e}")
            return {"duplicates_removed": 0}
    
    async def auto_deduplicate_summaries(self, user_id: str = "local-user-1") -> Dict[str, int]:
        """Automatically deduplicate summaries"""
        try:
            summaries = await self.summary_service.search_summaries("", user_id, limit=100)
            
            # Group summaries by content to find duplicates
            summary_groups = {}
            for summary in summaries:
                content = summary.get('content', '').strip().lower()
                if content not in summary_groups:
                    summary_groups[content] = []
                summary_groups[content].append(summary)
            
            # Remove duplicate summaries
            duplicates_removed = 0
            for content, summary_list in summary_groups.items():
                if len(summary_list) > 1:
                    # Sort by created date, keep the latest
                    summary_list.sort(key=lambda x: x.get('created', ''), reverse=True)
                    
                    # Remove older duplicates
                    for old_summary in summary_list[1:]:
                        try:
                            self.summary_service.collection.delete(ids=[old_summary['id']])
                            await self.kg_service.remove_summary_from_graph(old_summary['id'])
                            duplicates_removed += 1
                        except Exception as e:
                            logger.warning(f"⚠️ Error removing duplicate summary: {e}")
            
            if duplicates_removed > 0:
                logger.info(f"🔄 Auto-removed {duplicates_removed} duplicate summaries")
            
            return {"duplicates_removed": duplicates_removed}
            
        except Exception as e:
            logger.error(f"❌ Error in summary deduplication: {e}")
            return {"duplicates_removed": 0}
    
    async def auto_deduplicate_graph(self) -> Dict[str, int]:
        """Automatically deduplicate graph data"""
        try:
            initial_nodes = len(self.kg_service.generated_nodes)
            initial_edges = len(self.kg_service.generated_edges)
            
            self.kg_service._deduplicate_generated_data()
            
            final_nodes = len(self.kg_service.generated_nodes)
            final_edges = len(self.kg_service.generated_edges)
            
            nodes_deduplicated = initial_nodes - final_nodes
            edges_deduplicated = initial_edges - final_edges
            
            if nodes_deduplicated > 0 or edges_deduplicated > 0:
                logger.info(f"🔄 Auto-deduplicated graph: {nodes_deduplicated} nodes, {edges_deduplicated} edges")
            
            return {
                "nodes_deduplicated": nodes_deduplicated,
                "edges_deduplicated": edges_deduplicated
            }
            
        except Exception as e:
            logger.error(f"❌ Error in graph deduplication: {e}")
            return {"nodes_deduplicated": 0, "edges_deduplicated": 0}
    
    async def run_sync_cycle(self, user_id: str = "local-user-1") -> Dict[str, Any]:
        """Run a complete sync and deduplication cycle"""
        try:
            logger.info("🔄 Starting automatic sync and deduplication cycle...")
            
            # Run all deduplication tasks
            conv_results = await self.auto_deduplicate_conversations(user_id)
            summary_results = await self.auto_deduplicate_summaries(user_id)
            graph_results = await self.auto_deduplicate_graph()
            
            # Update last sync time
            self.last_sync = datetime.now()
            
            results = {
                "conversations": conv_results,
                "summaries": summary_results,
                "graph": graph_results,
                "sync_time": self.last_sync.isoformat()
            }
            
            total_items_cleaned = (
                conv_results.get("duplicates_removed", 0) +
                summary_results.get("duplicates_removed", 0) +
                graph_results.get("nodes_deduplicated", 0) +
                graph_results.get("edges_deduplicated", 0)
            )
            
            if total_items_cleaned > 0:
                logger.info(f"✅ Auto-sync completed: {total_items_cleaned} items cleaned")
            else:
                logger.debug("✅ Auto-sync completed: no duplicates found")
            
            return {
                "status": "success",
                "message": "Auto-sync completed",
                "results": results,
                "total_items_cleaned": total_items_cleaned
            }
            
        except Exception as e:
            logger.error(f"❌ Error in sync cycle: {e}")
            return {
                "status": "error",
                "message": f"Sync cycle failed: {str(e)}",
                "results": {},
                "total_items_cleaned": 0
            }
    
    async def start_background_sync(self, user_id: str = "local-user-1"):
        """Start the background sync loop"""
        if self.is_running:
            logger.warning("⚠️ Background sync is already running")
            return
        
        self.is_running = True
        logger.info("🚀 Starting background auto-sync service...")
        
        try:
            while self.is_running:
                if await self.should_sync():
                    await self.run_sync_cycle(user_id)
                
                # Wait for a short interval before checking again
                await asyncio.sleep(60)  # Check every minute
                
        except Exception as e:
            logger.error(f"❌ Background sync error: {e}")
        finally:
            self.is_running = False
            logger.info("🛑 Background auto-sync service stopped")
    
    def stop_background_sync(self):
        """Stop the background sync loop"""
        self.is_running = False
        logger.info("🛑 Stopping background auto-sync service...")

# Global auto sync service instance
auto_sync_service = AutoSyncService(sync_interval_minutes=30)
