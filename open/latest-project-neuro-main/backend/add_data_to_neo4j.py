#!/usr/bin/env python3
"""
Directly add test data to Neo4j to bypass Graphiti LLM issues
"""

from neo4j import GraphDatabase
import json
import logging
from datetime import datetime
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Neo4j connection settings
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "demodemo"

class Neo4jDataLoader:
    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    def close(self):
        self.driver.close()
    
    def clear_database(self):
        """Clear all data from the database"""
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
            logger.info("Database cleared")
    
    def create_entity(self, name, entity_type, properties=None):
        """Create an entity node"""
        if properties is None:
            properties = {}
        
        entity_uuid = str(uuid.uuid4())
        properties.update({
            'uuid': entity_uuid,
            'name': name,
            'created_at': datetime.now().isoformat(),
            'group_id': 'neurovault-kb'
        })
        
        with self.driver.session() as session:
            query = f"""
            CREATE (e:Entity:{entity_type} {{
                uuid: $uuid,
                name: $name,
                created_at: $created_at,
                group_id: $group_id
            }})
            SET e += $properties
            RETURN e
            """
            result = session.run(query, {
                'uuid': entity_uuid,
                'name': name,
                'created_at': properties['created_at'],
                'group_id': properties['group_id'],
                'properties': properties
            })
            logger.info(f"Created entity: {name} ({entity_type})")
            return entity_uuid
    
    def create_relationship(self, source_uuid, target_uuid, rel_type, properties=None):
        """Create a relationship between two entities"""
        if properties is None:
            properties = {}
        
        with self.driver.session() as session:
            query = f"""
            MATCH (a:Entity {{uuid: $source_uuid}})
            MATCH (b:Entity {{uuid: $target_uuid}})
            CREATE (a)-[r:{rel_type}]->(b)
            SET r += $properties
            RETURN r
            """
            result = session.run(query, {
                'source_uuid': source_uuid,
                'target_uuid': target_uuid,
                'properties': properties
            })
            logger.info(f"Created relationship: {rel_type}")
    
    def load_sample_data(self):
        """Load sample knowledge graph data"""
        logger.info("Loading sample data...")
        
        # Create entities
        entities = {}
        
        # People
        entities['tim_cook'] = self.create_entity("Tim Cook", "Person", {"role": "CEO", "company": "Apple"})
        entities['elon_musk'] = self.create_entity("Elon Musk", "Person", {"role": "CEO", "companies": "Tesla, SpaceX"})
        entities['mark_zuckerberg'] = self.create_entity("Mark Zuckerberg", "Person", {"role": "CEO", "company": "Meta"})
        
        # Organizations
        entities['apple'] = self.create_entity("Apple Inc", "Organization", {"industry": "Technology", "type": "Company"})
        entities['tesla'] = self.create_entity("Tesla", "Organization", {"industry": "Automotive", "type": "Company"})
        entities['spacex'] = self.create_entity("SpaceX", "Organization", {"industry": "Aerospace", "type": "Company"})
        entities['meta'] = self.create_entity("Meta", "Organization", {"industry": "Social Media", "type": "Company"})
        
        # Locations
        entities['cupertino'] = self.create_entity("Cupertino", "Location", {"state": "California", "country": "USA"})
        entities['palo_alto'] = self.create_entity("Palo Alto", "Location", {"state": "California", "country": "USA"})
        
        # Technologies/Products
        entities['facebook'] = self.create_entity("Facebook", "Technology", {"type": "Social Platform"})
        entities['instagram'] = self.create_entity("Instagram", "Technology", {"type": "Social Platform"})
        entities['model_s'] = self.create_entity("Model S", "Technology", {"type": "Electric Vehicle"})
        
        # Create relationships
        self.create_relationship(entities['tim_cook'], entities['apple'], "CEO_OF")
        self.create_relationship(entities['elon_musk'], entities['tesla'], "CEO_OF")
        self.create_relationship(entities['elon_musk'], entities['spacex'], "FOUNDED", {"year": "2002"})
        self.create_relationship(entities['mark_zuckerberg'], entities['meta'], "CEO_OF")
        
        self.create_relationship(entities['apple'], entities['cupertino'], "HEADQUARTERED_IN")
        self.create_relationship(entities['tesla'], entities['palo_alto'], "HEADQUARTERED_IN")
        
        self.create_relationship(entities['meta'], entities['facebook'], "OWNS")
        self.create_relationship(entities['meta'], entities['instagram'], "OWNS")
        self.create_relationship(entities['tesla'], entities['model_s'], "MANUFACTURES")
        
        logger.info("Sample data loaded successfully!")
    
    def get_stats(self):
        """Get database statistics"""
        with self.driver.session() as session:
            # Count nodes
            node_result = session.run("MATCH (n) RETURN count(n) as count")
            node_count = node_result.single()['count']
            
            # Count relationships
            rel_result = session.run("MATCH ()-[r]->() RETURN count(r) as count")
            rel_count = rel_result.single()['count']
            
            # Get labels
            labels_result = session.run("CALL db.labels() YIELD label RETURN collect(label) as labels")
            labels = labels_result.single()['labels']
            
            # Get relationship types
            types_result = session.run("CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) as types")
            rel_types = types_result.single()['types']
            
            return {
                'nodes': node_count,
                'relationships': rel_count,
                'labels': labels,
                'relationship_types': rel_types
            }

def main():
    """Main function"""
    loader = Neo4jDataLoader()
    
    try:
        logger.info("🔄 Starting Neo4j data loading...")
        
        # Clear existing data
        loader.clear_database()
        
        # Load sample data
        loader.load_sample_data()
        
        # Get stats
        stats = loader.get_stats()
        
        logger.info("✅ Data loading completed!")
        logger.info(f"📊 Database Stats:")
        logger.info(f"   Nodes: {stats['nodes']}")
        logger.info(f"   Relationships: {stats['relationships']}")
        logger.info(f"   Labels: {stats['labels']}")
        logger.info(f"   Relationship Types: {stats['relationship_types']}")
        
        print("\n" + "="*50)
        print("🎉 SUCCESS! Neo4j now contains sample data")
        print("="*50)
        print(f"Nodes: {stats['nodes']}")
        print(f"Relationships: {stats['relationships']}")
        print(f"Labels: {', '.join(stats['labels'])}")
        print(f"Relationship Types: {', '.join(stats['relationship_types'])}")
        print("\nYou can now query the data using:")
        print("1. Neo4j Browser: http://localhost:7474")
        print("2. Python script: python query_neo4j.py")
        print("3. Backend API: curl http://localhost:18000/graph")
        
    except Exception as e:
        logger.error(f"Error: {e}")
    
    finally:
        loader.close()

if __name__ == "__main__":
    main()
