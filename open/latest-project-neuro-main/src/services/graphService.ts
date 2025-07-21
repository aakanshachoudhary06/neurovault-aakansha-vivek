const API_BASE_URL = 'http://localhost:5001';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  properties?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphSession {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ImportResponse {
  message: string;
  content_length: number;
  entities_created: number;
  title?: string;
}

class GraphService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getGraphData(userId?: string): Promise<GraphData> {
    try {
      // Use the main graph endpoint that supports clear/delete operations
      const url = `${this.baseUrl}/graph${userId ? `?user_id=${userId}` : ''}`;
      console.log('🌐 GraphService: Fetching from URL:', url);

      const response = await fetch(url);
      console.log('📡 GraphService: Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 GraphService: Raw response data:', data);
      console.log('📈 GraphService: Data summary:', {
        hasNodes: !!data.nodes,
        hasEdges: !!data.edges,
        nodeCount: data.nodes?.length || 0,
        edgeCount: data.edges?.length || 0
      });

      return data;
    } catch (error) {
      console.error('❌ GraphService: Error fetching graph data:', error);
      throw error;
    }
  }

  async generateGraphFromTranscript(transcriptId: number, transcriptText: string): Promise<GraphData> {
    try {
      const response = await fetch(`${this.baseUrl}/graph/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript_text: transcriptText,
          transcript_id: transcriptId
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating graph from transcript:', error);
      throw error;
    }
  }

  async getGraphSessions(): Promise<GraphSession[]> {
    try {
      const response = await fetch(`${this.baseUrl}/graph/sessions`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching graph sessions:', error);
      throw error;
    }
  }

  async createGraphSession(name: string, description: string = ''): Promise<GraphSession> {
    try {
      const response = await fetch(`${this.baseUrl}/graph/sessions?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating graph session:', error);
      throw error;
    }
  }

  async deleteGraphSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/graph/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting graph session:', error);
      throw error;
    }
  }

  async importTextToKnowledgeGraph(text: string, title?: string): Promise<ImportResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/kg/text/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          title: title
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error importing text to knowledge graph:', error);
      throw error;
    }
  }

  async addTranscriptToGraph(transcript: string, userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/graph/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript, user_id: userId }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error adding transcript to graph:', error);
      throw error;
    }
  }

  async removeContentFromGraph(content: string, userId: string = 'local-user-1'): Promise<any> {
    try {
      // First, get current graph data to find nodes that might be related to this content
      const graphData = await this.getGraphData(userId);

      // Find nodes that might be related to the content being deleted
      // Use a more sophisticated matching approach
      const contentLower = content.toLowerCase();
      const nodesToDelete: string[] = [];

      // Extract key terms from content (simple word extraction)
      const contentWords = contentLower
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2) // Only consider words longer than 2 characters
        .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'way', 'why'].includes(word));

      for (const node of graphData.nodes) {
        // Only consider generated nodes from text import
        if (node.properties?.source === 'text_import' && node.properties?.user_id === userId) {
          const labelLower = node.label.toLowerCase();

          // Check if the node label matches any significant words from the content
          const labelWords = labelLower
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);

          // If any word from the label appears in the content words, consider it for deletion
          const hasMatch = labelWords.some(labelWord =>
            contentWords.some(contentWord =>
              contentWord.includes(labelWord) || labelWord.includes(contentWord)
            )
          );

          if (hasMatch) {
            nodesToDelete.push(node.id);
          }
        }
      }

      console.log(`🗑️ Found ${nodesToDelete.length} nodes to delete based on content: "${content.substring(0, 50)}..."`);

      // Delete each identified node
      const deleteResults = [];
      for (const nodeId of nodesToDelete) {
        try {
          const response = await fetch(`${this.baseUrl}/graph/node/${nodeId}?user_id=${userId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();
            deleteResults.push({ nodeId, success: true, result });
            console.log(`✅ Deleted node ${nodeId} from graph`);
          } else {
            deleteResults.push({ nodeId, success: false, error: `HTTP ${response.status}` });
            console.warn(`⚠️ Failed to delete node ${nodeId}: HTTP ${response.status}`);
          }
        } catch (error) {
          deleteResults.push({ nodeId, success: false, error: error.message });
          console.error(`❌ Error deleting node ${nodeId}:`, error);
        }
      }

      return {
        status: 'success',
        message: `Processed ${nodesToDelete.length} nodes for deletion`,
        results: deleteResults,
        nodesProcessed: nodesToDelete.length,
        nodesDeleted: deleteResults.filter(r => r.success).length
      };

    } catch (error) {
      console.error('Error removing content from knowledge graph:', error);
      throw error;
    }
  }

  // Helper method to convert graph data to D3.js format
  convertToD3Format(graphData: GraphData) {
    return {
      nodes: graphData.nodes.map(node => ({
        id: node.id,
        label: node.label,
        type: node.type,
        ...node.properties
      })),
      links: graphData.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        weight: edge.weight || 1,
        ...edge.properties
      }))
    };
  }
}

export const graphService = new GraphService();
export default graphService; 