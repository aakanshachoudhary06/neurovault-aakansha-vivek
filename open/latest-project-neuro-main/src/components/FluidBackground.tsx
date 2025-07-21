import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    
    vec3 pos = position;
    float wave = sin(pos.x * 0.5 + uTime * 0.8) * 0.1;
    wave += sin(pos.y * 0.3 + uTime * 0.6) * 0.05;
    pos.z += wave;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  vec3 palette(float t) {
    vec3 a = vec3(0.02, 0.11, 0.22);
    vec3 b = vec3(0.17, 0.09, 0.21);
    vec3 c = vec3(0.0, 0.94, 1.0);
    vec3 d = vec3(0.5, 0.5, 0.5);
    
    return a + b * cos(6.28318 * (c * t + d));
  }
  
  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    for (float i = 0.0; i < 3.0; i++) {
      uv = fract(uv * 1.5) - 0.5;
      
      float d = length(uv) * exp(-length(uv0));
      vec3 col = palette(length(uv0) + i * 0.4 + uTime * 0.4);
      
      d = sin(d * 8.0 + uTime) / 8.0;
      d = abs(d);
      d = pow(0.01 / d, 1.2);
      
      finalColor += col * d;
    }
    
    // Add subtle noise
    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
    finalColor += noise * 0.02;
    
    // Chromatic aberration
    vec2 offset = vec2(0.002, 0.0);
    finalColor.r *= 0.98;
    finalColor.g *= 1.0;
    finalColor.b *= 1.02;
    
    gl_FragColor = vec4(finalColor, 0.8);
  }
`;

function FluidMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport, size } = useThree();
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uResolution: { value: new THREE.Vector2(size.width, size.height) }
  }), [size]);

  useFrame((state) => {
    if (meshRef.current) {
      uniforms.uTime.value = state.clock.elapsedTime;
      uniforms.uMouse.value.set(state.mouse.x, state.mouse.y);
    }
  });

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
  }, [size, uniforms]);

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 128, 128]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function Particles() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    const colors = new Float32Array(2000 * 3);
    
    for (let i = 0; i < 2000; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;
      
      // Neural pathway colors
      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        // Deep blue
        colors[i3] = 0.04;
        colors[i3 + 1] = 0.11;
        colors[i3 + 2] = 0.21;
      } else if (colorChoice < 0.6) {
        // Electric cyan
        colors[i3] = 0.0;
        colors[i3 + 1] = 0.94;
        colors[i3 + 2] = 1.0;
      } else {
        // White sparkles
        colors[i3] = 1.0;
        colors[i3 + 1] = 1.0;
        colors[i3 + 2] = 1.0;
      }
    }
    
    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(state.clock.elapsedTime + positions[i]) * 0.001;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2000}
          array={particlesPosition.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={2000}
          array={particlesPosition.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.6}
        vertexColors
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function FluidBackground() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: '#050508' }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <FluidMesh />
        <Particles />
      </Canvas>
    </div>
  );
}