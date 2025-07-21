import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GraphData, GraphNode, GraphEdge } from '../services/graphService';

interface Graph3DProps {
  graphData: GraphData;
  onNodeClick: (node: GraphNode) => void;
  onEdgeClick: (edge: GraphEdge) => void;
  cameraControl?: { position: [number, number, number], zoom: number };
}

interface Node3D extends GraphNode {
  position: THREE.Vector3;
  mesh?: THREE.Mesh;
  sprite?: THREE.Sprite;
  velocity: THREE.Vector3;
}

interface Edge3D extends GraphEdge {
  line?: THREE.Line;
}

export default function Graph3D({ graphData, onNodeClick, onEdgeClick, cameraControl }: Graph3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const nodesRef = useRef<Node3D[]>([]);
  const edgesRef = useRef<Edge3D[]>([]);
  const animationIdRef = useRef<number>();
  const raycasterRef = useRef<THREE.Raycaster>();
  const mouseRef = useRef<THREE.Vector2>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    sceneRef.current = scene;

    // Camera setup with better positioning for centering
    const camera = new THREE.PerspectiveCamera(
      60, // Slightly narrower field of view for better focus
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 70); // Move camera back for better overview
    camera.lookAt(0, 0, 0); // Ensure camera looks at center
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Raycaster for mouse interaction
    raycasterRef.current = new THREE.Raycaster();
    mouseRef.current = new THREE.Vector2();

    // Enhanced lighting for brighter appearance
    const ambientLight = new THREE.AmbientLight(0x404040, 1.0); // Increased intensity
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Increased intensity
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Add additional point light for better illumination
    const pointLight = new THREE.PointLight(0xffffff, 0.8, 100);
    pointLight.position.set(0, 0, 30);
    scene.add(pointLight);

    // Enhanced controls with drag support
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let isDragging = false;

    const handleMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      isDragging = false;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      // Mark as dragging if mouse moved significantly
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        isDragging = true;
      }

      // Rotate scene around center
      scene.rotation.y += deltaX * 0.01;
      scene.rotation.x += deltaY * 0.01;
      // Limit x rotation to prevent flipping
      scene.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, scene.rotation.x));

      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleMouseUp = () => {
      isMouseDown = false;
      // Reset dragging flag after a short delay to prevent click events
      setTimeout(() => {
        isDragging = false;
      }, 100);
    };

    const handleClick = (event: MouseEvent) => {
      if (!mountRef.current || !cameraRef.current || !raycasterRef.current || !mouseRef.current) return;

      // Don't process clicks if we were dragging
      if (isDragging) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Check node intersections
      const nodeMeshes = nodesRef.current.map(node => node.mesh).filter(Boolean) as THREE.Mesh[];
      const nodeIntersects = raycasterRef.current.intersectObjects(nodeMeshes);

      if (nodeIntersects.length > 0) {
        const clickedMesh = nodeIntersects[0].object as THREE.Mesh;
        const clickedNode = nodesRef.current.find(node => node.mesh === clickedMesh);
        if (clickedNode) {
          onNodeClick(clickedNode);
          return;
        }
      }

      // Check edge intersections
      const edgeLines = edgesRef.current.map(edge => edge.line).filter(Boolean) as THREE.Line[];
      const edgeIntersects = raycasterRef.current.intersectObjects(edgeLines);

      if (edgeIntersects.length > 0) {
        const clickedLine = edgeIntersects[0].object as THREE.Line;
        const clickedEdge = edgesRef.current.find(edge => edge.line === clickedLine);
        if (clickedEdge) {
          onEdgeClick(clickedEdge);
        }
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('click', handleClick);

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;

      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    // Clear existing objects completely
    nodesRef.current.forEach(node => {
      if (node.mesh) {
        sceneRef.current!.remove(node.mesh);
        // Dispose geometry and material to free memory
        node.mesh.geometry.dispose();
        if (Array.isArray(node.mesh.material)) {
          node.mesh.material.forEach(material => material.dispose());
        } else {
          node.mesh.material.dispose();
        }
      }
      if (node.sprite) {
        sceneRef.current!.remove(node.sprite);
        // Dispose sprite material and texture
        if (node.sprite.material.map) {
          node.sprite.material.map.dispose();
        }
        node.sprite.material.dispose();
      }
    });
    edgesRef.current.forEach(edge => {
      if (edge.line) {
        sceneRef.current!.remove(edge.line);
        // Dispose line geometry and material
        edge.line.geometry.dispose();
        if (Array.isArray(edge.line.material)) {
          edge.line.material.forEach(material => material.dispose());
        } else {
          edge.line.material.dispose();
        }
      }
    });

    // Clear the arrays
    nodesRef.current = [];
    edgesRef.current = [];

    // If no nodes, ensure scene is completely empty and render once more
    if (graphData.nodes.length === 0) {
      console.log('🎨 3D Graph: No nodes, scene completely cleared');
      // Force a render to show the empty scene
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current!, cameraRef.current);
      }
      return;
    }

    // Create 3D nodes
    const nodes3D: Node3D[] = graphData.nodes.map((node, index) => {
      // Position nodes in 3D space using improved spherical coordinates for better centering
      const phi = Math.acos(-1 + (2 * index) / graphData.nodes.length);
      const theta = Math.sqrt(graphData.nodes.length * Math.PI) * phi;
      const radius = 25; // Slightly larger radius for better spacing

      const position = new THREE.Vector3(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      );

      // Node color based on type - brighter colors
      const getNodeColor = (type: string) => {
        switch (type) {
          case 'PERSON': return 0x00ffff;        // Bright cyan
          case 'ORGANIZATION': return 0xff4444;  // Bright red
          case 'LOCATION': return 0x44ff88;      // Bright green
          case 'TECHNOLOGY': return 0xffdd00;    // Bright yellow
          default: return 0xbb77ff;              // Bright purple
        }
      };

      // Create larger node geometry and brighter material
      const geometry = new THREE.SphereGeometry(3, 24, 24); // Even larger nodes with more segments
      const material = new THREE.MeshPhongMaterial({
        color: getNodeColor(node.type),
        transparent: true,
        opacity: 0.9,
        shininess: 100,
        emissive: getNodeColor(node.type),
        emissiveIntensity: 0.2
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      sceneRef.current!.add(mesh);

      // Add appropriately sized text label
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 512; // Moderate canvas size
      canvas.height = 128; // Moderate canvas size

      // Draw clean text with outline and bright fill (no background)
      context.fillStyle = 'white';
      context.font = 'bold 48px Arial'; // Smaller, more appropriate font size
      context.textAlign = 'center';
      context.strokeStyle = 'black';
      context.lineWidth = 3; // Thinner outline
      context.strokeText(node.label, 256, 80);
      context.fillText(node.label, 256, 80);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.copy(position);
      sprite.position.y += 4; // Closer to node
      sprite.scale.set(12, 3, 1); // Smaller scale for better proportion
      sceneRef.current!.add(sprite);

      return {
        ...node,
        position,
        mesh,
        sprite,
        velocity: new THREE.Vector3()
      };
    });

    nodesRef.current = nodes3D;

    // Create 3D edges
    const edges3D: Edge3D[] = graphData.edges.map(edge => {
      const sourceNode = nodes3D.find(n => n.id === edge.source);
      const targetNode = nodes3D.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) return { ...edge };

      const geometry = new THREE.BufferGeometry().setFromPoints([
        sourceNode.position,
        targetNode.position
      ]);

      // Brighter edge colors based on relationship type
      const getEdgeColor = (type: string) => {
        switch (type) {
          case 'CEO_OF': return 0x00ffff;        // Bright cyan
          case 'OWNS': return 0xff4444;          // Bright red
          case 'FOUNDED': return 0xffdd00;       // Bright yellow
          case 'HEADQUARTERED_IN': return 0x44ff88; // Bright green
          default: return 0xffffff;              // White
        }
      };

      const material = new THREE.LineBasicMaterial({
        color: getEdgeColor(edge.type),
        transparent: true,
        opacity: 0.8,
        linewidth: 5 // Increased for better clickability
      });

      const line = new THREE.Line(geometry, material);
      // Add user data for easier identification
      line.userData = {
        edgeId: edge.id,
        edgeType: edge.type,
        source: edge.source,
        target: edge.target
      };
      sceneRef.current!.add(line);

      return {
        ...edge,
        line
      };
    });

    edgesRef.current = edges3D;

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Rotate the entire scene slowly around center
      if (sceneRef.current) {
        sceneRef.current.rotation.y += 0.003; // Slower rotation
        sceneRef.current.rotation.x += 0.001; // Slight x-axis rotation for 3D effect
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [graphData, onNodeClick, onEdgeClick]);

  // Handle camera control changes
  useEffect(() => {
    if (cameraControl && cameraRef.current) {
      // Always look at center when changing camera position
      cameraRef.current.position.set(...cameraControl.position);
      cameraRef.current.lookAt(0, 0, 0); // Always center on origin
      cameraRef.current.updateProjectionMatrix();
    }
  }, [cameraControl]);

  return <div ref={mountRef} className="w-full h-full" />;
}
