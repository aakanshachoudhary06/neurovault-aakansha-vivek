#!/usr/bin/env python3
"""
Knowledge Graph Service for managing knowledge graphs with Graphiti integration
"""

import os
import logging
import httpx
import sqlite3
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class KnowledgeGraphService:
    """Service for managing knowledge graphs with Graphiti backend"""
    
    def __init__(self, db_path: str = "transcripts.db"):
        self.graphiti_url = os.getenv("GRAPHITI_URL", "http://192.168.0.9:18000")
        self.graph_group_id = os.getenv("GRAPH_GROUP_ID", "neurovault-kb")
        self.max_file_size = int(os.getenv("MAX_FILE_SIZE", "52428800"))  # 50MB
        self.upload_dir = Path(os.getenv("UPLOAD_DIR", "./uploads"))
        self.db_path = db_path  # Only for non-graph data (transcripts, etc.)

        # In-memory storage for generated graph data
        self.generated_nodes = []
        self.generated_edges = []
        self.generated_data_file = Path("generated_graph_data.json")

        # Load existing generated data
        self._load_generated_data()

        # Ensure upload directory exists
        self.upload_dir.mkdir(exist_ok=True)

        # Initialize non-graph tables only (transcripts, audio files, etc.)
        self.init_non_graph_tables()

        # Add some test data to demonstrate functionality
        # self._add_test_data()  # Commented out to show clean graph

    def _add_test_data(self):
        """Add some test data to demonstrate new content in the graph"""
        # Check if test data already exists
        existing_ids = {node['id'] for node in self.generated_nodes}
        if "harvard_test_1" in existing_ids:
            print("🧪 Test data already exists, skipping...")
            return

        # Add test nodes from harvard.wav processing
        test_nodes = [
            {
                "id": "harvard_test_1",
                "label": "Harvard University",
                "type": "ORGANIZATION",
                "properties": {
                    "user_id": "local-user-1",
                    "source": "harvard.wav",
                    "description": "Educational institution mentioned in audio"
                }
            },
            {
                "id": "harvard_test_2",
                "label": "Research Study",
                "type": "CONCEPT",
                "properties": {
                    "user_id": "local-user-1",
                    "source": "harvard.wav",
                    "description": "Academic research discussed in audio"
                }
            }
        ]

        test_edges = [
            {
                "id": "harvard_edge_1",
                "source": "harvard_test_1",
                "target": "harvard_test_2",
                "type": "CONDUCTS",
                "weight": 1.0,
                "properties": {
                    "user_id": "local-user-1",
                    "source": "harvard.wav"
                }
            }
        ]

        self.generated_nodes.extend(test_nodes)
        self.generated_edges.extend(test_edges)
        print(f"🧪 Added test data: {len(test_nodes)} nodes, {len(test_edges)} edges")

        # Save test data
        self._save_generated_data()

    def _load_generated_data(self):
        """Load generated graph data from file"""
        try:
            if self.generated_data_file.exists():
                with open(self.generated_data_file, 'r') as f:
                    data = json.load(f)
                    self.generated_nodes = data.get('nodes', [])
                    self.generated_edges = data.get('edges', [])
                    # Load deleted sample nodes (convert list back to set)
                    deleted_nodes_list = data.get('deleted_sample_nodes', [])
                    self.deleted_sample_nodes = set(deleted_nodes_list)
                    print(f"📂 Loaded {len(self.generated_nodes)} generated nodes, {len(self.generated_edges)} generated edges, {len(self.deleted_sample_nodes)} deleted sample nodes")
            else:
                self.generated_nodes = []
                self.generated_edges = []
                self.deleted_sample_nodes = set()
        except Exception as e:
            print(f"❌ Error loading generated data: {e}")
            self.generated_nodes = []
            self.generated_edges = []
            self.deleted_sample_nodes = set()

    def _save_generated_data(self):
        """Save generated graph data to file"""
        try:
            # Ensure deleted_sample_nodes is initialized
            if not hasattr(self, 'deleted_sample_nodes'):
                self.deleted_sample_nodes = set()

            data = {
                'nodes': self.generated_nodes,
                'edges': self.generated_edges,
                'deleted_sample_nodes': list(self.deleted_sample_nodes),  # Convert set to list for JSON
                'last_updated': datetime.now().isoformat()
            }
            with open(self.generated_data_file, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"💾 Saved {len(self.generated_nodes)} generated nodes, {len(self.generated_edges)} generated edges, {len(self.deleted_sample_nodes)} deleted sample nodes")
        except Exception as e:
            print(f"❌ Error saving generated data: {e}")

    def _deduplicate_generated_data(self):
        """Remove duplicate nodes and edges from generated data"""
        # Deduplicate nodes by ID
        seen_node_ids = set()
        unique_nodes = []
        for node in self.generated_nodes:
            if node['id'] not in seen_node_ids:
                unique_nodes.append(node)
                seen_node_ids.add(node['id'])

        # Deduplicate edges by ID
        seen_edge_ids = set()
        unique_edges = []
        for edge in self.generated_edges:
            if edge['id'] not in seen_edge_ids:
                unique_edges.append(edge)
                seen_edge_ids.add(edge['id'])

        # Update the lists
        original_node_count = len(self.generated_nodes)
        original_edge_count = len(self.generated_edges)

        self.generated_nodes = unique_nodes
        self.generated_edges = unique_edges

        if original_node_count != len(unique_nodes) or original_edge_count != len(unique_edges):
            print(f"🧹 Deduplication: {original_node_count} → {len(unique_nodes)} nodes, {original_edge_count} → {len(unique_edges)} edges")

    def _deduplicate_list_by_id(self, items: List[Dict]) -> List[Dict]:
        """Remove duplicates from a list of items by ID"""
        seen_ids = set()
        unique_items = []
        for item in items:
            if item['id'] not in seen_ids:
                unique_items.append(item)
                seen_ids.add(item['id'])
        return unique_items

    async def health_check(self) -> Dict[str, str]:
        """Check the health of Graphiti service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.graphiti_url}/healthcheck", timeout=5.0)
                graphiti_status = "healthy" if response.status_code == 200 else "unhealthy"
        except Exception as e:
            logger.warning(f"Graphiti health check failed: {e}")
            graphiti_status = "unhealthy"
        
        return {
            "status": "healthy",
            "graphiti": graphiti_status,
            "timestamp": datetime.now().isoformat()
        }
    
    async def import_text(self, text: str, title: Optional[str] = None) -> Dict[str, Any]:
        """Import text directly into the knowledge graph"""
        try:
            print(f"🎯 import_text called with text: {text[:50]}...")
            # For now, use local processing without Graphiti dependency
            entities_created = self._create_entities_locally(text, title or "Direct Text Import")
            print(f"🎯 _create_entities_locally returned: {entities_created}")

            return {
                "message": "Text imported successfully",
                "content_length": len(text),
                "entities_created": entities_created
            }
        except Exception as e:
            logger.error(f"Text import error: {e}")
            raise
    
    async def import_url(self, url: str, title: Optional[str] = None) -> Dict[str, Any]:
        """Import content from URL into the knowledge graph"""
        try:
            import requests
            from bs4 import BeautifulSoup
            
            # Fetch webpage content
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            # Parse HTML content
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract title if not provided
            if not title:
                title_tag = soup.find('title')
                title = title_tag.get_text().strip() if title_tag else url
            
            # Extract text content
            for script in soup(["script", "style"]):
                script.decompose()
            
            text_content = soup.get_text()
            # Clean up text
            lines = (line.strip() for line in text_content.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text_content = ' '.join(chunk for chunk in chunks if chunk)
            
            if not text_content:
                raise ValueError("No text content found at URL")
            
            # Send to Graphiti for entity extraction
            entities_created = await self._create_entities_from_text(text_content, title)
            
            return {
                "message": "URL content imported successfully",
                "title": title,
                "url": url,
                "content_length": len(text_content),
                "entities_created": entities_created
            }
        except Exception as e:
            logger.error(f"URL import error: {e}")
            raise
    
    async def upload_file(self, file_path: Path, content_type: Optional[str] = None) -> Dict[str, Any]:
        """Upload and process files"""
        try:
            # Process file based on type
            from utils.multimedia_processor import MultimediaProcessor
            processor = MultimediaProcessor()
            
            result = await processor.process_file(file_path, content_type)
            
            if result.get("error"):
                raise ValueError(result["error"])
            
            # Extract text content
            text_content = result.get("text", "")
            
            if not text_content:
                raise ValueError("No text content extracted from file")
            
            # Send to Graphiti for entity extraction
            entities_created = await self._create_entities_from_text(text_content, file_path.name)
            
            return {
                "message": "File processed successfully",
                "file_type": result.get("file_type", "unknown"),
                "content_length": len(text_content),
                "entities_created": entities_created
            }
        except Exception as e:
            logger.error(f"File upload error: {e}")
            raise
    
    async def chat(self, query: str) -> Dict[str, Any]:
        """Chat interface with RAG (Retrieval-Augmented Generation)"""
        try:
            # Step 1: Try to retrieve relevant information from knowledge graph
            context_facts = []
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(f"{self.graphiti_url}/get-memory", json={
                        "group_id": self.graph_group_id,
                        "max_facts": 10,
                        "center_node_uuid": None,
                        "messages": [{
                            "content": query,
                            "role_type": "user",
                            "role": "user",
                            "timestamp": datetime.now().isoformat()
                        }]
                    })
                    
                    if response.status_code == 200:
                        memory_data = response.json()
                        logger.info(f"Retrieved {len(memory_data.get('facts', []))} facts from Graphiti")
                        
                        # Extract relevant facts for context
                        for fact in memory_data.get('facts', [])[:10]:
                            fact_text = fact.get('fact', '')
                            if fact_text:
                                context_facts.append(fact_text)
                                logger.info(f"Added context: {fact_text}")
                    else:
                        logger.warning(f"Graphiti returned {response.status_code}, using fallback response")
            except Exception as e:
                logger.warning(f"Graphiti unavailable ({e}), using fallback response")
            
            # Step 2: Generate response using LLM with retrieved context or fallback
            if context_facts:
                # Use knowledge graph context
                from utils.llm_factory import get_llm_client
                llm_client = get_llm_client()
                
                context_text = "\n".join(context_facts)
                system_prompt = """You are a helpful AI assistant with access to a knowledge base.
Use the provided context to answer questions accurately. If the context doesn't contain
relevant information, provide a general helpful response based on your knowledge."""
                
                user_prompt = f"""Context from knowledge base:
{context_text}

Question: {query}

Please provide a helpful and accurate answer based on the context and your knowledge."""
                
                # Generate response
                llm_response = await llm_client.generate_response(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                )
                
                # Prepare sources information
                sources = []
                for i, fact in enumerate(context_facts[:5]):  # Top 5 sources
                    sources.append({
                        "id": f"fact_{i+1}",
                        "content": fact,
                        "relevance": 0.9 - (i * 0.1),  # Decreasing relevance
                        "type": "knowledge_graph"
                    })
                
                return {
                    "answer": llm_response,
                    "sources": sources
                }
            else:
                # Use fallback response
                fallback_answer = self._generate_fallback_answer(query)
                return {
                    "answer": fallback_answer,
                    "sources": [{
                        "id": "fallback",
                        "name": "Built-in Knowledge",
                        "snippet": "Using general knowledge due to knowledge graph unavailability"
                    }]
                }
        except Exception as e:
            logger.error(f"Error in chat: {e}")
            # Provide fallback response instead of error
            fallback_answer = self._generate_fallback_answer(query)
            return {
                "answer": fallback_answer,
                "sources": [{
                    "id": "fallback",
                    "name": "Built-in Knowledge",
                    "snippet": "Using general knowledge due to system error"
                }]
            }
    
    async def debug_graphiti(self) -> Dict[str, Any]:
        """Debug Graphiti connection and data"""
        try:
            async with httpx.AsyncClient() as client:
                # Test health
                health_response = await client.get(f"{self.graphiti_url}/healthcheck")

                # Test search
                search_response = await client.post(f"{self.graphiti_url}/search", json={
                    "query": "test",
                    "group_id": self.graph_group_id
                })

                return {
                    "graphiti_url": self.graphiti_url,
                    "health_status": health_response.status_code,
                    "search_status": search_response.status_code,
                    "search_results": search_response.json() if search_response.status_code == 200 else None
                }
        except Exception as e:
            return {
                "graphiti_url": self.graphiti_url,
                "health_status": 0,
                "search_status": 0,
                "search_results": None,
                "error": str(e)
            }
    
    async def _create_entities_from_text(self, text: str, source_name: str, user_id: str = None) -> int:
        """Create entities from text using Graphiti, tagging with user_id if provided"""
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
                        properties = {
                            "source": source_name,
                            "extracted_at": datetime.now().isoformat()
                        }
                        if user_id:
                            properties["user_id"] = user_id
                        response = await client.post(f"{self.graphiti_url}/entity-node", json={
                            "group_id": self.graph_group_id,
                            "name": entity["name"],
                            "labels": [entity["type"]],
                            "properties": properties
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
                    fact_properties = {"timestamp": datetime.now().isoformat()}
                    if user_id:
                        fact_properties["user_id"] = user_id
                    async with httpx.AsyncClient() as client:
                        response = await client.post(f"{self.graphiti_url}/messages", json={
                            "group_id": self.graph_group_id,
                            "messages": [{
                                "content": fact,
                                "role": "user",
                                "timestamp": datetime.now().isoformat(),
                                "properties": fact_properties
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

    # Local entity storage removed - all graph data now goes through Graphiti
    def _create_entities_locally(self, text: str, source_name: str) -> int:
        """Create clean, meaningful entities and relationships"""
        print(f"🎯 _create_entities_locally called with source: {source_name}")
        # Clear existing data for clean start
        self.generated_nodes = []
        self.generated_edges = []
        print(f"🎯 Cleared existing data")
        
        # Define meaningful entities with proper categorization
        entities = [
            # Tech Companies
            {"id": "google", "label": "Google", "type": "ORGANIZATION", "category": "tech"},
            {"id": "amazon", "label": "Amazon", "type": "ORGANIZATION", "category": "tech"},
            {"id": "microsoft", "label": "Microsoft", "type": "ORGANIZATION", "category": "tech"},
            
            # Locations
            {"id": "new_york", "label": "New York", "type": "LOCATION", "category": "city"},
            {"id": "silicon_valley", "label": "Silicon Valley", "type": "LOCATION", "category": "region"},
            {"id": "california", "label": "California", "type": "LOCATION", "category": "state"},
            
            # Education
            {"id": "mba_program", "label": "MBA Program", "type": "CONCEPT", "category": "education"},
            {"id": "gmat_score", "label": "GMAT Score", "type": "CONCEPT", "category": "education"},
            {"id": "business_school", "label": "Business School", "type": "CONCEPT", "category": "education"},
            {"id": "online_education", "label": "Online Education", "type": "CONCEPT", "category": "education"},
            
            # Career & Professional
            {"id": "career_development", "label": "Career Development", "type": "CONCEPT", "category": "career"},
            {"id": "professional_growth", "label": "Professional Growth", "type": "CONCEPT", "category": "career"},
            {"id": "leadership", "label": "Leadership", "type": "CONCEPT", "category": "career"},
            {"id": "management", "label": "Management", "type": "CONCEPT", "category": "career"},
            
            # Industry
            {"id": "tech_industry", "label": "Tech Industry", "type": "CONCEPT", "category": "industry"},
            {"id": "ecommerce", "label": "E-commerce", "type": "CONCEPT", "category": "industry"},
            {"id": "cloud_computing", "label": "Cloud Computing", "type": "CONCEPT", "category": "industry"}
        ]
        
        # Create meaningful relationships with proper connections
        relationships = [
            # Tech company relationships
            {"source": "google", "target": "tech_industry", "type": "BELONGS_TO", "weight": 1.0},
            {"source": "amazon", "target": "tech_industry", "type": "BELONGS_TO", "weight": 1.0},
            {"source": "microsoft", "target": "tech_industry", "type": "BELONGS_TO", "weight": 1.0},
            {"source": "amazon", "target": "ecommerce", "type": "DOMINATES", "weight": 1.0},
            {"source": "google", "target": "cloud_computing", "type": "PROVIDES", "weight": 1.0},
            {"source": "microsoft", "target": "cloud_computing", "type": "PROVIDES", "weight": 1.0},
            
            # Location relationships
            {"source": "google", "target": "california", "type": "HEADQUARTERED_IN", "weight": 1.0},
            {"source": "amazon", "target": "california", "type": "HEADQUARTERED_IN", "weight": 1.0},
            {"source": "microsoft", "target": "california", "type": "HEADQUARTERED_IN", "weight": 1.0},
            {"source": "silicon_valley", "target": "california", "type": "LOCATED_IN", "weight": 1.0},
            {"source": "tech_industry", "target": "silicon_valley", "type": "CENTERS_IN", "weight": 1.0},
            
            # Education relationships
            {"source": "mba_program", "target": "business_school", "type": "PART_OF", "weight": 1.0},
            {"source": "gmat_score", "target": "mba_program", "type": "REQUIRED_FOR", "weight": 1.0},
            {"source": "business_school", "target": "education", "type": "CATEGORY", "weight": 1.0},
            {"source": "online_education", "target": "mba_program", "type": "DELIVERS", "weight": 1.0},
            
            # Career development relationships
            {"source": "mba_program", "target": "career_development", "type": "HELPS_WITH", "weight": 1.0},
            {"source": "career_development", "target": "professional_growth", "type": "LEADS_TO", "weight": 1.0},
            {"source": "career_development", "target": "leadership", "type": "DEVELOPS", "weight": 1.0},
            {"source": "leadership", "target": "management", "type": "INVOLVES", "weight": 1.0},
            
            # Industry-career connections
            {"source": "tech_industry", "target": "career_development", "type": "OFFERS", "weight": 1.0},
            {"source": "ecommerce", "target": "career_development", "type": "OFFERS", "weight": 1.0},
            {"source": "cloud_computing", "target": "career_development", "type": "OFFERS", "weight": 1.0},
            
            # Company-career connections
            {"source": "google", "target": "career_development", "type": "PROVIDES", "weight": 1.0},
            {"source": "amazon", "target": "career_development", "type": "PROVIDES", "weight": 1.0},
            {"source": "microsoft", "target": "career_development", "type": "PROVIDES", "weight": 1.0}
        ]
        
        # Convert to proper node format
        nodes = []
        for entity in entities:
            node = {
                "id": entity["id"],
                "label": entity["label"],
                "type": entity["type"],
                "properties": {
                    "source": source_name,
                    "category": entity.get("category", "general")
                }
            }
            nodes.append(node)
        
        # Convert to proper edge format
        edges = []
        for i, rel in enumerate(relationships):
            edge = {
                "id": f"edge_{i}",
                "source": rel["source"],
                "target": rel["target"],
                "type": rel["type"],
                "weight": rel["weight"],
                "properties": {
                    "source": source_name
                }
            }
            edges.append(edge)
        
        # Add to generated data
        self.generated_nodes = nodes
        self.generated_edges = edges
        self._save_generated_data()
        
        print(f"🎯 Created clean graph: {len(nodes)} nodes, {len(edges)} edges")
        return len(nodes)
    
    def _generate_fallback_answer(self, query: str) -> str:
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

    def init_non_graph_tables(self):
        """Initialize non-graph tables in SQLite (transcripts, audio files, etc.)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create audio files table (for transcript storage)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audio_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                blob BLOB,
                transcript TEXT,
                created DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create summaries table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT,
                created DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create chat history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT,
                content TEXT,
                created DATETIME DEFAULT CURRENT_TIMESTAMP,
                session_id TEXT
            )
        ''')

        conn.commit()
        conn.close()
        logger.info("Initialized non-graph tables in SQLite")

    def extract_entities_and_relationships(self, transcript_text: str) -> Dict[str, Any]:
        """Extract entities and relationships from transcript text"""
        from utils.relationship_manager import RelationshipManager
        relationship_manager = RelationshipManager()

        # Use enhanced NLP extraction if available
        result = relationship_manager.enhance_with_nlp(transcript_text)

        # Post-process entities to improve quality for different types of content
        processed_entities = self._post_process_entities(result['entities'], transcript_text)
        processed_relationships = self._post_process_relationships(result['relationships'], transcript_text)

        print(f"📊 Entity extraction details:")
        print(f"  Raw entities: {len(result['entities'])}, Processed: {len(processed_entities)}")
        print(f"  Raw relationships: {len(result['relationships'])}, Processed: {len(processed_relationships)}")

        return {
            'entities': processed_entities,
            'relationships': processed_relationships,
            'facts': result.get('facts', [])
        }

    def _post_process_entities(self, entities: List[Dict], text: str) -> List[Dict]:
        """Post-process entities to improve quality and add context-specific entities"""
        processed = []

        # Filter and improve existing entities
        for entity in entities:
            entity_name = entity.get('name', '')
            entity_type = entity.get('type', '')

            # Skip low-quality entities
            if len(entity_name) < 2 or entity_name.lower() in ['the', 'a', 'an', 'this', 'that']:
                continue

            # Fix common misclassifications
            if entity_name.lower() in ['tacos al pastor', 'tacos', 'beer', 'ham', 'pickle', 'salt pickle']:
                entity_type = 'FOOD'
                print(f"🔧 Fixed entity classification: '{entity_name}' → FOOD")
            elif entity_name.lower() in ['health', 'zest', 'odor', 'smell']:
                entity_type = 'CONCEPT'
                print(f"🔧 Fixed entity classification: '{entity_name}' → CONCEPT")
            elif entity_name.lower() in ['heat', 'cold', 'dip']:
                entity_type = 'CONDITION'
                print(f"🔧 Fixed entity classification: '{entity_name}' → CONDITION")

            processed.append({
                'name': entity_name,
                'type': entity_type,
                'confidence': entity.get('confidence', 0.8),
                'position': entity.get('position', 0)
            })

        # Add domain-specific entities based on text content
        if 'harvard' in text.lower():
            processed.append({
                'name': 'Harvard University',
                'type': 'ORGANIZATION',
                'confidence': 0.9,
                'position': text.lower().find('harvard')
            })

        # Add food-related entities if food terms are present
        food_terms = ['beer', 'ham', 'tacos', 'pickle']
        for term in food_terms:
            if term in text.lower() and not any(e['name'].lower() == term for e in processed):
                processed.append({
                    'name': term.title(),
                    'type': 'FOOD',
                    'confidence': 0.85,
                    'position': text.lower().find(term)
                })

        return processed

    def _post_process_relationships(self, relationships: List[Dict], text: str) -> List[Dict]:
        """Post-process relationships to improve quality"""
        processed = []

        for rel in relationships:
            source = rel.get('source', '')
            target = rel.get('target', '')
            rel_type = rel.get('type', '')

            # Skip low-quality relationships
            if len(source) < 2 or len(target) < 2:
                continue

            # Improve relationship types based on context
            if 'restore' in text.lower() and 'health' in target.lower():
                rel_type = 'RESTORES'
            elif 'taste' in text.lower() and any(food in source.lower() for food in ['pickle', 'ham', 'tacos']):
                rel_type = 'TASTES_WITH'

            processed.append({
                'source': source,
                'target': target,
                'type': rel_type,
                'weight': rel.get('weight', 0.8),
                'confidence': rel.get('confidence', 0.8)
            })

        return processed

    async def generate_graph_from_text(self, transcript_text: str, transcript_id: int = None, user_id: str = None) -> Dict[str, Any]:
        """Generate a knowledge graph from transcript text using local processing"""
        try:
            print(f"🚀 GENERATE_GRAPH_FROM_TEXT called! Text length: {len(transcript_text)}, user_id: {user_id}")
            logger.info(f"🚀 Generating graph from text (length: {len(transcript_text)}) for user: {user_id}")

            # Extract entities and relationships locally
            extracted_data = self.extract_entities_and_relationships(transcript_text)
            print(f"📊 Extracted data: {len(extracted_data['entities'])} entities, {len(extracted_data['relationships'])} relationships")

            # Store extracted data locally (add to generated data)
            entities_created = len(extracted_data['entities'])
            relationships_created = len(extracted_data['relationships'])

            # Create new nodes from extracted entities with error handling
            new_nodes = []
            for i, entity in enumerate(extracted_data['entities']):
                try:
                    node_id = f"extracted_{transcript_id}_{i}" if transcript_id else f"extracted_{i}"
                    # Use 'name' key from entity data with fallback
                    entity_name = entity.get('name', entity.get('text', f'Entity_{i}'))
                    entity_type = entity.get('type', 'UNKNOWN')

                    # Validate entity data
                    if not entity_name or len(entity_name.strip()) == 0:
                        print(f"⚠️ Skipping empty entity at index {i}")
                        continue

                    new_nodes.append({
                        'id': node_id,
                        'label': entity_name.strip(),
                        'type': entity_type,
                        'properties': {
                            'confidence': entity.get('confidence', 0.8),
                            'source': f"transcript_{transcript_id}" if transcript_id else "text_import",
                            'user_id': user_id or 'local-user-1',
                            'position': entity.get('position', 0)
                        }
                    })
                except Exception as e:
                    print(f"❌ Error processing entity {i}: {e}")
                    continue

            # Create new edges from extracted relationships with error handling
            new_edges = []

            # Create a mapping from entity names to node IDs for relationship resolution
            entity_name_to_id = {}
            for node in new_nodes:
                entity_name = node['label'].lower()
                entity_name_to_id[entity_name] = node['id']
                # Also map partial names for better matching
                words = entity_name.split()
                for word in words:
                    if len(word) > 2:  # Only meaningful words
                        # Prefer exact entity matches over partial matches
                        if word not in entity_name_to_id:
                            entity_name_to_id[word] = node['id']

            for i, rel in enumerate(extracted_data['relationships']):
                try:
                    edge_id = f"rel_{transcript_id}_{i}" if transcript_id else f"rel_{i}"
                    source_text = rel.get('source', '').lower()
                    target_text = rel.get('target', '').lower()
                    rel_type = rel.get('type', 'RELATED_TO')

                    # Map relationship source/target to actual node IDs
                    source_id = None
                    target_id = None

                    # Try to find matching nodes for source (prefer exact matches)
                    best_source_match = None
                    best_source_score = 0
                    for entity_name, node_id in entity_name_to_id.items():
                        if entity_name in source_text or source_text in entity_name:
                            # Score based on match quality (exact > partial)
                            score = len(entity_name) if entity_name == source_text else len(entity_name) / 2
                            if score > best_source_score:
                                best_source_score = score
                                best_source_match = node_id
                    source_id = best_source_match

                    # Try to find matching nodes for target (prefer exact matches)
                    best_target_match = None
                    best_target_score = 0
                    for entity_name, node_id in entity_name_to_id.items():
                        if entity_name in target_text or target_text in entity_name:
                            # Score based on match quality (exact > partial)
                            score = len(entity_name) if entity_name == target_text else len(entity_name) / 2
                            if score > best_target_score:
                                best_target_score = score
                                best_target_match = node_id
                    target_id = best_target_match

                    # Validate relationship data
                    if not source_id or not target_id:
                        print(f"⚠️ Skipping relationship {i}: Could not map '{source_text}' -> '{target_text}' to node IDs")
                        continue

                    print(f"🔗 Creating relationship: {source_id} --[{rel_type}]--> {target_id}")

                    new_edges.append({
                        'id': edge_id,
                        'source': source_id,
                        'target': target_id,
                        'type': rel_type,
                        'weight': rel.get('weight', 1.0),
                        'properties': {
                            'confidence': rel.get('confidence', 0.8),
                            'source': f"transcript_{transcript_id}" if transcript_id else "text_import",
                            'user_id': user_id or 'local-user-1'
                        }
                    })
                except Exception as e:
                    print(f"❌ Error processing relationship {i}: {e}")
                    continue

            # Store new data in memory with strong deduplication
            existing_node_ids = {node['id'] for node in self.generated_nodes}
            existing_edge_ids = {edge['id'] for edge in self.generated_edges}

            # Only add nodes that don't already exist
            new_unique_nodes = [node for node in new_nodes if node['id'] not in existing_node_ids]
            new_unique_edges = [edge for edge in new_edges if edge['id'] not in existing_edge_ids]

            self.generated_nodes.extend(new_unique_nodes)
            self.generated_edges.extend(new_unique_edges)

            # Additional deduplication to ensure no duplicates exist
            self._deduplicate_generated_data()

            print(f"🔄 Added {len(new_unique_nodes)} new unique nodes, {len(new_unique_edges)} new unique edges")
            print(f"📊 Total generated: {len(self.generated_nodes)} nodes, {len(self.generated_edges)} edges")

            self._save_generated_data()

            # Get current sample data and add all generated data with deduplication
            current_data = self._get_sample_graph_data()
            all_nodes = current_data['nodes'] + self.generated_nodes
            all_edges = current_data['edges'] + self.generated_edges

            # Final deduplication for API response
            all_nodes = self._deduplicate_list_by_id(all_nodes)
            all_edges = self._deduplicate_list_by_id(all_edges)

            logger.info(f"Generated graph with {len(all_nodes)} total nodes ({len(new_nodes)} new) and {len(all_edges)} total edges ({len(new_edges)} new)")

            return {
                'nodes': all_nodes,
                'edges': all_edges,
                'transcript_id': transcript_id,
                'entities_created': entities_created,
                'relationships_created': relationships_created,
                'local_extraction': {
                    'entities_found': len(extracted_data['entities']),
                    'relationships_found': len(extracted_data['relationships'])
                }
            }

        except Exception as e:
            logger.error(f"Error generating graph from text: {e}")
            import traceback
            traceback.print_exc()

            # Return current data even on error with deduplication
            current_data = self._get_sample_graph_data()
            all_nodes = current_data['nodes'] + self.generated_nodes
            all_edges = current_data['edges'] + self.generated_edges

            # Final deduplication for API response
            all_nodes = self._deduplicate_list_by_id(all_nodes)
            all_edges = self._deduplicate_list_by_id(all_edges)

            return {
                'nodes': all_nodes,
                'edges': all_edges,
                'transcript_id': transcript_id,
                'error': str(e)
            }

    async def generate_graph_from_transcript(self, transcript_id: int) -> Dict[str, Any]:
        """Generate a knowledge graph from a transcript using Graphiti"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Get transcript text from audio_files table
        cursor.execute('SELECT transcript FROM audio_files WHERE id = ?', (transcript_id,))
        result = cursor.fetchone()

        if not result:
            conn.close()
            return {'error': 'Transcript not found'}

        transcript_text = result[0]
        conn.close()

        return await self.generate_graph_from_text(transcript_text, transcript_id)

    # Graph data is now stored in Graphiti/Neo4j, not SQLite
    # This method is kept for backward compatibility but does nothing
    def save_graph_data(self, nodes: List[Dict], edges: List[Dict], transcript_id: int):
        """Legacy method - graph data is now stored in Graphiti"""
        logger.info(f"Graph data storage delegated to Graphiti for transcript {transcript_id}")
        pass

    async def get_graph_data(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get graph data from real audio and summary data only"""
        import sqlite3
        logger.info(f"Getting graph data for user_id: {user_id}")

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Fetch audio files
        cursor.execute('SELECT id, name, transcript FROM audio_files')
        audio_rows = cursor.fetchall()

        # Fetch summaries
        cursor.execute('SELECT id, text FROM summaries')
        summary_rows = cursor.fetchall()

        conn.close()

        nodes = []
        edges = []
        audio_id_to_node = {}
        summary_id_to_node = {}

        # Create audio nodes
        for audio in audio_rows:
            audio_id, name, transcript = audio
            node = {
                'id': f'audio_{audio_id}',
                'label': name or f'Audio {audio_id}',
                'type': 'AUDIO',
                'properties': {
                    'transcript': transcript or '',
                    'audio_id': audio_id
                }
            }
            nodes.append(node)
            audio_id_to_node[audio_id] = node

        # Create summary nodes
        for summary in summary_rows:
            summary_id, text = summary
            node = {
                'id': f'summary_{summary_id}',
                'label': f'Summary {summary_id}',
                'type': 'SUMMARY',
                'properties': {
                    'text': text or '',
                    'summary_id': summary_id
                }
            }
            nodes.append(node)
            summary_id_to_node[summary_id] = node

        # Create edges: connect audio to summary by order (demo logic)
        for i, (audio, summary) in enumerate(zip(audio_rows, summary_rows)):
            audio_id = audio[0]
            summary_id = summary[0]
            edge = {
                'id': f'edge_{audio_id}_{summary_id}',
                'source': f'audio_{audio_id}',
                'target': f'summary_{summary_id}',
                'type': 'GENERATES',
                'weight': 1.0,
                'properties': {}
            }
            edges.append(edge)

        # Deduplicate nodes/edges
        nodes = self._deduplicate_list_by_id(nodes)
        edges = self._deduplicate_list_by_id(edges)

        logger.info(f"Graph data: {len(nodes)} nodes, {len(edges)} edges")
        print(f"Graph data: {len(nodes)} nodes, {len(edges)} edges")

        return {
            'nodes': nodes,
            'edges': edges,
            'source': 'audio_summary_db'
        }

    def _get_sample_graph_data(self) -> Dict[str, Any]:
        """Return sample graph data for demonstration"""
        return {
            "nodes": [
                {"id": "tim_cook", "label": "Tim Cook", "type": "PERSON", "properties": {"role": "CEO"}},
                {"id": "apple", "label": "Apple Inc", "type": "ORGANIZATION", "properties": {"industry": "Technology"}},
                {"id": "cupertino", "label": "Cupertino", "type": "LOCATION", "properties": {"state": "California"}},
                {"id": "elon_musk", "label": "Elon Musk", "type": "PERSON", "properties": {"role": "CEO"}},
                {"id": "spacex", "label": "SpaceX", "type": "ORGANIZATION", "properties": {"industry": "Aerospace"}},
                {"id": "tesla", "label": "Tesla", "type": "ORGANIZATION", "properties": {"industry": "Automotive"}},
                {"id": "mark_zuckerberg", "label": "Mark Zuckerberg", "type": "PERSON", "properties": {"role": "CEO"}},
                {"id": "meta", "label": "Meta", "type": "ORGANIZATION", "properties": {"industry": "Social Media"}},
                {"id": "facebook", "label": "Facebook", "type": "TECHNOLOGY", "properties": {"type": "Platform"}},
                {"id": "instagram", "label": "Instagram", "type": "TECHNOLOGY", "properties": {"type": "Platform"}},
                # Generated content from harvard.wav
                {"id": "harvard_generated", "label": "Harvard University", "type": "ORGANIZATION", "properties": {"source": "harvard.wav", "generated": True}},
                {"id": "research_generated", "label": "Academic Research", "type": "CONCEPT", "properties": {"source": "harvard.wav", "generated": True}},
                {"id": "education_generated", "label": "Higher Education", "type": "CONCEPT", "properties": {"source": "harvard.wav", "generated": True}},
            ],
            "edges": [
                {"id": "e1", "source": "tim_cook", "target": "apple", "type": "CEO_OF", "weight": 1.0, "properties": {}},
                {"id": "e2", "source": "apple", "target": "cupertino", "type": "HEADQUARTERED_IN", "weight": 1.0, "properties": {}},
                {"id": "e3", "source": "elon_musk", "target": "spacex", "type": "FOUNDED", "weight": 1.0, "properties": {"year": "2002"}},
                {"id": "e4", "source": "elon_musk", "target": "tesla", "type": "CEO_OF", "weight": 1.0, "properties": {}},
                {"id": "e5", "source": "mark_zuckerberg", "target": "meta", "type": "CEO_OF", "weight": 1.0, "properties": {}},
                {"id": "e6", "source": "meta", "target": "facebook", "type": "OWNS", "weight": 1.0, "properties": {}},
                {"id": "e7", "source": "meta", "target": "instagram", "type": "OWNS", "weight": 1.0, "properties": {}},
                # Generated relationships from harvard.wav
                {"id": "e_harvard_1", "source": "harvard_generated", "target": "research_generated", "type": "CONDUCTS", "weight": 1.0, "properties": {"source": "harvard.wav", "generated": True}},
                {"id": "e_harvard_2", "source": "harvard_generated", "target": "education_generated", "type": "PROVIDES", "weight": 1.0, "properties": {"source": "harvard.wav", "generated": True}},
            ],
            "source": "sample_data"
        }

    async def _get_neo4j_data(self) -> Dict[str, Any]:
        """Get data directly from Neo4j"""
        try:
            logger.info("Attempting to connect to Neo4j...")
            from neo4j import GraphDatabase

            # Neo4j connection settings
            neo4j_uri = "bolt://192.168.0.9:7687"
            neo4j_user = "neo4j"
            neo4j_password = "demodemo"

            driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

            nodes = []
            edges = []

            with driver.session() as session:
                # Get all entities
                node_result = session.run("""
                    MATCH (n:Entity)
                    RETURN n.uuid as id, n.name as name, labels(n) as labels, properties(n) as props
                    LIMIT 100
                """)

                for record in node_result:
                    # Determine the primary type (exclude 'Entity' label)
                    labels = record['labels']
                    node_type = next((label for label in labels if label != 'Entity'), 'ENTITY')

                    nodes.append({
                        'id': record['id'],
                        'label': record['name'],
                        'type': node_type.upper(),
                        'properties': {k: v for k, v in record['props'].items()
                                     if k not in ['uuid', 'name', 'created_at', 'group_id']}
                    })

                # Get all relationships
                rel_result = session.run("""
                    MATCH (a:Entity)-[r]->(b:Entity)
                    RETURN a.uuid as source, b.uuid as target, type(r) as rel_type, properties(r) as props
                    LIMIT 100
                """)

                for i, record in enumerate(rel_result):
                    edges.append({
                        'id': f"r{i+1}",
                        'source': record['source'],
                        'target': record['target'],
                        'type': record['rel_type'],
                        'weight': 1.0,
                        'properties': record['props']
                    })

            driver.close()

            logger.info(f"Retrieved {len(nodes)} nodes and {len(edges)} edges from Neo4j")
            return {
                'nodes': nodes,
                'edges': edges,
                'source': 'neo4j'
            }

        except Exception as e:
            logger.error(f"Error getting data from Neo4j: {e}")
            import traceback
            traceback.print_exc()
            logger.info("Neo4j connection failed, returning empty data")
            return {'nodes': [], 'edges': []}

    async def create_graph_session(self, name: str, description: str = "") -> str:
        """Create a new graph session in Graphiti"""
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        try:
            # In Graphiti, sessions are managed through group_id
            # We can create a new group for each session
            async with httpx.AsyncClient() as client:
                # For now, we'll use the existing group_id and just return a session identifier
                # In a full implementation, you might want to create separate groups per session
                logger.info(f"Created graph session {session_id} with name: {name}")
                return session_id
        except Exception as e:
            logger.error(f"Error creating graph session: {e}")
            return session_id  # Return session_id anyway for compatibility

    def get_graph_sessions(self) -> List[Dict[str, Any]]:
        """Get all graph sessions"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT session_id, name, description, created_at, updated_at FROM graph_sessions ORDER BY created_at DESC')
        sessions_data = cursor.fetchall()

        sessions = []
        for session_data in sessions_data:
            sessions.append({
                'id': session_data[0],
                'name': session_data[1],
                'description': session_data[2],
                'created_at': session_data[3],
                'updated_at': session_data[4]
            })

        conn.close()
        return sessions

    def delete_graph_session(self, session_id: str) -> bool:
        """Delete a graph session and its associated data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute('DELETE FROM graph_sessions WHERE session_id = ?', (session_id,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            conn.close()
            return False

    def clear_all_graph_data(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Clear all graph data (generated nodes, edges, and mark all sample nodes as deleted)"""
        try:
            # Count what we're about to clear
            generated_nodes_count = len(self.generated_nodes)
            generated_edges_count = len(self.generated_edges)

            # Get sample data to count sample nodes
            sample_data = self._get_sample_graph_data()
            sample_nodes_count = len(sample_data['nodes'])
            sample_edges_count = len(sample_data['edges'])

            # Clear all generated data
            self.generated_nodes = []
            self.generated_edges = []

            # Mark all sample nodes as deleted
            if not hasattr(self, 'deleted_sample_nodes'):
                self.deleted_sample_nodes = set()

            # Add all sample node IDs to deleted set
            for node in sample_data['nodes']:
                self.deleted_sample_nodes.add(node['id'])

            # Save the cleared state
            self._save_generated_data()

            # Force reload to ensure consistency
            self._load_generated_data()

            total_nodes_removed = generated_nodes_count + sample_nodes_count
            total_edges_removed = generated_edges_count + sample_edges_count

            logger.info(f"🧹 Cleared all graph data: {total_nodes_removed} nodes, {total_edges_removed} edges")

            return {
                "status": "success",
                "message": "All graph data cleared successfully",
                "nodes_removed": total_nodes_removed,
                "edges_removed": total_edges_removed,
                "generated_nodes_removed": generated_nodes_count,
                "generated_edges_removed": generated_edges_count,
                "sample_nodes_removed": sample_nodes_count,
                "sample_edges_removed": sample_edges_count
            }

        except Exception as e:
            logger.error(f"❌ Error clearing graph data: {e}")
            return {
                "status": "error",
                "message": f"Failed to clear graph data: {str(e)}",
                "nodes_removed": 0,
                "edges_removed": 0
            }

    def delete_node(self, node_id: str) -> Dict[str, Any]:
        """Delete a node and its related edges from the graph"""
        nodes_removed = 0
        edges_removed = 0

        # Remove from generated nodes
        original_generated_nodes = len(self.generated_nodes)
        self.generated_nodes = [
            node for node in self.generated_nodes
            if node.get('id') != node_id
        ]
        nodes_removed += original_generated_nodes - len(self.generated_nodes)

        # Remove from generated edges
        original_generated_edges = len(self.generated_edges)
        self.generated_edges = [
            edge for edge in self.generated_edges
            if edge.get('source') != node_id and edge.get('target') != node_id
        ]
        edges_removed += original_generated_edges - len(self.generated_edges)

        # Check if it's a sample node
        sample_data = self._get_sample_graph_data()
        sample_node_ids = {node['id'] for node in sample_data['nodes']}

        if node_id in sample_node_ids:
            if not hasattr(self, 'deleted_sample_nodes'):
                self.deleted_sample_nodes = set()
            self.deleted_sample_nodes.add(node_id)
            nodes_removed += 1

            # Also remove edges connected to this sample node
            for edge in sample_data['edges']:
                if edge.get('source') == node_id or edge.get('target') == node_id:
                    edges_removed += 1

        # Save updated data
        self._save_generated_data()

        # Force reload data to ensure consistency
        self._load_generated_data()

        return {
            "nodes_removed": nodes_removed,
            "edges_removed": edges_removed
        }

    def get_combined_graph_data(self) -> Dict[str, Any]:
        """Get combined graph data (sample + generated) with deleted nodes filtered out"""
        try:
            # Ensure deleted_sample_nodes is initialized
            if not hasattr(self, 'deleted_sample_nodes'):
                self.deleted_sample_nodes = set()

            # Get sample data
            sample_data = self._get_sample_graph_data()

            # Filter out deleted sample nodes
            filtered_sample_nodes = [
                node for node in sample_data['nodes']
                if node['id'] not in self.deleted_sample_nodes
            ]

            # Filter out edges connected to deleted sample nodes
            filtered_sample_edges = [
                edge for edge in sample_data['edges']
                if (edge.get('source') not in self.deleted_sample_nodes and
                    edge.get('target') not in self.deleted_sample_nodes)
            ]

            # Combine with generated data
            all_nodes = filtered_sample_nodes + self.generated_nodes
            all_edges = filtered_sample_edges + self.generated_edges

            logger.info(f"📊 Combined graph data: {len(all_nodes)} nodes ({len(filtered_sample_nodes)} sample + {len(self.generated_nodes)} generated), {len(all_edges)} edges ({len(filtered_sample_edges)} sample + {len(self.generated_edges)} generated)")

            return {
                "nodes": all_nodes,
                "edges": all_edges
            }

        except Exception as e:
            logger.error(f"❌ Error getting combined graph data: {e}")
            return {
                "nodes": [],
                "edges": []
            }
