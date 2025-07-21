import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

// Neural Bubble Component
function NeuralBubble({ position, scale, speed }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.position.y = position[1] + Math.sin(time * speed) * 0.5;
      meshRef.current.position.x = position[0] + Math.cos(time * speed * 0.7) * 0.3;
      meshRef.current.rotation.x = time * 0.2;
      meshRef.current.rotation.y = time * 0.1;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 32, 32]} position={position} scale={scale}>
      <meshPhysicalMaterial
        transmission={1.0}
        thickness={0.8}
        ior={1.2}
        color="#F7F6F2"
        transparent
        opacity={0.3}
        roughness={0.1}
        metalness={0.0}
      />
    </Sphere>
  );
}

// Starfield Component
function Starfield() {
  const pointsRef = useRef();
  
  const starPositions = useMemo(() => {
    const positions = new Float32Array(10000 * 3);
    const colors = new Float32Array(10000 * 3);
    
    for (let i = 0; i < 10000; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = (Math.random() - 0.5) * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 50;
      
      // Mix white and neural blue colors
      const isBlue = Math.random() > 0.7;
      colors[i3] = isBlue ? 0.16 : 1;
      colors[i3 + 1] = isBlue ? 0.42 : 1;
      colors[i3 + 2] = isBlue ? 0.72 : 1;
    }
    
    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x = state.clock.getElapsedTime() * 0.02;
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <Points ref={pointsRef} positions={starPositions.positions} colors={starPositions.colors}>
      <PointMaterial size={0.5} sizeAttenuation transparent vertexColors />
    </Points>
  );
}

// Neural Bubbles Group
function NeuralBubbles() {
  const groupRef = useRef();
  const { viewport } = useThree();
  
  const bubbles = useMemo(() => {
    const bubbleData = [];
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 20 : 50;
    
    for (let i = 0; i < count; i++) {
      bubbleData.push({
        position: [
          (Math.random() - 0.5) * viewport.width * 2,
          (Math.random() - 0.5) * viewport.height * 2,
          (Math.random() - 0.5) * 20
        ],
        scale: 0.5 + Math.random() * 1.5,
        speed: 0.5 + Math.random() * 0.5
      });
    }
    return bubbleData;
  }, [viewport]);

  useEffect(() => {
    if (groupRef.current) {
      gsap.fromTo(groupRef.current.scale, 
        { x: 0.6, y: 0.6, z: 0.6 },
        { x: 1, y: 1, z: 1, duration: 2, ease: "power2.out" }
      );
    }
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.x = state.mouse.y * 0.1;
      groupRef.current.rotation.y = state.mouse.x * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {bubbles.map((bubble, index) => (
        <NeuralBubble
          key={index}
          position={bubble.position}
          scale={bubble.scale}
          speed={bubble.speed}
        />
      ))}
    </group>
  );
}

// Main Background Component
function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#296CB9" />
      <Starfield />
      <NeuralBubbles />
    </>
  );
}

export default function NeuralNebulaBackground() {
  const canvasRef = useRef();

  useEffect(() => {
    if (canvasRef.current) {
      gsap.fromTo(canvasRef.current, 
        { opacity: 0 },
        { opacity: 1, duration: 3, ease: "power2.out" }
      );
    }
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: '#000000' }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <Scene />
      </Canvas>
    </div>
  );
}