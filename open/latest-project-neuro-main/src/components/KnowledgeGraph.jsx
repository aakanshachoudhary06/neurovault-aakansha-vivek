import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Eye, RefreshCw } from 'lucide-react';

// Color mapping for different node types
const nodeTypeColors = {
  'PERSON': '#3B82F6',
  'ORGANIZATION': '#10B981',
  'LOCATION': '#F59E0B',
  'TECHNOLOGY': '#EF4444',
  'CONCEPT': '#8B5CF6',
  'FOOD': '#EC4899',
  'CONDITION': '#06B6D4',
  'UNKNOWN': '#6B7280'
};

export default function KnowledgeGraph() {
  const canvasRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch graph data from API
  const fetchGraphData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:5001/graph?user_id=local-user-1');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Graph data received:', data.nodes?.length, 'nodes,', data.edges?.length, 'edges');

      // Process nodes with positioning
      const processedNodes = (data.nodes || []).map((node, index) => ({
        ...node,
        x: 200 + (index % 6) * 120 + Math.random() * 40 - 20,
        y: 150 + Math.floor(index / 6) * 100 + Math.random() * 40 - 20,
        size: 15 + Math.random() * 10,
        color: nodeTypeColors[node.type] || nodeTypeColors.UNKNOWN
      }));

      setNodes(processedNodes);
      setEdges(data.edges || []);

    } catch (err) {
      console.error('Error fetching graph data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchGraphData();
  }, []);

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loading) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Set canvas size
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;

    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();

        // Draw edge label
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        ctx.fillStyle = '#6B7280';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(edge.type, midX, midY - 5);
      }
    });

    // Draw nodes
    ctx.globalAlpha = 1;
    nodes.forEach(node => {
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();

      // Node border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node glow for selected
      if (selectedNode?.id === node.id) {
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Node label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + node.size + 20);

      // Node type
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(node.type, node.x, node.y + node.size + 35);
    });

    ctx.restore();
  }, [zoom, pan, selectedNode, nodes, edges, loading]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Check if click is on a node
    const clickedNode = nodes.find(node => {
      const distance = Math.sqrt(
        Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)
      );
      return distance <= node.size;
    });

    setSelectedNode(clickedNode);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  return (
    <section id="graph" className="relative py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Knowledge <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Graph</span>
          </h2>
          <p className="text-xl text-white/60">
            Visualize connections between your ideas
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Graph Canvas */}
          <motion.div
            className="lg:col-span-2 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-4 relative"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-96 cursor-pointer"
              onClick={handleCanvasClick}
              style={{ background: 'transparent' }}
            />
            
            {/* Loading/Error States */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-2xl">
                <div className="text-white text-center">
                  <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                  <p>Loading graph data...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-2xl">
                <div className="text-red-400 text-center">
                  <p className="mb-2">Error loading graph data:</p>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={fetchGraphData}
                    className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="absolute top-6 right-6 flex space-x-2">
              <button
                onClick={fetchGraphData}
                className="p-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
                title="Refresh graph data"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={handleReset}
                className="p-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </motion.div>

          {/* Node Details */}
          <motion.div
            className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Eye className="mr-2" size={20} />
              Node Details
            </h3>
            
            {selectedNode ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    {selectedNode.label}
                  </h4>
                  <div
                    className="w-4 h-4 rounded-full inline-block mr-2"
                    style={{ backgroundColor: selectedNode.color }}
                  />
                  <span className="text-white/60 text-sm">
                    {selectedNode.type}
                  </span>
                </div>

                {/* Node Properties */}
                {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                  <div className="bg-black/20 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-2">Properties</h5>
                    <div className="space-y-1">
                      {Object.entries(selectedNode.properties).map(([key, value]) => (
                        <div key={key} className="text-white/70 text-sm">
                          <span className="text-white/90 font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h5 className="text-white font-medium mb-2">Connections ({
                    edges.filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id).length
                  })</h5>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {edges
                      .filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id)
                      .map((edge, index) => {
                        const connectedId = edge.source === selectedNode.id ? edge.target : edge.source;
                        const connectedNode = nodes.find(n => n.id === connectedId);
                        return (
                          <div key={index} className="text-white/60 text-sm">
                            <span className="text-blue-400">{edge.type}</span> → {connectedNode?.label || connectedId}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-8">
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-4">Graph Statistics</h4>
                  <div className="space-y-2">
                    <div className="text-white/70 text-sm">
                      <span className="text-blue-400 font-medium">{nodes.length}</span> nodes
                    </div>
                    <div className="text-white/70 text-sm">
                      <span className="text-green-400 font-medium">{edges.length}</span> connections
                    </div>
                    <div className="text-white/70 text-sm">
                      <span className="text-purple-400 font-medium">
                        {new Set(nodes.map(n => n.type)).size}
                      </span> entity types
                    </div>
                  </div>
                </div>
                <p className="text-white/40">
                  Click on a node to view details
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}