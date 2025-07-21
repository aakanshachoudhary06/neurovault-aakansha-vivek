import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Search, RefreshCw, Plus, Maximize2, Layers, Trash2, X } from 'lucide-react';
import graphService, { GraphData, GraphNode, GraphEdge } from '../services/graphService';
import Graph3D from './Graph3D';

export default function PremiumGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [is3D, setIs3D] = useState(true);
  const [camera3D, setCamera3D] = useState<{ position: [number, number, number], zoom: number }>({
    position: [0, 0, 70],
    zoom: 1
  });
  const [deletingNodeId, setDeletingNodeId] = useState<string | null>(null);
  const [renderKey, setRenderKey] = useState(0); // Force re-render key

  // Convert graph data to visual format with better positioning
  const visualNodes = graphData.nodes.map((node, index) => {
    const connections = graphData.edges.filter(edge =>
      edge.source === node.id || edge.target === node.id
    ).length;

    // Better color scheme based on node type
    const getNodeColor = (type: string) => {
      switch (type) {
        case 'PERSON': return '#00F0FF';
        case 'ORGANIZATION': return '#FF6B6B';
        case 'LOCATION': return '#4ECDC4';
        case 'TECHNOLOGY': return '#FFD93D';
        default: return '#9B59B6';
      }
    };

    // Improved positioning using force-directed layout simulation
    const angle = (index * 2 * Math.PI) / graphData.nodes.length;
    const radius = 150 + connections * 30;

    return {
      ...node,
      x: 400 + Math.cos(angle) * radius,
      y: 300 + Math.sin(angle) * radius,
      size: 15 + Math.min(connections * 5, 25),
      color: getNodeColor(node.type),
      connections
    };
  });

  const visualLinks = graphData.edges.map(edge => ({
    source: edge.source,
    target: edge.target,
    type: edge.type,
    weight: edge.weight || 1
  }));

  // Load graph data
  useEffect(() => {
    const loadGraphData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Loading graph data...');
        console.log('🌐 API URL:', 'http://localhost:5001/graph?user_id=local-user-1');

        const data = await graphService.getGraphData('local-user-1');
        console.log('✅ Graph data loaded successfully:', data);
        console.log('📊 Data summary:', {
          nodes: data.nodes?.length || 0,
          edges: data.edges?.length || 0,
          nodeTypes: data.nodes ? [...new Set(data.nodes.map(n => n.type))] : [],
          sampleNode: data.nodes?.[0] || null
        });
        setGraphData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load graph data';
        setError(errorMessage);
        console.error('Error loading graph data:', err);
        console.error('Error details:', {
          message: errorMessage,
          stack: err instanceof Error ? err.stack : 'No stack trace',
          type: typeof err,
          err
        });
      } finally {
        setLoading(false);
      }
    };

    loadGraphData();
  }, []);

  // Render graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas completely - multiple methods to ensure complete clearing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0C10'; // Match the background color
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Reset all text properties to prevent residual text
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF';

    // If no nodes, just return after clearing
    if (visualNodes.length === 0) {
      console.log('🎨 No nodes to render, canvas completely cleared');
      return;
    }

    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw links with improved styling
    visualLinks.forEach(link => {
      const sourceNode = visualNodes.find(n => n.id === link.source);
      const targetNode = visualNodes.find(n => n.id === link.target);

      if (sourceNode && targetNode) {
        // Link color based on relationship type
        const getLinkColor = (type: string) => {
          switch (type) {
            case 'CEO_OF': return 'rgba(0, 240, 255, 0.6)';
            case 'OWNS': return 'rgba(255, 107, 107, 0.6)';
            case 'FOUNDED': return 'rgba(255, 217, 61, 0.6)';
            case 'HEADQUARTERED_IN': return 'rgba(76, 205, 196, 0.6)';
            default: return 'rgba(255, 255, 255, 0.3)';
          }
        };

        ctx.strokeStyle = getLinkColor(link.type);
        ctx.lineWidth = 2 + (link.weight || 1);

        // Draw curved line for better aesthetics
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        const offset = 20;

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.quadraticCurveTo(midX + offset, midY - offset, targetNode.x, targetNode.y);
        ctx.stroke();

        // Draw relationship label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(link.type, midX, midY - 5);
      }
    });

    // Draw nodes
    visualNodes.forEach(node => {
      // Node glow
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size + 10);
      gradient.addColorStop(0, node.color + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size + 10, 0, 2 * Math.PI);
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
      ctx.fillStyle = node.color + '80';
      ctx.fill();
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Selection highlight
      if (selectedNode?.id === node.id) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // Node label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + node.size + 25);
    });

    ctx.restore();
  }, [zoom, pan, selectedNode, visualNodes, visualLinks, renderKey]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const newPan = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    setPan(newPan);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || isDragging) return; // Don't process clicks if we were dragging

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Check for node clicks first
    const clickedNode = visualNodes.find(node => {
      const distance = Math.sqrt(
        Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)
      );
      return distance <= node.size;
    });

    if (clickedNode) {
      handleNodeClick(clickedNode);
      return;
    }

    // Check for edge clicks
    const clickedEdge = visualLinks.find(link => {
      const sourceNode = visualNodes.find(n => n.id === link.source);
      const targetNode = visualNodes.find(n => n.id === link.target);

      if (!sourceNode || !targetNode) return false;

      // Calculate distance from point to line
      const A = x - sourceNode.x;
      const B = y - sourceNode.y;
      const C = targetNode.x - sourceNode.x;
      const D = targetNode.y - sourceNode.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;

      if (lenSq === 0) return false;

      const param = dot / lenSq;

      let xx, yy;
      if (param < 0) {
        xx = sourceNode.x;
        yy = sourceNode.y;
      } else if (param > 1) {
        xx = targetNode.x;
        yy = targetNode.y;
      } else {
        xx = sourceNode.x + param * C;
        yy = sourceNode.y + param * D;
      }

      const dx = x - xx;
      const dy = y - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= 5; // 5 pixel tolerance for edge clicks
    });

    if (clickedEdge) {
      handleEdgeClick(clickedEdge);
      return;
    }

    // Clear selection if nothing clicked
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate zoom factor
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));

    // Calculate world position of mouse
    const worldMouseX = (mouseX - pan.x) / zoom;
    const worldMouseY = (mouseY - pan.y) / zoom;

    // Calculate new pan to keep mouse position at same world location
    const newPan = {
      x: mouseX - worldMouseX * newZoom,
      y: mouseY - worldMouseY * newZoom
    };

    setZoom(newZoom);
    setPan(newPan);
  };

  const handleRefresh = async () => {
    try {
      console.log('🔄 Manual refresh triggered');
      setLoading(true);
      setError(null);
      // Clear current data to show loading state
      setGraphData({ nodes: [], edges: [] });

      // Fetch fresh data from the server
      console.log('🌐 Fetching fresh data...');
      const data = await graphService.getGraphData('local-user-1');
      console.log('✅ Fresh data received:', data);
      setGraphData(data);

      // Reset view to show all new data
      handleReset();
    } catch (err) {
      console.error('❌ Refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh graph data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm(`Are you sure you want to delete this node? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting node:', nodeId);
      setDeletingNodeId(nodeId);
      setError(null);

      // Call the backend API to delete the node
      const response = await fetch(`http://localhost:5001/graph/node/${nodeId}?user_id=local-user-1`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete node: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Node deleted successfully:', result);

      // Remove node and related edges from local state
      setGraphData(prevData => ({
        nodes: prevData.nodes.filter(node => node.id !== nodeId),
        edges: prevData.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
      }));

      // Clear selection if the deleted node was selected
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }

      // Force re-render to ensure clean canvas
      setRenderKey(prev => prev + 1);

      // Additional canvas cleanup for node deletion
      setTimeout(() => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            const rect = canvasRef.current.getBoundingClientRect();
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.fillStyle = '#0A0C10';
            ctx.fillRect(0, 0, rect.width, rect.height);
          }
        }
      }, 50);

    } catch (error) {
      console.error('❌ Error deleting node:', error);
      setError('Failed to delete node');
    } finally {
      setDeletingNodeId(null);
    }
  };

  const handleClearGraph = async () => {
    // Add confirmation dialog
    if (!confirm('Are you sure you want to clear all graph data? This action cannot be undone and will remove all nodes and connections.')) {
      return;
    }

    try {
      console.log('🗑️ Clearing graph data...');
      setLoading(true);
      setError(null);

      // Call the backend API to clear graph data
      const response = await fetch('http://localhost:5001/graph/clear?user_id=local-user-1', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to clear graph data: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Graph cleared successfully:', result);

      // Clear local state completely
      setGraphData({ nodes: [], edges: [] });
      setSelectedNode(null);
      setSelectedEdge(null);
      setSearchTerm('');

      // Reset view
      handleReset();

      // Force re-render by updating render key
      setRenderKey(prev => prev + 1);

      // Force immediate canvas clear and redraw with multiple clearing methods
      setTimeout(() => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            const rect = canvasRef.current.getBoundingClientRect();

            // Method 1: Reset canvas dimensions (this clears everything)
            canvasRef.current.width = rect.width * window.devicePixelRatio;
            canvasRef.current.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            // Method 2: Clear with clearRect
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Method 3: Fill with background color
            ctx.fillStyle = '#0A0C10';
            ctx.fillRect(0, 0, rect.width, rect.height);

            // Method 4: Reset all drawing states
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;

            console.log('🎨 Canvas completely cleared with multiple methods after graph clear');
          }
        }
      }, 100);

    } catch (err) {
      console.error('❌ Clear failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear graph data');
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => {
    if (is3D) {
      setCamera3D(prev => {
        const distance = Math.sqrt(
          prev.position[0] ** 2 + prev.position[1] ** 2 + prev.position[2] ** 2
        );
        const newDistance = Math.max(distance * 0.8, 10); // Minimum distance
        const ratio = newDistance / distance;
        return {
          ...prev,
          position: [
            prev.position[0] * ratio,
            prev.position[1] * ratio,
            prev.position[2] * ratio
          ]
        };
      });
    } else {
      // Center-based zoom for 2D
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const newZoom = Math.min(zoom * 1.2, 5);
        const zoomRatio = newZoom / zoom;

        // Calculate world position of center point
        const worldCenterX = (centerX - pan.x) / zoom;
        const worldCenterY = (centerY - pan.y) / zoom;

        // Calculate new pan to keep center point at same screen position
        setPan({
          x: centerX - worldCenterX * newZoom,
          y: centerY - worldCenterY * newZoom
        });
        setZoom(newZoom);
      }
    }
  };

  const handleZoomOut = () => {
    if (is3D) {
      setCamera3D(prev => {
        const distance = Math.sqrt(
          prev.position[0] ** 2 + prev.position[1] ** 2 + prev.position[2] ** 2
        );
        const newDistance = Math.min(distance * 1.2, 200); // Maximum distance
        const ratio = newDistance / distance;
        return {
          ...prev,
          position: [
            prev.position[0] * ratio,
            prev.position[1] * ratio,
            prev.position[2] * ratio
          ]
        };
      });
    } else {
      // Center-based zoom for 2D
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const newZoom = Math.max(zoom * 0.8, 0.1);

        // Calculate world position of center point
        const worldCenterX = (centerX - pan.x) / zoom;
        const worldCenterY = (centerY - pan.y) / zoom;

        // Calculate new pan to keep center point at same screen position
        setPan({
          x: centerX - worldCenterX * newZoom,
          y: centerY - worldCenterY * newZoom
        });
        setZoom(newZoom);
      }
    }
  };

  const handleReset = () => {
    if (is3D) {
      setCamera3D({ position: [0, 0, 70], zoom: 1 });
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleEdgeClick = (edge: GraphEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const handleFitToCanvas = () => {
    if (visualNodes.length === 0) return;

    if (is3D) {
      // For 3D mode, reset camera to optimal viewing distance
      setCamera3D({ position: [0, 0, 80], zoom: 1 });
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Calculate bounds of all nodes
      const minX = Math.min(...visualNodes.map(n => n.x));
      const maxX = Math.max(...visualNodes.map(n => n.x));
      const minY = Math.min(...visualNodes.map(n => n.y));
      const maxY = Math.max(...visualNodes.map(n => n.y));

      const graphWidth = maxX - minX + 100;
      const graphHeight = maxY - minY + 100;

      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;

      const scaleX = canvasWidth / graphWidth;
      const scaleY = canvasHeight / graphHeight;
      const newZoom = Math.min(scaleX, scaleY, 2);

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setZoom(newZoom);
      setPan({
        x: canvasWidth / 2 - centerX * newZoom,
        y: canvasHeight / 2 - centerY * newZoom
      });
    }
  };

  return (
    <section id="graph" className="relative py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Knowledge Graph
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
            Visualize connections and relationships in your content
          </p>

          {/* Statistics */}
          <div className="flex justify-center space-x-8 text-center">
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4">
              <div className="text-2xl font-bold text-[#00F0FF] mb-1">{graphData.nodes.length}</div>
              <div className="text-white/60 text-sm">Entities</div>
            </div>
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4">
              <div className="text-2xl font-bold text-[#FF6B6B] mb-1">{graphData.edges.length}</div>
              <div className="text-white/60 text-sm">Relationships</div>
            </div>
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4">
              <div className="text-2xl font-bold text-[#4ECDC4] mb-1">
                {new Set(graphData.nodes.map(n => n.type)).size}
              </div>
              <div className="text-white/60 text-sm">Types</div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
          {/* Left spacer for centering */}
          <div className="hidden lg:block lg:col-span-1"></div>

          {/* Graph Canvas - Centered */}
          <motion.div
            className="lg:col-span-5 bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-4 relative min-h-[800px]"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {/* Legend */}
            <div className="absolute top-8 left-8 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <h4 className="text-white font-medium mb-3 text-sm">Legend</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#00F0FF]"></div>
                  <span className="text-white/70">Person</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF6B6B]"></div>
                  <span className="text-white/70">Organization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#4ECDC4]"></div>
                  <span className="text-white/70">Location</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#FFD93D]"></div>
                  <span className="text-white/70">Technology</span>
                </div>
              </div>
            </div>

            {/* Graph Statistics */}
            <div className="absolute top-8 left-8 mt-48 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <h4 className="text-white font-medium mb-3 text-sm">Graph Stats</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Nodes:</span>
                  <span className="text-white font-medium">{graphData.nodes.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Edges:</span>
                  <span className="text-white font-medium">{graphData.edges.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Connected:</span>
                  <span className="text-white font-medium">
                    {new Set([...graphData.edges.map(e => e.source), ...graphData.edges.map(e => e.target)]).size}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Isolated:</span>
                  <span className={`font-medium ${
                    graphData.nodes.length - new Set([...graphData.edges.map(e => e.source), ...graphData.edges.map(e => e.target)]).size > 0
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}>
                    {graphData.nodes.length - new Set([...graphData.edges.map(e => e.source), ...graphData.edges.map(e => e.target)]).size}
                  </span>
                </div>
              </div>
            </div>
            {is3D ? (
              <div className="w-full h-[700px] rounded-2xl overflow-hidden">
                <Graph3D
                  key={`graph3d-${renderKey}`} // Force re-render when renderKey changes
                  graphData={graphData}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={handleEdgeClick}
                  cameraControl={camera3D}
                />
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full h-[700px] cursor-grab active:cursor-grabbing rounded-2xl"
                onClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleCanvasWheel}
              />
            )}
            
            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                <div className="text-white text-center">
                  <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                  <p>Loading graph data...</p>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {error && (
              <div className="absolute inset-0 bg-red-900/20 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                <div className="text-white text-center p-4">
                  <p className="text-red-300 mb-2">Error loading graph data</p>
                  <p className="text-sm text-red-200">{error}</p>
                  <button
                    onClick={handleRefresh}
                    className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="absolute top-8 right-8 flex space-x-2">
              <button
                onClick={handleRefresh}
                className="p-3 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors duration-300"
                title="Refresh and regenerate graph data"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-3 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors duration-300"
                title="Zoom in"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-3 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors duration-300"
                title="Zoom out"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={handleFitToCanvas}
                className="p-3 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors duration-300"
                title="Fit to canvas"
              >
                <Maximize2 size={18} />
              </button>
              <button
                onClick={() => setIs3D(!is3D)}
                className={`p-3 backdrop-blur-xl border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors duration-300 ${
                  is3D ? 'bg-cyan-500/50' : 'bg-black/50'
                }`}
                title={is3D ? 'Switch to 2D' : 'Switch to 3D'}
              >
                <Layers size={18} />
              </button>
              <button
                onClick={handleClearGraph}
                className="p-3 bg-red-500/50 backdrop-blur-xl border border-red-400/20 rounded-xl text-white hover:bg-red-500/70 transition-colors duration-300"
                title="Clear all graph data"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>

          {/* Node Details - Compact panel */}
          <motion.div
            className="lg:col-span-2 bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-4"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Search className="mr-2" size={18} />
              Explore
            </h3>

            {/* 3D/2D Mode Indicator */}
            <div className="mb-3 p-2 bg-black/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-xs">Mode</span>
                <span className={`text-xs font-medium ${is3D ? 'text-cyan-400' : 'text-white/60'}`}>
                  {is3D ? '3D' : '2D'}
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                <Search className="absolute right-2 top-2 text-white/40" size={14} />
              </div>

              {/* Search Results */}
              {searchTerm && (
                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                  {visualNodes
                    .filter(node => node.label.toLowerCase().includes(searchTerm.toLowerCase()))
                    .slice(0, 3)
                    .map(node => (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className="flex items-center space-x-2 p-1 bg-black/20 rounded cursor-pointer hover:bg-black/40 transition-colors"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: node.color }}
                        />
                        <span className="text-white/80 text-xs truncate">{node.label}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
            
            {selectedNode && !selectedEdge ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">
                    {selectedNode.label}
                  </h4>
                  <div className="flex items-center mb-2">
                    <div
                      className="w-4 h-4 rounded-full inline-block mr-2"
                      style={{ backgroundColor: selectedNode.color }}
                    />
                    <span className="text-white/60 text-xs">
                      {selectedNode.type} • {selectedNode.connections} links
                    </span>
                  </div>
                  {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                    <div className="text-white/40 text-xs mb-2 space-y-1">
                      {Object.entries(selectedNode.properties).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key}:</span>
                          <span className="text-white/60">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-white/70 text-xs leading-relaxed">
                    {selectedNode.type === 'PERSON' && 'Key figure with important relationships.'}
                    {selectedNode.type === 'ORGANIZATION' && 'Central organization in the network.'}
                    {selectedNode.type === 'LOCATION' && 'Significant location hub.'}
                    {!['PERSON', 'ORGANIZATION', 'LOCATION'].includes(selectedNode.type) && 'Important network entity.'}
                  </p>
                </div>
                
                <div>
                  <h5 className="text-white font-medium mb-2 text-xs">Connected</h5>
                  <div className="space-y-1">
                    {visualLinks
                      .filter(link => link.source === selectedNode.id || link.target === selectedNode.id)
                      .slice(0, 2)
                      .map((link, index) => {
                        const connectedId = link.source === selectedNode.id ? link.target : link.source;
                        const connectedNode = visualNodes.find(n => n.id === connectedId);
                        return (
                          <div key={index} className="flex items-center space-x-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: connectedNode?.color }}
                            />
                            <span className="text-white/60 text-xs truncate">
                              {connectedNode?.label}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Delete Node Button */}
                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    disabled={deletingNodeId === selectedNode.id}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 hover:text-red-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                    title="Delete this node and all its connections"
                  >
                    {deletingNodeId === selectedNode.id ? (
                      <>
                        <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <X size={12} />
                        <span>Delete Node</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : selectedEdge ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">
                    Relationship Details
                  </h4>
                  <div className="bg-black/20 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/40 text-xs">Type:</span>
                      <span className="text-white font-medium text-xs">{selectedEdge.type.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40 text-xs">Strength:</span>
                      <span className="text-white/70 text-xs">{selectedEdge.weight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40 text-xs">Direction:</span>
                      <span className="text-white/70 text-xs">
                        {(() => {
                          const sourceNode = visualNodes.find(n => n.id === selectedEdge.source);
                          const targetNode = visualNodes.find(n => n.id === selectedEdge.target);
                          return `${sourceNode?.label} → ${targetNode?.label}`;
                        })()}
                      </span>
                    </div>
                    {selectedEdge.properties && Object.keys(selectedEdge.properties).length > 0 && (
                      <div>
                        <span className="text-white/40 text-xs block mb-2">Additional Info</span>
                        {Object.entries(selectedEdge.properties).map(([key, value]) => (
                          <div key={key} className="flex justify-between mb-1">
                            <span className="text-white/60 text-xs capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="text-white/80 text-xs">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-white font-medium mb-2 text-xs">Connection</h5>
                  <div className="space-y-2">
                    {(() => {
                      const sourceNode = visualNodes.find(n => n.id === selectedEdge.source);
                      const targetNode = visualNodes.find(n => n.id === selectedEdge.target);
                      return (
                        <>
                          {sourceNode && (
                            <div
                              className="flex items-center space-x-2 p-2 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors"
                              onClick={() => handleNodeClick(sourceNode)}
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: sourceNode.color }}
                              />
                              <div className="flex-1">
                                <span className="text-white/80 text-xs block">{sourceNode.label}</span>
                                <span className="text-white/40 text-xs">{sourceNode.type}</span>
                              </div>
                            </div>
                          )}
                          <div className="text-center py-1">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-4 h-px bg-white/30"></div>
                              <span className="text-white/60 text-xs px-2 bg-black/30 rounded">
                                {selectedEdge.type.replace(/_/g, ' ')}
                              </span>
                              <div className="w-4 h-px bg-white/30"></div>
                            </div>
                          </div>
                          {targetNode && (
                            <div
                              className="flex items-center space-x-2 p-2 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors"
                              onClick={() => handleNodeClick(targetNode)}
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: targetNode.color }}
                              />
                              <div className="flex-1">
                                <span className="text-white/80 text-xs block">{targetNode.label}</span>
                                <span className="text-white/40 text-xs">{targetNode.type}</span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/40 text-xs">
                  Click to explore
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}