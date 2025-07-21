#!/usr/bin/env python3
"""
Create sample graph data directly in the backend
"""

import asyncio
import httpx
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BACKEND_URL = "http://localhost:18000"

async def create_sample_nodes_and_edges():
    """Create sample nodes and edges directly"""
    
    # Sample data
    nodes = [
        {"id": "tim_cook", "name": "Tim Cook", "type": "PERSON", "properties": {"role": "CEO"}},
        {"id": "apple", "name": "Apple Inc", "type": "ORGANIZATION", "properties": {"industry": "Technology"}},
        {"id": "cupertino", "name": "Cupertino", "type": "LOCATION", "properties": {"state": "California"}},
        {"id": "elon_musk", "name": "Elon Musk", "type": "PERSON", "properties": {"role": "CEO"}},
        {"id": "spacex", "name": "SpaceX", "type": "ORGANIZATION", "properties": {"industry": "Aerospace"}},
        {"id": "tesla", "name": "Tesla", "type": "ORGANIZATION", "properties": {"industry": "Automotive"}},
        {"id": "mark_zuckerberg", "name": "Mark Zuckerberg", "type": "PERSON", "properties": {"role": "CEO"}},
        {"id": "meta", "name": "Meta", "type": "ORGANIZATION", "properties": {"industry": "Social Media"}},
        {"id": "facebook", "name": "Facebook", "type": "TECHNOLOGY", "properties": {"type": "Platform"}},
        {"id": "instagram", "name": "Instagram", "type": "TECHNOLOGY", "properties": {"type": "Platform"}},
    ]
    
    edges = [
        {"source": "tim_cook", "target": "apple", "type": "CEO_OF", "properties": {}},
        {"source": "apple", "target": "cupertino", "type": "HEADQUARTERED_IN", "properties": {}},
        {"source": "elon_musk", "target": "spacex", "type": "FOUNDED", "properties": {"year": "2002"}},
        {"source": "elon_musk", "target": "tesla", "type": "CEO_OF", "properties": {}},
        {"source": "mark_zuckerberg", "target": "meta", "type": "CEO_OF", "properties": {}},
        {"source": "meta", "target": "facebook", "type": "OWNS", "properties": {}},
        {"source": "meta", "target": "instagram", "type": "OWNS", "properties": {}},
    ]
    
    return {"nodes": nodes, "edges": edges}

async def test_direct_graph_creation():
    """Test creating graph data directly"""
    
    # Create sample data
    graph_data = await create_sample_nodes_and_edges()
    
    logger.info(f"Created sample graph with {len(graph_data['nodes'])} nodes and {len(graph_data['edges'])} edges")
    
    # For now, let's just save this to a JSON file that the frontend can use
    with open("sample_graph_data.json", "w") as f:
        json.dump(graph_data, f, indent=2)
    
    logger.info("Sample graph data saved to sample_graph_data.json")
    
    # Test the backend API to see current state
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_URL}/graph")
            if response.status_code == 200:
                current_data = response.json()
                logger.info(f"Current backend graph: {len(current_data.get('nodes', []))} nodes, {len(current_data.get('edges', []))} edges")
            else:
                logger.error(f"Failed to get current graph data: {response.status_code}")
    except Exception as e:
        logger.error(f"Error checking backend: {e}")
    
    return graph_data

async def main():
    """Main function"""
    try:
        result = await test_direct_graph_creation()
        logger.info("✅ Sample graph creation completed!")
        
        # Print the data for verification
        print("\n" + "="*50)
        print("SAMPLE GRAPH DATA:")
        print("="*50)
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        logger.error(f"Error in main: {e}")

if __name__ == "__main__":
    asyncio.run(main())
